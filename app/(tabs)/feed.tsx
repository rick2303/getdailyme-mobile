import { Dumbbell, Flag, Flame, Hand, Heart, Laugh, type LucideIcon } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { Image } from 'react-native'
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { FeedComments } from '@/components/feed/feed-comments'
import { Inbox } from '@/components/feed/inbox'
import { ProfileCardSheet } from '@/components/feed/profile-card-sheet'
import { ReportSheet, type ReportSheetTarget } from '@/components/feed/report-sheet'
import { Avatar } from '@/components/ui/avatar'
import { PhotoViewer } from '@/components/ui/photo-viewer'
import { IconButton } from '@/components/ui/button'
import { EmptyState, Spinner } from '@/components/ui/feedback'
import { useThemeColors } from '@/constants/colors'
import { useI18n } from '@/i18n/provider'
import type { TranslationKey } from '@/i18n/translate'
import { useActivityLabels } from '@/lib/activities/labels'
import { REACTION_TYPES, type FeedEntry, type ReactionType } from '@/lib/api/types'
import { useCurrentUserId, useTimeZone } from '@/lib/auth/provider'
import { useFeed, useFeedRealtime, useToggleReaction } from '@/lib/hooks/use-feed'
import { useActivityPhotoUrl } from '@/lib/hooks/use-photo-url'
import { useRelativeTime } from '@/lib/hooks/use-relative-time'
import { ActivityIcon } from '@/components/activities/activity-icon'
import { formatTime } from '@/lib/utils/dates'
import { haptic } from '@/lib/utils/haptics'

const REACTION_ICONS: Record<ReactionType, LucideIcon> = {
  fire: Flame,
  clap: Hand,
  heart: Heart,
  laugh: Laugh,
  muscle: Dumbbell,
}

export default function FeedScreen() {
  const { t } = useI18n()
  const feed = useFeed()
  useFeedRealtime()

  const [profileUserId, setProfileUserId] = useState<string | null>(null)
  const [reportTarget, setReportTarget] = useState<ReportSheetTarget | null>(null)

  const entries = useMemo(() => feed.data?.pages.flat() ?? [], [feed.data])

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bg-dark" edges={['top']}>
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        contentContainerClassName="gap-3 px-4 pb-8"
        refreshControl={
          <RefreshControl refreshing={feed.isRefetching} onRefresh={() => void feed.refetch()} />
        }
        onEndReached={() => {
          if (feed.hasNextPage && !feed.isFetchingNextPage) void feed.fetchNextPage()
        }}
        onEndReachedThreshold={0.4}
        ListHeaderComponent={
          <View className="gap-3 pt-4">
            <Text className="px-1 text-2xl font-extrabold text-text dark:text-text-dark">
              {t('feed.title')}
            </Text>
            <Inbox />
          </View>
        }
        ListEmptyComponent={
          feed.isLoading ? (
            <Spinner className="py-16" />
          ) : (
            <EmptyState title={t('feed.emptyTitle')} body={t('feed.emptyBody')} />
          )
        }
        ListFooterComponent={feed.isFetchingNextPage ? <Spinner className="py-4" /> : null}
        renderItem={({ item }) => (
          <FeedEntryCard
            entry={item}
            onOpenProfile={setProfileUserId}
            onReport={(target) => setReportTarget(target)}
          />
        )}
      />

      <ProfileCardSheet
        userId={profileUserId}
        onClose={() => setProfileUserId(null)}
        onReport={(target) => {
          setProfileUserId(null)
          setReportTarget(target)
        }}
      />

      <ReportSheet target={reportTarget} onClose={() => setReportTarget(null)} />
    </SafeAreaView>
  )
}

