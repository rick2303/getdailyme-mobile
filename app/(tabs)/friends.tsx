import { Check, Flame, Hand, Search, Share2, UserMinus, UserPlus, X } from 'lucide-react-native'
import { useState } from 'react'
import { Share } from 'react-native'
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Avatar } from '@/components/ui/avatar'
import { Button, IconButton } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState, Spinner } from '@/components/ui/feedback'
import { TextInput } from '@/components/ui/field'
import { useToast } from '@/components/ui/toast'
import { ChallengesSection } from '@/components/friends/challenges-section'
import { PageHeader } from '@/components/layout/page-header'
import { useThemeColors } from '@/constants/colors'
import { useI18n } from '@/i18n/provider'
import type { FriendEdge } from '@/lib/api/types'
import {
  useFriends,
  useProfileSearch,
  useRemoveFriend,
  useRespondToFriendRequest,
  useSendFriendRequest,
  useSendNudge,
  useUnreadNudges,
  useMarkNudgesRead,
} from '@/lib/hooks/use-friends'
import { useQueryClient } from '@tanstack/react-query'

import { useInviteToken } from '@/lib/hooks/use-invite'
import { useFriendActiveDates } from '@/lib/hooks/use-friends'
import { useHistorySummary } from '@/lib/hooks/use-logs'
import { computeSharedStreak } from '@/lib/activities/streaks'
import { Sheet } from '@/components/ui/sheet'
import { useCurrentUserId } from '@/lib/auth/provider'
import { haptic } from '@/lib/utils/haptics'

