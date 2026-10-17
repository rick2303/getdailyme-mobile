import { useRouter } from 'expo-router'
import { Camera, ChevronLeft, Clock, ImageIcon, Lock, RotateCcw, Trash2 } from 'lucide-react-native'
import { useState } from 'react'
import { Image, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { PageHeader } from '@/components/layout/page-header'
import { STORY_REACTION_ICONS, STORY_REACTION_ORDER } from '@/components/stories/reactions'
import { Avatar } from '@/components/ui/avatar'
import { Button, IconButton } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { TextInput } from '@/components/ui/field'
import { useToast } from '@/components/ui/toast'
import { SHADOW_TILE, useThemeColors } from '@/constants/colors'
import { useI18n } from '@/i18n/provider'
import type { TranslationKey } from '@/i18n/translate'
import {
  formatCountdown,
  MOMENT_CAPTION_MAX,
  MOMENT_WINDOW_MS,
  MomentNotOpenError,
  momentPhase,
  type Moment,
} from '@/lib/api/moments'
import type { ReactionType } from '@/lib/api/types'
import { useCurrentUserId, useTimeZone } from '@/lib/auth/provider'
import {
  useDeleteMoment,
  useMomentFriendsPosted,
  useMomentReaction,
  useMomentRound,
  useMoments,
  usePublishMoment,
} from '@/lib/hooks/use-moments'
import { useNowMs } from '@/lib/hooks/use-now'
import { ICON_STROKE } from '@/lib/icons/tokens'
import { cn } from '@/lib/utils/cn'
import { formatTime, todayKey } from '@/lib/utils/dates'
import { haptic } from '@/lib/utils/haptics'
import { pickImage, type PhotoSource } from '@/lib/utils/pick-image'
import { useQueryClient } from '@tanstack/react-query'

const WINDOW_MINUTES = Math.round(MOMENT_WINDOW_MS / 60_000)

// El momento del dia a pantalla completa: antes de la hora explica de que va;
// con el momento abierto, la camara; publicado, lo del circulo.
//
// Lo ajeno solo llega despues de publicar lo propio, y eso no lo decide esta
// pantalla: hasta entonces la base sencillamente no lo devuelve.
export default function MomentScreen() {
  const { t, locale } = useI18n()
  const router = useRouter()
  const colors = useThemeColors()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const userId = useCurrentUserId()
  const timeZone = useTimeZone()
  const today = todayKey(timeZone)
  const now = useNowMs(1000)

  const { data: round } = useMomentRound(today)
  const { data: moments } = useMoments(today)
  const mine = (moments ?? []).find((moment) => moment.userId === userId) ?? null
  const phase = momentPhase(round ?? null, Boolean(mine), new Date(now))
  const { data: friendsPosted } = useMomentFriendsPosted(today, !mine)

  const publish = usePublishMoment(today)
  const deleteMoment = useDeleteMoment(today)
  const react = useMomentReaction(today)

  const [picked, setPicked] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const goBack = () => {
    if (router.canGoBack()) router.back()
    else router.replace('/feed')
  }

  const pick = async (source: PhotoSource) => {
    haptic('tap')
    const result = await pickImage(source)
    if (result.status === 'picked') setPicked(result.uri)
    if (result.status === 'denied') showToast(t('common.genericError'), 'error')
  }

  const send = () => {
    if (!picked) return
    haptic('success')
    publish.mutate(
      { uri: picked, caption },
      {
        onSuccess: () => {
          setPicked(null)
          setCaption('')
          showToast(t('moments.published'), 'success')
        },
        onError: (error) =>
          showToast(
            error instanceof MomentNotOpenError ? t('moments.notOpen') : t('common.genericError'),
            'error',
          ),
      },
    )
  }

  const refresh = async () => {
    setRefreshing(true)
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['moment-round'] }),
      queryClient.invalidateQueries({ queryKey: ['moments'] }),
      queryClient.invalidateQueries({ queryKey: ['moment-friends-posted'] }),
    ])
    setRefreshing(false)
  }

  const others = (moments ?? []).filter((moment) => moment.userId !== userId)

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bg-dark" edges={['top']}>
      <View className="flex-row items-center px-2 pt-1">
        <IconButton label={t('common.back')} onPress={goBack}>
          <ChevronLeft size={24} color={colors.text} />
        </IconButton>
      </View>

      <ScrollView
        contentContainerClassName="gap-5 pb-10"
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={colors.brand}
            colors={[colors.brand]}
          />
        }
      >
        <PageHeader title={t('moments.title')} />

        {phase.kind === 'waiting' ? (
          <View className="items-center gap-3 px-8 py-10">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-surface-sunken dark:bg-surface-sunken-dark">
              <Clock size={28} color={colors.textMuted} strokeWidth={ICON_STROKE.airy} />
            </View>
            <Text className="text-center text-xl font-extrabold text-text dark:text-text-dark">
              {t('moments.waitingTitle')}
            </Text>
            <Text className="text-center text-sm text-text-muted dark:text-text-muted-dark">
              {t('moments.waitingBody', { minutes: WINDOW_MINUTES })}
            </Text>
          </View>
        ) : null}

        {phase.kind === 'open' || phase.kind === 'late' ? (
          <View className="gap-4 px-4">
            <View className="gap-1">
              <Text className="text-2xl font-extrabold text-text dark:text-text-dark">
                {phase.kind === 'open' ? t('moments.openTitle') : t('moments.lateTitle')}
              </Text>
              <Text className="text-sm text-text-muted dark:text-text-muted-dark">
                {phase.kind === 'open' ? t('moments.openBody') : t('moments.lateBody')}
              </Text>
              {phase.kind === 'open' ? (
                <Text
                  className="text-4xl font-extrabold text-brand dark:text-brand-dark"
                  style={{ fontVariant: ['tabular-nums'] }}
                >
                  {t('moments.remaining', { time: formatCountdown(phase.remainingMs) })}
                </Text>
              ) : null}
            </View>

            {picked ? (
              <View className="gap-3">
                <Image
                  source={{ uri: picked }}
                  className="w-full rounded-3xl bg-surface-sunken dark:bg-surface-sunken-dark"
                  style={{ aspectRatio: 3 / 4 }}
                  resizeMode="cover"
                />
                <TextInput
                  placeholder={t('moments.captionPlaceholder')}
                  value={caption}
                  maxLength={MOMENT_CAPTION_MAX}
                  onChangeText={setCaption}
                />
                <View className="flex-row gap-2">
                  <Button
                    title={t('moments.retake')}
                    variant="secondary"
                    icon={<RotateCcw size={18} color={colors.text} />}
                    disabled={publish.isPending}
                    onPress={() => void pick('camera')}
                  />
                  <View className="flex-1">
                    <Button
                      title={publish.isPending ? t('moments.publishing') : t('moments.publish')}
                      fullWidth
                      loading={publish.isPending}
                      onPress={send}
                    />
                  </View>
                </View>
              </View>
            ) : (
              <View className="gap-2">
                <Button
                  title={t('moments.take')}
                  size="lg"
                  fullWidth
                  icon={<Camera size={20} color="#fff" />}
                  onPress={() => void pick('camera')}
                />
                <Button
                  title={t('moments.pick')}
                  variant="ghost"
                  fullWidth
                  icon={<ImageIcon size={18} color={colors.textMuted} />}
                  onPress={() => void pick('library')}
                />
              </View>
            )}

            <View className="flex-row items-center gap-2 rounded-2xl bg-surface-sunken p-3 dark:bg-surface-sunken-dark">
              <Lock size={16} color={colors.textMuted} strokeWidth={ICON_STROKE.emphasis} />
              <Text className="flex-1 text-sm text-text-muted dark:text-text-muted-dark">
                {friendsPosted
                  ? t('moments.lockedFriends', { count: friendsPosted })
                  : t('moments.lockedNone')}
              </Text>
            </View>
          </View>
        ) : null}

        {mine ? (
          <View className="gap-6 px-4">
            <MomentView
              moment={mine}
              mine
              locale={locale}
              timeZone={timeZone}
              onDelete={() => setConfirmDelete(true)}
            />
            {others.length === 0 ? (
              <Text className="text-center text-sm text-text-muted dark:text-text-muted-dark">
                {t('moments.nobodyElse')}
              </Text>
            ) : (
              others.map((moment) => (
                <MomentView
                  key={moment.id}
                  moment={moment}
                  locale={locale}
                  timeZone={timeZone}
                  onReact={(kind) => {
                    haptic('tap')
                    react.mutate({
                      momentId: moment.id,
                      kind: moment.myReaction === kind ? null : kind,
                    })
                  }}
                />
              ))
            )}
          </View>
        ) : null}
      </ScrollView>

      <ConfirmDialog
        open={confirmDelete}
        title={t('moments.deleteTitle')}
        body={t('moments.deleteBody')}
        confirmLabel={t('moments.delete')}
        destructive
        pending={deleteMoment.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => {
          if (!mine) return
          haptic('warning')
          deleteMoment.mutate(
            { momentId: mine.id, mediaPath: mine.mediaPath },
            {
              onSuccess: () => showToast(t('moments.deleted'), 'success'),
              onError: () => showToast(t('common.genericError'), 'error'),
            },
          )
          setConfirmDelete(false)
        }}
      />
    </SafeAreaView>
  )
}