function FeedEntryCard({
  entry,
  onOpenProfile,
  onReport,
}: {
  entry: FeedEntry
  onOpenProfile: (userId: string) => void
  onReport: (target: ReportSheetTarget) => void
}) {
  const { t, locale } = useI18n()
  const colors = useThemeColors()
  const currentUserId = useCurrentUserId()
  const timeZone = useTimeZone()
  const { activityName, amountWithUnit } = useActivityLabels()
  const relativeTime = useRelativeTime()
  const { toggleReaction } = useToggleReaction()
  const { data: photoUrl } = useActivityPhotoUrl(entry.photo_url)
  const [viewerOpen, setViewerOpen] = useState(false)

  const isOwn = currentUserId !== null && entry.user_id === currentUserId

  const reactionSummary = useMemo(() => {
    const counts = new Map<ReactionType, { count: number; isActive: boolean }>()
    for (const type of REACTION_TYPES) counts.set(type, { count: 0, isActive: false })
    for (const reaction of entry.reactions) {
      const bucket = counts.get(reaction.type)
      if (!bucket) continue
      bucket.count += 1
      if (currentUserId !== null && reaction.user_id === currentUserId) bucket.isActive = true
    }
    return counts
  }, [entry.reactions, currentUserId])

  return (
    <View className="rounded-3xl border border-border bg-surface p-4 dark:border-border-dark dark:bg-surface-dark">
      <View className="flex-row items-center gap-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('profileCard.open', { name: entry.author.display_name })}
          onPress={() => onOpenProfile(entry.user_id)}
          className="flex-1 flex-row items-center gap-3"
        >
          <Avatar name={entry.author.display_name} src={entry.author.avatar_url} />
          <View className="min-w-0 flex-1">
            <View className="flex-row items-center gap-1.5">
              <Text className="text-[15px] font-bold text-text dark:text-text-dark" numberOfLines={1}>
                {entry.author.display_name}
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
              @{entry.author.username} · {relativeTime(entry.logged_at)} ·{' '}
              {formatTime(new Date(entry.logged_at), locale, timeZone)}
            </Text>
          </View>
        </Pressable>

        {!isOwn ? (
          <IconButton
            label={t('report.entry')}
            onPress={() => onReport({ type: 'log', logId: entry.id })}
            className="h-9 w-9"
          >
            <Flag size={16} color={colors.textSubtle} />
          </IconButton>
        ) : null}
      </View>

      <View className="mt-3 flex-row items-center gap-3">
        <ActivityIcon icon={entry.activity.icon} color={entry.activity.color} size="sm" />
        <View className="min-w-0 flex-1">
          <Text className="text-[15px] font-semibold text-text dark:text-text-dark" numberOfLines={1}>
            {activityName(entry.activity.name)}
          </Text>
          <Text className="text-sm text-text-muted dark:text-text-muted-dark" numberOfLines={1}>
            {amountWithUnit(entry.amount, entry.activity.unit)}
          </Text>
        </View>
      </View>

      {entry.note ? (
        <Text className="mt-3 text-sm leading-relaxed text-text-muted dark:text-text-muted-dark">
          {entry.note}
        </Text>
      ) : null}

      {photoUrl ? (
        <>
          <Pressable
            accessibilityRole="imagebutton"
            accessibilityLabel={t('log.openPhoto')}
            onPress={() => setViewerOpen(true)}
            className="mt-3 overflow-hidden rounded-2xl bg-surface-sunken dark:bg-surface-sunken-dark"
          >
            <Image source={{ uri: photoUrl }} className="aspect-video w-full" resizeMode="cover" />
          </Pressable>
          <PhotoViewer
            open={viewerOpen}
            src={photoUrl}
            onClose={() => setViewerOpen(false)}
            closeLabel={t('common.close')}
          />
        </>
      ) : null}

      <FeedComments
        logId={entry.id}
        logOwnerId={entry.user_id}
        count={entry.comment_count}
        onOpenProfile={onOpenProfile}
        onReport={onReport}
      />

      <View className="mt-3 flex-row gap-1.5">
        {REACTION_TYPES.map((type) => {
          const bucket = reactionSummary.get(type)
          const Glyph = REACTION_ICONS[type]
          const isActive = bucket?.isActive ?? false
          return (
            <Pressable
              key={type}
              accessibilityRole="button"
              accessibilityLabel={t(`reactions.${type}` as TranslationKey)}
              accessibilityState={{ selected: isActive }}
              onPress={() => {
                haptic('tap')
                toggleReaction(entry.id, type, isActive)
              }}
              className={
                isActive
                  ? 'h-11 flex-1 flex-row items-center justify-center gap-1 rounded-full bg-brand-soft dark:bg-brand-soft-dark'
                  : 'h-11 flex-1 flex-row items-center justify-center gap-1 rounded-full bg-surface-sunken dark:bg-surface-sunken-dark'
              }
            >
              <Glyph
                size={18}
                color={isActive ? colors.brand : colors.textSubtle}
                strokeWidth={isActive ? 2.5 : 2}
              />
              {(bucket?.count ?? 0) > 0 ? (
                <Text
                  className={
                    isActive
                      ? 'text-xs font-bold text-brand dark:text-brand-dark'
                      : 'text-xs font-bold text-text-subtle dark:text-text-subtle-dark'
                  }
                >
                  {bucket?.count}
                </Text>
              ) : null}
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}
