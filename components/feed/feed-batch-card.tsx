import { ChevronRight, Flame, MessageCircle } from 'lucide-react-native'
import { useMemo } from 'react'
import { Pressable, Text, View } from 'react-native'

import { ActivityIcon } from '@/components/activities/activity-icon'
import { Avatar } from '@/components/ui/avatar'
import { SHADOW_TILE, useThemeColors } from '@/constants/colors'
import { useI18n } from '@/i18n/provider'
import { useActivityLabels } from '@/lib/activities/labels'
import { useCurrentUserId } from '@/lib/auth/provider'
import type { FeedGroup } from '@/lib/feed/grouping'
import { useToggleReaction } from '@/lib/hooks/use-feed'
import { useRelativeTime } from '@/lib/hooks/use-relative-time'
import { cn } from '@/lib/utils/cn'
import { haptic } from '@/lib/utils/haptics'

// El dia de una persona en una sola tarjeta, como el muro de Strava: una cara,
// una frase ("registro 4 cosas") y una fila por actividad con su cifra. Cada
// fila abre su registro en la hoja; abajo, un solo "dar animo" para todo el
// lote.
export function FeedBatchCard({
  groups,
  onOpenProfile,
  onOpenLog,
}: {
  groups: FeedGroup[]
  onOpenProfile: (userId: string) => void
  onOpenLog: (logId: string) => void
}) {
  const { t } = useI18n()
  const colors = useThemeColors()
  const userId = useCurrentUserId()
  const { activityName, unitLabel } = useActivityLabels()
  const relativeTime = useRelativeTime()
  const { toggleReaction } = useToggleReaction()

  const head = groups[0].entry
  const isOwn = userId !== null && head.user_id === userId
  const entries = useMemo(() => groups.map((group) => group.entry), [groups])

  // Encendido si ya aplaudiste todos; quien lo da cuenta una vez aunque haya
  // aplaudido varias filas.
  const { cheered, cheerers } = useMemo(() => {
    const people = new Set<string>()
    let mineOnAll = true
    for (const entry of entries) {
      const fires = entry.reactions.filter((reaction) => reaction.type === 'fire')
      for (const reaction of fires) people.add(reaction.user_id)
      if (!fires.some((reaction) => reaction.user_id === userId)) mineOnAll = false
    }
    return { cheered: mineOnAll, cheerers: people.size }
  }, [entries, userId])

  const cheer = () => {
    haptic(cheered ? 'tap' : 'success')
    for (const entry of entries) {
      const mine = entry.reactions.some(
        (reaction) => reaction.type === 'fire' && reaction.user_id === userId,
      )
      // Encender solo donde falta, apagar solo donde esta.
      if (cheered ? mine : !mine) toggleReaction(entry.id, 'fire', mine)
    }
  }

  return (
    <View
      style={SHADOW_TILE}
      className="rounded-3xl border border-border bg-surface p-4 dark:border-border-dark dark:bg-surface-dark"
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('profileCard.open', { name: head.author.display_name })}
        onPress={() => onOpenProfile(head.user_id)}
        className="flex-row items-center gap-3 active:opacity-70"
      >
        <Avatar name={head.author.display_name} src={head.author.avatar_url} />
        <View className="min-w-0 flex-1">
          <View className="flex-row items-center gap-1.5">
            <Text className="text-[15px] font-bold text-text dark:text-text-dark" numberOfLines={1}>
              {head.author.display_name}
            </Text>
            {isOwn ? (
              <View className="rounded-full bg-brand-soft px-2 py-0.5 dark:bg-brand-soft-dark">
                <Text className="text-[10px] font-bold text-brand dark:text-brand-dark">
                  {t('feed.you')}
                </Text>
              </View>
            ) : null}
          </View>
          <Text className="text-xs text-text-subtle dark:text-text-subtle-dark" numberOfLines={1}>
            {t('feed.batchSummary', { count: groups.length })}, {relativeTime(head.logged_at)}
          </Text>
        </View>
      </Pressable>

      <View className="mt-3 overflow-hidden rounded-2xl bg-surface-sunken dark:bg-surface-sunken-dark">
        {groups.map((group, index) => {
          const entry = group.entry
          const amount = group.amount
          const reactions = entry.reactions.length
          return (
            <View key={entry.id}>
              {index > 0 ? (
                <View className="ml-[60px] h-px bg-border dark:bg-border-dark" />
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${activityName(entry.activity.name)}, ${amount} ${unitLabel(entry.activity.unit, amount)}`}
                onPress={() => {
                  haptic('tap')
                  onOpenLog(entry.id)
                }}
                className="min-h-14 flex-row items-center gap-3 px-3 py-2 active:opacity-70"
              >
                <ActivityIcon icon={entry.activity.icon} color={entry.activity.color} size="sm" />
                <View className="min-w-0 flex-1">
                  <Text className="text-xs text-text-muted dark:text-text-muted-dark" numberOfLines={1}>
                    {activityName(entry.activity.name)}
                  </Text>
                  <View className="flex-row items-baseline gap-1">
                    <Text
                      className="text-xl font-extrabold leading-tight text-text dark:text-text-dark"
                      style={{ fontVariant: ['tabular-nums'] }}
                    >
                      {amount}
                    </Text>
                    <Text className="shrink text-xs text-text-muted dark:text-text-muted-dark" numberOfLines={1}>
                      {unitLabel(entry.activity.unit, amount)}
                    </Text>
                  </View>
                </View>
                {reactions > 0 ? (
                  <View className="flex-row items-center gap-1">
                    <Flame size={14} color={colors.textMuted} />
                    <Text className="text-xs text-text-muted dark:text-text-muted-dark">{reactions}</Text>
                  </View>
                ) : null}
                {entry.comment_count > 0 ? (
                  <View className="flex-row items-center gap-1">
                    <MessageCircle size={14} color={colors.textMuted} />
                    <Text className="text-xs text-text-muted dark:text-text-muted-dark">
                      {entry.comment_count}
                    </Text>
                  </View>
                ) : null}
                <ChevronRight size={16} color={colors.textSubtle} />
              </Pressable>
            </View>
          )
        })}
      </View>

      {isOwn ? (
        cheerers > 0 ? (
          <View className="mt-3 flex-row items-center gap-1.5">
            <Flame size={16} color={colors.streak} fill={colors.streak} />
            <Text className="text-sm text-text-muted dark:text-text-muted-dark">
              {t('feed.batchCheered', { count: cheerers })}
            </Text>
          </View>
        ) : null
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: cheered }}
          onPress={cheer}
          className={cn(
            'mt-3 h-11 flex-row items-center gap-2 self-start rounded-full px-4 active:opacity-70',
            cheered ? 'bg-brand-soft dark:bg-brand-soft-dark' : 'bg-surface-sunken dark:bg-surface-sunken-dark',
          )}
        >
          <Flame
            size={20}
            color={cheered ? colors.brand : colors.text}
            fill={cheered ? colors.brand : 'none'}
            strokeWidth={cheered ? 2.5 : 2}
          />
          <Text
            className={cn(
              'text-sm font-semibold',
              cheered ? 'text-brand dark:text-brand-dark' : 'text-text dark:text-text-dark',
            )}
          >
            {cheered ? t('feed.batchCheerDone') : t('feed.batchCheer')}
          </Text>
          {cheerers > 0 ? (
            <Text
              className={cn(
                'text-sm font-semibold opacity-70',
                cheered ? 'text-brand dark:text-brand-dark' : 'text-text dark:text-text-dark',
              )}
            >
              {cheerers}
            </Text>
          ) : null}
        </Pressable>
      )}
    </View>
  )
}