function MomentView({
  moment,
  mine = false,
  locale,
  timeZone,
  onReact,
  onDelete,
}: {
  moment: Moment
  mine?: boolean
  locale: string
  timeZone: string
  onReact?: (kind: ReactionType) => void
  onDelete?: () => void
}) {
  const { t } = useI18n()
  const colors = useThemeColors()
  const name = moment.author?.displayName ?? ''

  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-2">
        <Avatar name={name} src={moment.author?.avatarUrl} size="sm" />
        <View className="min-w-0 flex-1">
          <Text numberOfLines={1} className="text-[15px] font-bold text-text dark:text-text-dark">
            {mine ? t('moments.yours') : name}
          </Text>
          <View className="flex-row items-center gap-1.5">
            <Text className="text-xs text-text-muted dark:text-text-muted-dark">
              {t('moments.at', { time: formatTime(new Date(moment.createdAt), locale, timeZone) })}
            </Text>
            {moment.late ? (
              <View className="rounded-full bg-surface-sunken px-2 py-0.5 dark:bg-surface-sunken-dark">
                <Text className="text-[10px] font-bold text-text-muted dark:text-text-muted-dark">
                  {t('moments.late')}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
        {mine && onDelete ? (
          <IconButton label={t('moments.delete')} onPress={onDelete}>
            <Trash2 size={20} color={colors.textMuted} />
          </IconButton>
        ) : null}
      </View>

      <View style={SHADOW_TILE} className="overflow-hidden rounded-3xl bg-surface-sunken dark:bg-surface-sunken-dark">
        {moment.url ? (
          <Image
            source={{ uri: moment.url }}
            accessibilityLabel={moment.caption ?? name}
            style={{ width: '100%', aspectRatio: 3 / 4 }}
            resizeMode="cover"
          />
        ) : (
          <View style={{ width: '100%', aspectRatio: 3 / 4 }} />
        )}
      </View>

      {moment.caption ? (
        <Text className="text-[15px] text-text dark:text-text-dark">{moment.caption}</Text>
      ) : null}

      {onReact || moment.reactions.length > 0 ? (
        <View className="flex-row gap-1.5">
          {STORY_REACTION_ORDER.map((kind) => {
            const Icon = STORY_REACTION_ICONS[kind]
            const count = moment.reactions.filter((reaction) => reaction.kind === kind).length
            const selected = moment.myReaction === kind
            if (!onReact && count === 0) return null
            return (
              <Pressable
                key={kind}
                accessibilityRole="button"
                accessibilityLabel={t(`reactions.${kind}` as TranslationKey)}
                accessibilityState={{ selected }}
                disabled={!onReact}
                onPress={() => onReact?.(kind)}
                className={cn(
                  'h-11 flex-1 flex-row items-center justify-center gap-1 rounded-full active:opacity-70',
                  selected
                    ? 'bg-brand-soft dark:bg-brand-soft-dark'
                    : 'bg-surface-sunken dark:bg-surface-sunken-dark',
                )}
              >
                <Icon
                  size={18}
                  color={selected ? colors.brand : colors.textSubtle}
                  strokeWidth={selected ? ICON_STROKE.emphasis : undefined}
                />
                {count > 0 ? (
                  <Text
                    className={cn(
                      'text-xs font-bold',
                      selected
                        ? 'text-brand dark:text-brand-dark'
                        : 'text-text-subtle dark:text-text-subtle-dark',
                    )}
                  >
                    {count}
                  </Text>
                ) : null}
              </Pressable>
            )
          })}
        </View>
      ) : null}
    </View>
  )
}