export default function FriendsScreen() {
  const { t } = useI18n()
  const colors = useThemeColors()
  const queryClient = useQueryClient()
  const { friends, incoming, blocked, isLoading } = useFriends()
  const { data: inviteToken } = useInviteToken()

  const [query, setQuery] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  const refresh = async () => {
    setRefreshing(true)
    await queryClient.invalidateQueries({ queryKey: ['friends'] })
    await queryClient.invalidateQueries({ queryKey: ['challenges'] })
    setRefreshing(false)
  }

  // El enlace de invitacion de la web: lo comparte el share nativo y quien lo
  // abra queda como amistad al canjearlo (la ruta vive en la PWA).
  const shareInvite = async () => {
    if (!inviteToken) return
    haptic('tap')
    try {
      await Share.share({
        message: t('friends.inviteMessage') + String.fromCharCode(10) + 'https://app.getdailyme.com/invite/' + inviteToken,
      })
    } catch {
      // Cancelar el menu del sistema no es un error.
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bg-dark" edges={['top']}>
      <ScrollView
        contentContainerClassName="gap-5 pb-8 pt-2"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={colors.brand}
            colors={[colors.brand]}
          />
        }
      >
        <PageHeader
          title={t('friends.title')}
          subtitle={friends.length > 0 ? t('friends.friendsCount', { count: friends.length }) : undefined}
          action={
            <Button
              title={t('friends.shareInvite')}
              size="sm"
              variant="secondary"
              icon={<Share2 size={16} color={colors.text} />}
              onPress={() => void shareInvite()}
            />
          }
        />

        <View className="gap-5 px-4">
        <NudgeInboxCard />

        <TextInput
          placeholder={t('friends.searchPlaceholder')}
          value={query}
          autoCapitalize="none"
          onChangeText={setQuery}
          leading={<Search size={18} color={colors.textSubtle} />}
        />
        <SearchResults query={query} />

        {incoming.length > 0 ? <Requests requests={incoming} /> : null}

        <ChallengesSection />

        {isLoading ? (
          <Spinner className="py-8" />
        ) : friends.length > 0 ? (
          <FriendListSection friends={friends} />
        ) : (
          <EmptyState
            icon={<UserPlus size={28} color={colors.textSubtle} />}
            title={t('friends.emptyTitle')}
            body={t('friends.emptyBody')}
          />
        )}

        {blocked.length > 0 ? <BlockedSection blocked={blocked} /> : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function NudgeInboxCard() {
  const { t } = useI18n()
  const { data: nudges } = useUnreadNudges()
  const markRead = useMarkNudgesRead()

  const pending = nudges ?? []
  if (pending.length === 0) return null
  const senders = Array.from(new Map(pending.map((nudge) => [nudge.sender.id, nudge])).values())

  return (
    <View className="gap-3 rounded-3xl border border-brand/35 bg-brand-soft p-4 dark:bg-brand-soft-dark">
      <View className="flex-row items-center gap-2">
        <View className="h-9 w-9 items-center justify-center rounded-full bg-brand">
          <Hand size={18} color="#fff" />
        </View>
        <Text className="flex-1 text-sm font-extrabold text-text dark:text-text-dark">
          {t('friends.nudgeInboxTitle', { count: senders.length })}
        </Text>
      </View>
      {senders.map((nudge) => (
        <View key={nudge.id} className="flex-row items-center gap-2.5">
          <Avatar name={nudge.sender.display_name} src={nudge.sender.avatar_url} size="sm" />
          <Text className="flex-1 text-sm font-bold text-text dark:text-text-dark" numberOfLines={1}>
            {nudge.sender.display_name}
          </Text>
        </View>
      ))}
      <Button
        title={t('friends.nudgeInboxDismiss')}
        size="sm"
        fullWidth
        disabled={markRead.isPending}
        onPress={() => {
          haptic('success')
          markRead.mutate(pending.map((nudge) => nudge.id))
        }}
      />
    </View>
  )
}

function SearchResults({ query }: { query: string }) {
  const { t } = useI18n()
  const { showToast } = useToast()
  const search = useProfileSearch(query)
  const sendRequest = useSendFriendRequest()

  if (query.trim().length < 2) return null
  if (search.isLoading) return <Spinner className="py-2" />

  const results = (search.data ?? []).filter((result) => result.relation !== 'blocked')

  if (results.length === 0) {
    return (
      <Text className="px-1 text-sm text-text-muted dark:text-text-muted-dark">
        {t('friends.noResults', { query: query.trim() })}
      </Text>
    )
  }

  return (
    <View className="gap-2">
      {results.map((result) => (
        <View
          key={result.profile.id}
          className="flex-row items-center gap-3 rounded-2xl border border-border bg-surface p-3 dark:border-border-dark dark:bg-surface-dark"
        >
          <Avatar name={result.profile.display_name} src={result.profile.avatar_url} size="sm" />
          <View className="min-w-0 flex-1">
            <Text className="text-sm font-bold text-text dark:text-text-dark" numberOfLines={1}>
              {result.profile.display_name}
            </Text>
            <Text className="text-xs text-text-muted dark:text-text-muted-dark">
              @{result.profile.username}
            </Text>
          </View>
          {result.relation === 'none' ? (
            <Button
              title={t('friends.addFriend')}
              size="sm"
              onPress={() => {
                haptic('tap')
                if (!sendRequest.send(result.profile.id)) {
                  showToast(t('common.genericError'), 'error')
                }
              }}
            />
          ) : (
            <Text className="text-xs font-semibold text-text-subtle dark:text-text-subtle-dark">
              {result.relation === 'accepted'
                ? t('friends.accepted')
                : result.relation === 'pending_out'
                  ? t('friends.pendingOut')
                  : t('friends.requestsTitle')}
            </Text>
          )}
        </View>
      ))}
    </View>
  )
}

function Requests({ requests }: { requests: FriendEdge[] }) {
  const { t } = useI18n()
  const colors = useThemeColors()
  const respond = useRespondToFriendRequest()

  return (
    <View className="gap-2">
      <Text className="px-1 text-sm font-bold uppercase tracking-wide text-text dark:text-text-dark">
        {t('friends.requestsTitle')}
      </Text>
      {requests.map((edge) => (
        <View
          key={edge.friendshipId}
          className="flex-row items-center gap-3 rounded-2xl border border-border bg-surface p-3 dark:border-border-dark dark:bg-surface-dark"
        >
          <Avatar name={edge.profile.display_name} src={edge.profile.avatar_url} size="sm" />
          <Text className="flex-1 text-sm font-bold text-text dark:text-text-dark" numberOfLines={1}>
            {edge.profile.display_name}
          </Text>
          <IconButton
            label={t('friends.accept')}
            onPress={() => {
              haptic('success')
              respond.respond(edge.friendshipId, 'accepted')
            }}
            className="bg-brand"
          >
            <Check size={18} color="#fff" />
          </IconButton>
          <IconButton
            label={t('friends.decline')}
            onPress={() => {
              haptic('warning')
              respond.respond(edge.friendshipId, 'declined')
            }}
            className="bg-surface-sunken dark:bg-surface-sunken-dark"
          >
            <X size={18} color={colors.textMuted} />
          </IconButton>
        </View>
      ))}
    </View>
  )
}

function FriendListSection({ friends }: { friends: FriendEdge[] }) {
  const userId = useCurrentUserId()
  const [selected, setSelected] = useState<FriendEdge | null>(null)
  const { t } = useI18n()
  const { showToast } = useToast()
  const colors = useThemeColors()
  const removeFriend = useRemoveFriend()
  const sendNudge = useSendNudge()
  const [pendingRemove, setPendingRemove] = useState<FriendEdge | null>(null)

  return (
    <View className="gap-2">
      <Text className="px-1 text-sm font-bold uppercase tracking-wide text-text dark:text-text-dark">
        {t('friends.myFriendsTitle')}
      </Text>
      {friends.map((edge) => (
        <View
          key={edge.friendshipId}
          className="flex-row items-center gap-3 rounded-2xl border border-border bg-surface p-3 dark:border-border-dark dark:bg-surface-dark"
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={edge.profile.display_name}
            onPress={() => setSelected(edge)}
            className="min-w-0 flex-1 flex-row items-center gap-3"
          >
            <Avatar name={edge.profile.display_name} src={edge.profile.avatar_url} size="sm" />
            <View className="min-w-0 flex-1">
              <Text className="text-sm font-bold text-text dark:text-text-dark" numberOfLines={1}>
                {edge.profile.display_name}
              </Text>
              <Text className="text-xs text-text-muted dark:text-text-muted-dark">
                @{edge.profile.username}
              </Text>
            </View>
          </Pressable>
          <IconButton
            label={t('friends.nudge')}
            onPress={() => {
              if (!userId) return
              haptic('tap')
              void sendNudge
                .mutateAsync({ userId, receiverId: edge.profile.id })
                .then((outcome) => {
                  const already = (outcome as { status?: string })?.status === 'already_sent'
                  showToast(
                    already
                      ? t('friends.nudgeAlreadySent')
                      : t('friends.nudgeSent', { name: edge.profile.display_name }),
                    already ? 'error' : 'success',
                  )
                })
                .catch(() => showToast(t('common.genericError'), 'error'))
            }}
            className="bg-brand-soft dark:bg-brand-soft-dark"
          >
            <Hand size={18} color={colors.brand} />
          </IconButton>
          <IconButton
            label={t('friends.removeFriend')}
            onPress={() => setPendingRemove(edge)}
            className="bg-surface-sunken dark:bg-surface-sunken-dark"
          >
            <UserMinus size={18} color={colors.textMuted} />
          </IconButton>
        </View>
      ))}

      <FriendSheet edge={selected} onClose={() => setSelected(null)} />

      <ConfirmDialog
        open={pendingRemove !== null}
        title={t('friends.removeConfirmTitle', { name: pendingRemove?.profile.display_name ?? '' })}
        body={t('friends.removeConfirmBody')}
        confirmLabel={t('friends.removeFriend')}
        onConfirm={() => {
          if (pendingRemove) removeFriend.remove(pendingRemove.friendshipId)
          setPendingRemove(null)
        }}
        onCancel={() => setPendingRemove(null)}
      />
    </View>
  )
}

function BlockedSection({ blocked }: { blocked: FriendEdge[] }) {
  const { t } = useI18n()
  const { showToast } = useToast()
  const removeFriend = useRemoveFriend()
  const [open, setOpen] = useState(false)

  return (
    <View className="gap-2">
      <Pressable accessibilityRole="button" onPress={() => setOpen((value) => !value)} className="min-h-10 justify-center px-1">
        <Text className="text-xs font-bold text-text-subtle dark:text-text-subtle-dark">
          {open ? t('block.hideList') : t('block.showList', { count: blocked.length })}
        </Text>
      </Pressable>
      {open
        ? blocked.map((edge) => (
            <View
              key={edge.friendshipId}
              className="flex-row items-center gap-3 rounded-2xl bg-surface-sunken px-3.5 py-2.5 dark:bg-surface-sunken-dark"
            >
              <Avatar name={edge.profile.display_name} src={edge.profile.avatar_url} size="sm" />
              <Text className="flex-1 text-sm font-bold text-text dark:text-text-dark" numberOfLines={1}>
                {edge.profile.display_name}
              </Text>
              <Button
                title={t('block.unblock')}
                size="sm"
                variant="secondary"
                disabled={removeFriend.isPending}
                onPress={() => {
                  haptic('tap')
                  if (removeFriend.remove(edge.friendshipId)) {
                    showToast(t('block.undone', { name: edge.profile.display_name }), 'success')
                  }
                }}
              />
            </View>
          ))
        : null}
    </View>
  )
}

function FriendSheet({ edge, onClose }: { edge: FriendEdge | null; onClose: () => void }) {
  const { t } = useI18n()

  return (
    <Sheet
      open={edge !== null}
      onClose={onClose}
      title={edge?.profile.display_name ?? ''}
      description={edge ? '@' + edge.profile.username : undefined}
      closeLabel={t('common.close')}
    >
      {edge ? (
        <View className="items-center gap-4 pb-2 pt-1">
          <Avatar name={edge.profile.display_name} src={edge.profile.avatar_url} size="lg" />
          <SharedStreakCard friendId={edge.profile.id} />
        </View>
      ) : null}
    </Sheet>
  )
}

function SharedStreakCard({ friendId }: { friendId: string }) {
  const { t } = useI18n()
  const { allDates, today } = useHistorySummary()
  const { data: friendDates, isLoading } = useFriendActiveDates(friendId)

  if (isLoading) return null

  const streak = computeSharedStreak(allDates, friendDates ?? [], today)

  return (
    <View className="w-full flex-row items-center gap-3 rounded-2xl bg-surface-sunken p-3.5 dark:bg-surface-sunken-dark">
      <View className="h-11 w-11 items-center justify-center rounded-full bg-brand-soft dark:bg-brand-soft-dark">
        <Flame size={20} color="#F97316" />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-sm font-bold text-text dark:text-text-dark">
          {t('friends.sharedStreakTitle')}
        </Text>
        <Text className="text-xs text-text-muted dark:text-text-muted-dark">
          {streak > 0
            ? t('friends.sharedStreakCount', { count: streak })
            : t('friends.sharedStreakEmpty')}
        </Text>
      </View>
    </View>
  )
}
