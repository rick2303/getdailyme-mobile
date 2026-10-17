import {
  CalendarCheck,
  Camera,
  PartyPopper,
  Rocket,
  Sunrise,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react-native'
import { Text, View } from 'react-native'

import { Avatar } from '@/components/ui/avatar'
import { SkeletonTile } from '@/components/ui/feedback'
import { SHADOW_TILE, useThemeColors } from '@/constants/colors'
import { useI18n } from '@/i18n/provider'
import type { TranslationKey } from '@/i18n/translate'
import { awardsWeekStart, isAwardsDay, type AwardKind } from '@/lib/api/awards'
import { useCurrentUserId, useTimeZone } from '@/lib/auth/provider'
import { useCircleAwards } from '@/lib/hooks/use-awards'
import { ICON_STROKE } from '@/lib/icons/tokens'
import { cn } from '@/lib/utils/cn'
import { formatLongDate, todayKey } from '@/lib/utils/dates'

export const AWARD_ICONS: Record<AwardKind, LucideIcon> = {
  consistent: CalendarCheck,
  early_bird: Sunrise,
  photographer: Camera,
  comeback: TrendingUp,
  cheerleader: PartyPopper,
  unstoppable: Rocket,
}

// Los premios de la semana del circulo. El domingo, los de la semana que se
// acaba; el resto de dias, los de la ultima completa. Solo cuenta lo que quien
// mira puede ver: el calculo lo hace la base desde sus ojos.
export function CircleAwards({ hasFriends }: { hasFriends: boolean }) {
  const { t, locale } = useI18n()
  const colors = useThemeColors()
  const userId = useCurrentUserId()
  const today = todayKey(useTimeZone())
  const weekStart = awardsWeekStart(today)
  const { data, isPending } = useCircleAwards(weekStart)

  const title = isAwardsDay(today) ? t('awards.sundayTitle') : t('awards.lastWeekTitle')
  const week = t('awards.weekOf', {
    date: formatLongDate(new Date(`${weekStart}T00:00:00Z`), locale),
  })

  return (
    <View className="gap-3 px-4">
      <View className="gap-0.5 px-1">
        <Text className="text-xl font-extrabold text-text dark:text-text-dark">{title}</Text>
        <Text className="text-xs text-text-subtle dark:text-text-subtle-dark">{week}</Text>
      </View>

      {!hasFriends ? (
        <Notice text={t('awards.solo')} />
      ) : isPending ? (
        <SkeletonTile className="h-40" />
      ) : !data || data.awards.length === 0 ? (
        <Notice text={t('awards.empty')} />
      ) : (
        <>
          <View className="flex-row flex-wrap justify-between gap-y-3">
            {data.awards.map((award) => {
              const Icon = AWARD_ICONS[award.kind]
              const isMe = award.winner.id === userId
              return (
                <View
                  key={award.kind}
                  style={[SHADOW_TILE, { width: '48.5%' }]}
                  className={cn(
                    'min-h-32 justify-between gap-3 rounded-3xl p-4',
                    isMe
                      ? 'bg-brand'
                      : 'border border-border bg-surface dark:border-border-dark dark:bg-surface-dark',
                  )}
                >
                  <View className="flex-row items-center gap-2">
                    <Icon
                      size={20}
                      color={isMe ? '#fff' : colors.brand}
                      strokeWidth={ICON_STROKE.emphasis}
                    />
                    <Text
                      numberOfLines={1}
                      className={cn(
                        'flex-1 text-xs font-bold',
                        isMe ? 'text-white' : 'text-text dark:text-text-dark',
                      )}
                    >
                      {t(`awards.kind.${award.kind}` as TranslationKey)}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <Avatar name={award.winner.displayName} src={award.winner.avatarUrl} size="sm" />
                    <View className="min-w-0 flex-1">
                      <Text
                        numberOfLines={1}
                        className={cn(
                          'text-[15px] font-bold',
                          isMe ? 'text-white' : 'text-text dark:text-text-dark',
                        )}
                      >
                        {isMe ? t('awards.you') : award.winner.displayName}
                      </Text>
                      <Text
                        numberOfLines={2}
                        className={cn(
                          'text-xs',
                          isMe ? 'text-white/90' : 'text-text-muted dark:text-text-muted-dark',
                        )}
                      >
                        {t(`awards.detail.${award.kind}` as TranslationKey, { count: award.value })}
                      </Text>
                    </View>
                  </View>
                </View>
              )
            })}
          </View>

          {data.standings.length > 1 ? (
            <View
              style={SHADOW_TILE}
              className="overflow-hidden rounded-3xl border border-border bg-surface dark:border-border-dark dark:bg-surface-dark"
            >
              <Text className="px-4 pt-3 text-xs text-text-subtle dark:text-text-subtle-dark">
                {t('awards.standings')}
              </Text>
              {data.standings.map((standing) => {
                const isMe = standing.person.id === userId
                return (
                  <View key={standing.person.id} className="flex-row items-center gap-3 px-4 py-2.5">
                    <Text
                      className="w-5 text-center text-base font-extrabold text-text-subtle dark:text-text-subtle-dark"
                      style={{ fontVariant: ['tabular-nums'] }}
                    >
                      {standing.rank}
                    </Text>
                    <Avatar
                      name={standing.person.displayName}
                      src={standing.person.avatarUrl}
                      size="sm"
                    />
                    <Text
                      numberOfLines={1}
                      className={cn(
                        'flex-1 text-[15px] text-text dark:text-text-dark',
                        isMe && 'font-bold',
                      )}
                    >
                      {isMe ? t('awards.you') : standing.person.displayName}
                    </Text>
                    <Text className="text-sm text-text-muted dark:text-text-muted-dark">
                      {t('awards.days', { count: standing.days })}
                    </Text>
                  </View>
                )
              })}
            </View>
          ) : null}

          <Text className="px-1 text-xs text-text-subtle dark:text-text-subtle-dark">
            {t('awards.privacy')}
          </Text>
        </>
      )}
    </View>
  )
}

function Notice({ text }: { text: string }) {
  return (
    <View
      style={SHADOW_TILE}
      className="rounded-3xl border border-border bg-surface p-4 dark:border-border-dark dark:bg-surface-dark"
    >
      <Text className="text-sm text-text-muted dark:text-text-muted-dark">{text}</Text>
    </View>
  )
}
