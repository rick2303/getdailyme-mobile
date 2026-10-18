import { useRouter } from 'expo-router'
import { ChevronRight, HeartHandshake } from 'lucide-react-native'
import { useMemo } from 'react'
import { Pressable, Text, View } from 'react-native'

import { MOOD_ICONS } from '@/components/couple/mood-icons'
import { MomentCard } from '@/components/moments/moment-card'
import { Avatar } from '@/components/ui/avatar'
import { useToast } from '@/components/ui/toast'
import { SHADOW_TILE, useThemeColors } from '@/constants/colors'
import { useI18n } from '@/i18n/provider'
import type { TranslationKey } from '@/i18n/translate'
import type { Couple } from '@/lib/api/couple'
import { useCurrentUserId } from '@/lib/auth/provider'
import { isMoodFresh } from '@/lib/couple/moods'
import { useCouple } from '@/lib/hooks/use-couple'
import { useCoupleMoods, useSendPing } from '@/lib/hooks/use-couple-presence'
import { useFriends, useFriendsActivityToday } from '@/lib/hooks/use-friends'
import { ICON_STROKE } from '@/lib/icons/tokens'
import { cn } from '@/lib/utils/cn'
import { haptic } from '@/lib/utils/haptics'

// Tu gente, en Hoy. La pantalla de registro era solo tuya y lo social vivia a
// dos toques; lo que hace volver cada dia es ver que los demas tambien estan.
// El momento del dia, como esta tu pareja (con el "pienso en ti" a mano) y
// quien de tu circulo ya ha registrado. Lo que no aplica no se ve.
export function CircleToday({ today }: { today: string }) {
  const { t } = useI18n()
  const { data: couple } = useCouple()
  const { friends } = useFriends()
  const hasPeople = Boolean(couple) || friends.length > 0

  return (
    <View className="gap-3 px-4 pt-6">
      <Text className="px-1 text-xl font-extrabold text-text dark:text-text-dark">
        {t('today.circleTitle')}
      </Text>
      <MomentCard today={today} />
      {hasPeople ? (
        <View
          style={SHADOW_TILE}
          className="overflow-hidden rounded-3xl border border-border bg-surface dark:border-border-dark dark:bg-surface-dark"
        >
          {couple ? <PartnerRow couple={couple} /> : null}
          {friends.length > 0 ? <FriendsRow divided={Boolean(couple)} /> : null}
        </View>
      ) : null}
    </View>
  )
}

function PartnerRow({ couple }: { couple: Couple }) {
  const { t } = useI18n()
  const router = useRouter()
  const colors = useThemeColors()
  const { showToast } = useToast()
  const { data: moods } = useCoupleMoods(couple.id)
  const sendPing = useSendPing(couple.id)
  const partner = couple.partner

  const theirs = moods?.find((entry) => entry.userId === partner.id) ?? null
  const mood = theirs && isMoodFresh(theirs.updatedAt) ? theirs.mood : null
  const MoodIcon = mood ? MOOD_ICONS[mood] : null

  const ping = () => {
    haptic('success')
    sendPing.mutate(undefined, {
      onSuccess: (result) => {
        if (result.outcome === 'sent') {
          showToast(t('presence.pingSent', { name: partner.displayName }), 'success')
        } else if (result.outcome === 'too_soon') {
          showToast(t('presence.pingTooSoon'), 'success')
        } else {
          showToast(t('common.genericError'), 'error')
        }
      },
      onError: () => showToast(t('common.genericError'), 'error'),
    })
  }

  return (
    <View className="min-h-16 flex-row items-center gap-3 px-4 py-3">
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          haptic('tap')
          router.push('/couple')
        }}
        className="min-w-0 flex-1 flex-row items-center gap-3 active:opacity-70"
      >
        <Avatar name={partner.displayName} src={partner.avatarUrl} size="md" />
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="text-[17px] font-semibold text-text dark:text-text-dark">
            {partner.displayName}
          </Text>
          <View className="flex-row items-center gap-1.5">
            {MoodIcon ? (
              <MoodIcon size={16} color={colors.brand} strokeWidth={ICON_STROKE.emphasis} />
            ) : null}
            <Text numberOfLines={1} className="flex-1 text-[15px] text-text-muted dark:text-text-muted-dark">
              {mood ? t(`presence.mood.${mood}` as TranslationKey) : t('today.partnerNoMood')}
            </Text>
          </View>
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('presence.pingAction')}
        disabled={sendPing.isPending}
        onPress={ping}
        className="h-11 w-11 items-center justify-center rounded-full bg-brand-soft active:scale-90 dark:bg-brand-soft-dark"
      >
        <HeartHandshake size={22} color={colors.brand} strokeWidth={ICON_STROKE.emphasis} />
      </Pressable>
    </View>
  )
}

function FriendsRow({ divided }: { divided: boolean }) {
  const { t } = useI18n()
  const router = useRouter()
  const colors = useThemeColors()
  const userId = useCurrentUserId()
  const { friends } = useFriends()
  const { data: counts } = useFriendsActivityToday()

  // Los que ya han registrado hoy, primero los que mas.
  const active = useMemo(
    () =>
      friends
        .map((edge) => ({ profile: edge.profile, count: counts?.[edge.profile.id] ?? 0 }))
        .filter((entry) => entry.count > 0 && entry.profile.id !== userId)
        .sort((a, b) => b.count - a.count),
    [friends, counts, userId],
  )

  const lead = active[0]?.profile ?? friends[0]!.profile
  const first = lead.display_name.split(' ')[0] ?? ''
  const title =
    active.length === 0
      ? t('today.friendsNone')
      : active.length === 1
        ? t('today.friendsOne', { name: first })
        : t('today.friendsMany', { name: first, count: active.length - 1 })

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        haptic('tap')
        router.push('/feed')
      }}
      className="flex-row items-center gap-3 pl-4 active:bg-surface-sunken dark:active:bg-surface-sunken-dark"
    >
      <View style={{ opacity: active.length === 0 ? 0.5 : 1 }}>
        <Avatar name={lead.display_name} src={lead.avatar_url} size="md" />
        {active.length > 1 ? (
          <View className="absolute -bottom-1 -right-1 h-5 min-w-5 items-center justify-center rounded-full border-2 border-surface bg-brand px-1 dark:border-surface-dark">
            <Text className="text-[11px] font-bold text-white" style={{ fontVariant: ['tabular-nums'] }}>
              +{active.length - 1}
            </Text>
          </View>
        ) : null}
      </View>
      <View
        className={cn(
          'min-h-16 min-w-0 flex-1 flex-row items-center gap-3 py-3 pr-4',
          divided && 'border-t border-border dark:border-border-dark',
        )}
      >
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="text-[17px] font-semibold text-text dark:text-text-dark">
            {title}
          </Text>
          <Text numberOfLines={1} className="text-[15px] text-text-muted dark:text-text-muted-dark">
            {active.length > 0 ? t('today.friendsCheer') : t('today.friendsNudge')}
          </Text>
        </View>
        <ChevronRight size={18} color={colors.textSubtle} />
      </View>
    </Pressable>
  )
}
