import { CalendarHeart, Flame } from 'lucide-react-native'
import { Text, View } from 'react-native'

import { SHADOW_TILE, useThemeColors } from '@/constants/colors'
import { useI18n } from '@/i18n/provider'
import type { Couple } from '@/lib/api/couple'
import { nextMilestone } from '@/lib/couple/milestones'
import { useCoupleStreak } from '@/lib/hooks/use-couple-answers'

export function CoupleBoard({ couple, today }: { couple: Couple; today: string }) {
  const { t } = useI18n()
  const colors = useThemeColors()
  const { data: streak } = useCoupleStreak(couple.id, today)

  const milestone = nextMilestone(couple.startedOn, today)
  const current = streak?.current ?? 0

  return (
    <View className="flex-row gap-3 px-4">
      <Card
        icon={
          <Flame
            size={20}
            color={current > 0 ? colors.streak : colors.textSubtle}
            fill={current > 0 ? colors.streak : 'none'}
          />
        }
        label={t('couple.boardStreak')}
      >
        {current > 0 ? (
          <Figure value={current} unit={t('couple.streakLabel', { count: current })} />
        ) : (
          <Text className="text-sm text-text-muted dark:text-text-muted-dark">
            {t('couple.boardStreakEmpty')}
          </Text>
        )}
      </Card>

      <Card
        icon={<CalendarHeart size={20} color={colors.brand} />}
        label={t('couple.boardNext')}
      >
        {milestone ? (
          <>
            <Figure
              value={milestone.in}
              unit={t('couple.boardDaysLeft', { count: milestone.in })}
            />
            <Text
              className="text-xs text-text-subtle dark:text-text-subtle-dark"
              numberOfLines={1}
            >
              {milestone.kind === 'days'
                ? t('couple.boardMilestoneDays', { count: milestone.value })
                : t('couple.boardMilestoneYears', { count: milestone.value })}
            </Text>
          </>
        ) : null}
      </Card>
    </View>
  )
}

function Card({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <View
      style={SHADOW_TILE}
      className="min-h-28 flex-1 justify-between gap-3 rounded-3xl border border-border bg-surface p-4 dark:border-border-dark dark:bg-surface-dark"
    >
      <View className="flex-row items-center gap-2">
        {icon}
        <Text
          className="flex-1 text-xs text-text-subtle dark:text-text-subtle-dark"
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>
      <View>{children}</View>
    </View>
  )
}

function Figure({ value, unit }: { value: number; unit: string }) {
  return (
    <View className="flex-row items-baseline gap-1.5">
      <Text
        className="text-3xl font-extrabold text-text dark:text-text-dark"
        style={{ fontVariant: ['tabular-nums'] }}
      >
        {value}
      </Text>
      <Text className="shrink text-xs text-text-muted dark:text-text-muted-dark" numberOfLines={1}>
        {unit}
      </Text>
    </View>
  )
}
