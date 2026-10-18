import { useRouter } from 'expo-router'
import { Camera, ChevronRight, Clock, Images } from 'lucide-react-native'
import { Pressable, Text, View } from 'react-native'

import { Avatar } from '@/components/ui/avatar'
import { SHADOW_TILE, useThemeColors } from '@/constants/colors'
import { useI18n } from '@/i18n/provider'
import { formatCountdown, momentPhase } from '@/lib/api/moments'
import { useCurrentUserId } from '@/lib/auth/provider'
import { useMomentRound, useMoments } from '@/lib/hooks/use-moments'
import { useNowMs } from '@/lib/hooks/use-now'
import { ICON_STROKE } from '@/lib/icons/tokens'
import { cn } from '@/lib/utils/cn'
import { haptic } from '@/lib/utils/haptics'

// La tarjeta del momento sobre el muro. Discreta mientras no ha sonado; en
// cuanto suena se enciende con la cuenta atras, que tiene que verse aunque el
// aviso no llegara.
export function MomentCard({ today }: { today: string }) {
  const { t } = useI18n()
  const colors = useThemeColors()
  const router = useRouter()
  const userId = useCurrentUserId()
  const now = useNowMs(1000)
  const { data: round } = useMomentRound(today)
  const { data: moments } = useMoments(today)

  const mine = (moments ?? []).some((moment) => moment.userId === userId)
  const phase = momentPhase(round ?? null, mine, new Date(now))
  const posted = (moments ?? []).filter((moment) => moment.userId !== userId)
  const lit = phase.kind === 'open'

  const subtitle =
    phase.kind === 'open'
      ? t('moments.feedCardOpen', { time: formatCountdown(phase.remainingMs) })
      : phase.kind === 'late'
        ? t('moments.feedCardLate')
        : phase.kind === 'posted'
          ? t('moments.feedCardPosted')
          : t('moments.feedCardWaiting')

  const Icon = phase.kind === 'posted' ? Images : phase.kind === 'waiting' ? Clock : Camera
  const ink = lit ? '#fff' : colors.text

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t('moments.feedCard')}. ${subtitle}`}
      onPress={() => {
        haptic('tap')
        router.push('/moment')
      }}
      style={SHADOW_TILE}
      className={cn(
        'flex-row items-center gap-3 rounded-3xl p-4 active:opacity-80',
        lit ? 'bg-brand' : 'border border-border bg-surface dark:border-border-dark dark:bg-surface-dark',
      )}
    >
      <View
        className={cn(
          'h-11 w-11 items-center justify-center rounded-full',
          // En espera tambien lleva el acento: en gris parecia deshabilitada.
          lit ? 'bg-white/20' : 'bg-brand-soft dark:bg-brand-soft-dark',
        )}
      >
        <Icon size={20} color={lit ? ink : colors.brand} strokeWidth={lit ? ICON_STROKE.emphasis : undefined} />
      </View>
      <View className="min-w-0 flex-1">
        <Text
          className={cn('text-[15px] font-bold', lit ? 'text-white' : 'text-text dark:text-text-dark')}
        >
          {t('moments.feedCard')}
        </Text>
        <Text
          numberOfLines={1}
          style={{ fontVariant: ['tabular-nums'] }}
          className={cn('text-sm', lit ? 'text-white/90' : 'text-text-muted dark:text-text-muted-dark')}
        >
          {subtitle}
        </Text>
      </View>
      {phase.kind === 'posted' && posted.length > 0 ? (
        <View className="flex-row">
          {posted.slice(0, 3).map((moment, index) => (
            <View key={moment.id} style={{ marginLeft: index === 0 ? 0 : -10 }}>
              <Avatar name={moment.author?.displayName ?? ''} src={moment.author?.avatarUrl} size="sm" />
            </View>
          ))}
        </View>
      ) : null}
      <ChevronRight size={20} color={lit ? '#fff' : colors.textSubtle} />
    </Pressable>
  )
}
