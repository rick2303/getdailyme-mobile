import { useQueryClient } from '@tanstack/react-query'
import { LinearGradient } from 'expo-linear-gradient'
import { StatusBar } from 'expo-status-bar'
import { Eye, Heart, MapPin, Plus, Trash2, X } from 'lucide-react-native'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ViewStyle,
} from 'react-native'
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler'
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Avatar } from '@/components/ui/avatar'
import { IconButton } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Spinner } from '@/components/ui/feedback'
import { Sheet } from '@/components/ui/sheet'
import { useToast } from '@/components/ui/toast'
import { useThemeColors } from '@/constants/colors'
import { useI18n } from '@/i18n/provider'
import type { TranslationKey } from '@/i18n/translate'
import { firstUnseenIndex, hoursLeft, type Story } from '@/lib/api/stories'
import type { ReactionType } from '@/lib/api/types'
import { useCurrentUserId } from '@/lib/auth/provider'
import {
  preloadStoryImage,
  useDeleteStory,
  useMarkSeen,
  useReactToStory,
  useStories,
  useStoryActivity,
} from '@/lib/hooks/use-stories'
import { useRelativeTime } from '@/lib/hooks/use-relative-time'
import { queryKeys } from '@/lib/query/keys'
import { haptic } from '@/lib/utils/haptics'

import { STORY_REACTION_ICONS, STORY_REACTION_ORDER } from './reactions'

const STEP_MS = 5000
const HOLD_MS = 220
const MOVE_PX = 12
const SWIPE_PX = 80
const CLOSE_PX = 120
const SWIPE_VELOCITY = 600
const CLOSE_VELOCITY = 800
const BURST_MS = 900
const MEDIA_RADIUS = 24
const WHITE = '#fff'
const WHITE_MUTED = 'rgba(255,255,255,0.7)'
const WHITE_TRACK = 'rgba(255,255,255,0.35)'
const WHITE_FILL = 'rgba(255,255,255,0.12)'
const WHITE_GLASS = 'rgba(255,255,255,0.2)'
const BLACK = '#000'
const TOP_SHADE = ['rgba(0,0,0,0.6)', 'rgba(0,0,0,0)'] as const
const BOTTOM_SHADE = ['rgba(0,0,0,0)', 'rgba(0,0,0,0.7)'] as const
const PRESSED: ViewStyle = { transform: [{ scale: 0.8 }] }

export type StoryAuthor = { id: string; displayName: string; avatarUrl: string | null }

type Position = { authorId: string; index: number }
type Burst = { kind: ReactionType; key: number }

export function StoryViewer({
  queue,
  onClose,
  onAddYours,
}: {
  queue: StoryAuthor[]
  onClose: () => void
  onAddYours: () => void
}) {
  const { t } = useI18n()
  const { showToast } = useToast()
  const relativeTime = useRelativeTime()
  const queryClient = useQueryClient()
  const viewerId = useCurrentUserId()
  const insets = useSafeAreaInsets()
  const { width } = useWindowDimensions()
  const markSeen = useMarkSeen()
  const react = useReactToStory()
  const remove = useDeleteStory()

  const [authorIndex, setAuthorIndex] = useState(0)
  const author = queue[authorIndex] ?? null
  const { data: stories, isPending } = useStories(author?.id ?? null)
  const list = useMemo(() => stories ?? [], [stories])

  const [position, setPosition] = useState<Position | null>(null)
  if (author && list.length > 0 && position?.authorId !== author.id) {
    setPosition({ authorId: author.id, index: firstUnseenIndex(list) })
  }
  const index =
    author && position?.authorId === author.id ? Math.min(position.index, list.length - 1) : 0
  const story: Story | null = list[index] ?? null
  const isMine = Boolean(story && story.authorId === viewerId)

  const [loadedUrl, setLoadedUrl] = useState<string | null>(null)
  const [holding, setHolding] = useState(false)
  const [chromeHidden, setChromeHidden] = useState(false)
  const [activityOpen, setActivityOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [burst, setBurst] = useState<Burst | null>(null)

  const elapsedRef = useRef(0)
  const draggingRef = useRef(false)
  const axisRef = useRef<'x' | 'y' | null>(null)
  const burstCountRef = useRef(0)
  const widthRef = useRef(width)
  const progress = useSharedValue(0)
  const dragX = useSharedValue(0)
  const dragY = useSharedValue(0)

  const ready = Boolean(story && (story.url === null || loadedUrl === story.url))
  const running = ready && !holding && !activityOpen && !confirming

  const restartStep = () => {
    elapsedRef.current = 0
    progress.value = 0
  }

  const goToAuthor = (next: number) => {
    if (next >= queue.length) {
      onClose()
      return
    }
    restartStep()
    if (next < 0) return
    setAuthorIndex(next)
  }

  const goNext = () => {
    if (!author) return
    if (index + 1 < list.length) {
      restartStep()
      setPosition({ authorId: author.id, index: index + 1 })
      return
    }
    goToAuthor(authorIndex + 1)
  }

  const goPrevious = () => {
    if (!author) return
    if (index > 0) {
      restartStep()
      setPosition({ authorId: author.id, index: index - 1 })
      return
    }
    if (authorIndex > 0) goToAuthor(authorIndex - 1)
    else restartStep()
  }

  const endHold = () => {
    setHolding(false)
    setChromeHidden(false)
  }

  const handlersRef = useRef({ goNext, goPrevious, goToAuthor, endHold, onClose, authorIndex })
  useEffect(() => {
    handlersRef.current = { goNext, goPrevious, goToAuthor, endHold, onClose, authorIndex }
    widthRef.current = width
  })

  useEffect(() => {
    if (!running) return
    let frame = 0
    let last = Date.now()

    const tick = () => {
      const now = Date.now()
      elapsedRef.current += now - last
      last = now
      progress.value = Math.min(1, elapsedRef.current / STEP_MS)
      if (elapsedRef.current >= STEP_MS) {
        handlersRef.current.goNext()
        return
      }
      frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [running, story?.id, progress])

  useEffect(() => {
    if (!author || isPending || list.length > 0) return
    handlersRef.current.goToAuthor(authorIndex + 1)
  }, [author, isPending, list.length, authorIndex])

  useEffect(() => {
    if (story && ready) markSeen(story)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [story?.id, ready])

  useEffect(() => {
    preloadStoryImage(list[index + 1]?.url)

    const nextAuthor = queue[authorIndex + 1]
    if (!nextAuthor) return
    const cached = queryClient.getQueryData<Story[]>(queryKeys.stories(nextAuthor.id))
    preloadStoryImage(cached?.[firstUnseenIndex(cached)]?.url)
  }, [list, index, queue, authorIndex, queryClient])

  const gesture = useMemo(() => {
    const hold = Gesture.LongPress()
      .runOnJS(true)
      .minDuration(HOLD_MS)
      .maxDistance(MOVE_PX)
      .onBegin(() => setHolding(true))
      .onStart(() => setChromeHidden(true))
      .onFinalize(() => {
        if (!draggingRef.current) handlersRef.current.endHold()
      })

    const tap = Gesture.Tap()
      .runOnJS(true)
      .maxDuration(HOLD_MS)
      .maxDistance(MOVE_PX)
      .onEnd((event, success) => {
        if (!success) return
        haptic('tap')
        if (event.x < widthRef.current / 3) handlersRef.current.goPrevious()
        else handlersRef.current.goNext()
      })

    const pan = Gesture.Pan()
      .runOnJS(true)
      .minDistance(MOVE_PX)
      .onStart(() => {
        draggingRef.current = true
        axisRef.current = null
        setHolding(true)
      })
      .onUpdate((event) => {
        if (axisRef.current === null) {
          axisRef.current =
            Math.abs(event.translationX) > Math.abs(event.translationY) ? 'x' : 'y'
        }
        if (axisRef.current === 'y') dragY.value = Math.max(0, event.translationY) * 0.7
        else dragX.value = event.translationX * 0.35
      })
      .onEnd((event) => {
        const handlers = handlersRef.current
        if (axisRef.current === 'y') {
          if (event.translationY > CLOSE_PX || event.velocityY > CLOSE_VELOCITY) handlers.onClose()
          return
        }
        if (event.translationX < -SWIPE_PX || event.velocityX < -SWIPE_VELOCITY) {
          handlers.goToAuthor(handlers.authorIndex + 1)
        } else if (event.translationX > SWIPE_PX || event.velocityX > SWIPE_VELOCITY) {
          handlers.goToAuthor(handlers.authorIndex - 1)
        }
      })
      .onFinalize(() => {
        draggingRef.current = false
        axisRef.current = null
        dragX.value = withSpring(0, { stiffness: 500, damping: 36 })
        dragY.value = withSpring(0, { stiffness: 500, damping: 36 })
        handlersRef.current.endHold()
      })

    return Gesture.Simultaneous(hold, tap, pan)
  }, [dragX, dragY])

  const dragStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: dragX.value }, { translateY: dragY.value }],
  }))

  const sendReaction = (kind: ReactionType) => {
    if (!story) return
    const next = story.myReaction === kind ? null : kind
    haptic(next ? 'success' : 'tap')
    if (next) {
      burstCountRef.current += 1
      setBurst({ kind: next, key: burstCountRef.current })
    }
    react.mutate({ story, kind: next }, { onError: () => showToast(t('common.genericError'), 'error') })
  }

  useEffect(() => {
    if (!burst) return
    const timer = setTimeout(() => setBurst(null), BURST_MS)
    return () => clearTimeout(timer)
  }, [burst])

  const chromeOpacity = { opacity: chromeHidden ? 0 : 1 }

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <StatusBar style="light" />
      <GestureHandlerRootView style={styles.root}>
        <Animated.View
          style={[
            styles.media,
            { borderBottomLeftRadius: MEDIA_RADIUS, borderBottomRightRadius: MEDIA_RADIUS },
            dragStyle,
          ]}
        >
          <GestureDetector gesture={gesture}>
            <View
              style={StyleSheet.absoluteFill}
              accessible
              accessibilityLabel={story?.caption ?? author?.displayName ?? t('stories.title')}
              accessibilityActions={[
                { name: 'previous', label: t('stories.previous') },
                { name: 'next', label: t('stories.next') },
              ]}
              onAccessibilityAction={(event) => {
                if (event.nativeEvent.actionName === 'previous') goPrevious()
                if (event.nativeEvent.actionName === 'next') goNext()
              }}
            >
              {story?.url ? (
                <>
                  <Image
                    source={{ uri: story.url }}
                    blurRadius={40}
                    resizeMode="cover"
                    style={[StyleSheet.absoluteFill, styles.backdrop]}
                  />
                  <Image
                    key={story.id}
                    source={{ uri: story.url }}
                    resizeMode="contain"
                    onLoad={() => setLoadedUrl(story.url)}
                    style={[StyleSheet.absoluteFill, { opacity: ready ? 1 : 0 }]}
                  />
                </>
              ) : null}

              {!ready && (isPending || story?.url) ? (
                <View style={[StyleSheet.absoluteFill, styles.center]}>
                  <ActivityIndicator size="large" color={WHITE} />
                </View>
              ) : null}
            </View>
          </GestureDetector>

          <View pointerEvents="box-none" style={[styles.top, chromeOpacity]}>
            <LinearGradient
              pointerEvents="none"
              colors={TOP_SHADE}
              style={StyleSheet.absoluteFill}
            />
            <View pointerEvents="none" style={{ paddingTop: insets.top + 8 }} className="flex-row gap-1 px-2">
              {list.map((item, at) => (
                <View
                  key={item.id}
                  style={{ backgroundColor: WHITE_TRACK }}
                  className="h-[3px] flex-1 overflow-hidden rounded-full"
                >
                  {at === index ? (
                    <ProgressFill progress={progress} />
                  ) : (
                    <View
                      style={{ backgroundColor: WHITE, width: at < index ? '100%' : '0%' }}
                      className="h-full"
                    />
                  )}
                </View>
              ))}
            </View>

            <View pointerEvents="box-none" className="flex-row items-center gap-2.5 pb-6 pl-3 pr-1 pt-2">
              <Avatar name={author?.displayName ?? ''} src={author?.avatarUrl ?? null} size="sm" />
              <View pointerEvents="none" className="min-w-0 flex-1 flex-row items-center gap-2">
                <Text numberOfLines={1} style={{ color: WHITE }} className="shrink text-[17px] font-semibold">
                  {isMine ? t('stories.yours') : (author?.displayName ?? '')}
                </Text>
                {story ? (
                  <Text style={{ color: WHITE_MUTED }} className="text-[13px]">
                    {relativeTime(story.createdAt)}
                  </Text>
                ) : null}
                {story?.coupleId ? (
                  <Heart
                    size={14}
                    color={WHITE_MUTED}
                    fill={WHITE_MUTED}
                    accessibilityLabel={t('stories.onlyCouple')}
                  />
                ) : null}
              </View>
              {isMine ? (
                <IconButton label={t('stories.delete')} onPress={() => setConfirming(true)}>
                  <Trash2 size={20} color={WHITE} />
                </IconButton>
              ) : null}
              <IconButton label={t('common.close')} onPress={onClose}>
                <X size={24} color={WHITE} />
              </IconButton>
            </View>
          </View>

          {story && (story.caption || story.placeLabel) ? (
            <View pointerEvents="none" style={[styles.bottom, chromeOpacity]}>
              <LinearGradient colors={BOTTOM_SHADE} style={StyleSheet.absoluteFill} />
              <View className="items-start gap-2 px-5 pb-5 pt-16">
                {story.placeLabel ? (
                  <View
                    style={{ backgroundColor: WHITE_GLASS }}
                    className="flex-row items-center gap-1.5 rounded-full px-3 py-1"
                  >
                    <MapPin size={14} color={WHITE} strokeWidth={2.5} />
                    <Text style={{ color: WHITE }} className="text-[13px] font-semibold">
                      {story.placeLabel}
                    </Text>
                  </View>
                ) : null}
                {story.caption ? (
                  <Text style={{ color: WHITE }} className="text-[17px]">
                    {story.caption}
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}

          {burst ? <BurstMark key={burst.key} kind={burst.kind} /> : null}
        </Animated.View>

        <View
          style={[{ paddingBottom: Math.max(insets.bottom, 8) }, chromeOpacity]}
          className="min-h-16 justify-center px-3 pt-2"
        >
          {story && isMine ? (
            <OwnFooter
              storyId={story.id}
              onOpen={() => setActivityOpen(true)}
              onAdd={onAddYours}
            />
          ) : story ? (
            <View
              accessibilityRole="toolbar"
              accessibilityLabel={t('stories.react')}
              className="flex-row items-center justify-between"
            >
              {STORY_REACTION_ORDER.map((kind) => {
                const Glyph = STORY_REACTION_ICONS[kind]
                const active = story.myReaction === kind
                const tint = active ? BLACK : WHITE
                return (
                  <Pressable
                    key={kind}
                    accessibilityRole="button"
                    accessibilityLabel={t(`reactions.${kind}` as TranslationKey)}
                    accessibilityState={{ selected: active }}
                    onPress={() => sendReaction(kind)}
                    style={({ pressed }) => [
                      { backgroundColor: active ? WHITE : WHITE_FILL },
                      pressed ? PRESSED : null,
                    ]}
                    className="h-12 w-12 items-center justify-center rounded-full"
                  >
                    <Glyph
                      size={24}
                      color={tint}
                      strokeWidth={2.5}
                      fill={active && kind === 'heart' ? tint : 'none'}
                    />
                  </Pressable>
                )
              })}
            </View>
          ) : null}
        </View>

        {story && isMine ? (
          <StoryActivitySheet
            storyId={story.id}
            expiresAt={story.expiresAt}
            open={activityOpen}
            onClose={() => setActivityOpen(false)}
          />
        ) : null}

        <ConfirmDialog
          open={confirming}
          title={t('stories.deleteTitle')}
          body={t('stories.deleteBody')}
          confirmLabel={t('common.delete')}
          destructive
          pending={remove.isPending}
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            if (!story) return
            remove.mutate(story.id, {
              onSuccess: () => {
                setConfirming(false)
                showToast(t('stories.deleted'), 'success')
                onClose()
              },
              onError: () => {
                setConfirming(false)
                showToast(t('common.genericError'), 'error')
              },
            })
          }}
        />
      </GestureHandlerRootView>
    </Modal>
  )
}

function ProgressFill({ progress }: { progress: SharedValue<number> }) {
  const style = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` }))
  return <Animated.View style={[{ backgroundColor: WHITE, height: '100%' }, style]} />
}

function BurstMark({ kind }: { kind: ReactionType }) {
  const Glyph = STORY_REACTION_ICONS[kind]
  const scale = useSharedValue(0.3)
  const lift = useSharedValue(40)
  const opacity = useSharedValue(0)

  useEffect(() => {
    scale.value = withSpring(1, { stiffness: 420, damping: 16 })
    lift.value = withSpring(0, { stiffness: 420, damping: 16 })
    opacity.value = withTiming(1, { duration: 120 })
    const timer = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 200 })
    }, BURST_MS - 220)
    return () => clearTimeout(timer)
  }, [scale, lift, opacity])

  const fade = useAnimatedStyle(() => ({ opacity: opacity.value }))
  const pop = useAnimatedStyle(() => ({
    transform: [{ translateY: lift.value }, { scale: scale.value }],
  }))

  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.center, fade]}>
      <Animated.View
        style={[{ backgroundColor: WHITE_GLASS }, pop]}
        className="h-32 w-32 items-center justify-center rounded-full"
      >
        <Glyph size={64} color={WHITE} strokeWidth={2.5} fill={kind === 'heart' ? WHITE : 'none'} />
      </Animated.View>
    </Animated.View>
  )
}

function OwnFooter({
  storyId,
  onOpen,
  onAdd,
}: {
  storyId: string
  onOpen: () => void
  onAdd: () => void
}) {
  const { t } = useI18n()
  const { data } = useStoryActivity(storyId)
  const viewers = data ?? []
  const faces = viewers.slice(0, 3)

  return (
    <View className="flex-row items-center justify-between gap-3">
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          haptic('tap')
          onOpen()
        }}
        className="h-12 min-w-0 flex-shrink flex-row items-center gap-2.5 rounded-full pl-1.5 pr-4 active:opacity-70"
      >
        {faces.length > 0 ? (
          <View className="flex-row">
            {faces.map((viewer, at) => (
              <View
                key={viewer.userId}
                style={{ marginLeft: at === 0 ? 0 : -8, borderColor: BLACK }}
                className="rounded-full border-2"
              >
                <Avatar
                  name={viewer.displayName}
                  src={viewer.avatarUrl}
                  size="sm"
                  className="h-7 w-7"
                />
              </View>
            ))}
          </View>
        ) : (
          <Eye size={20} color={WHITE} />
        )}
        <Text numberOfLines={1} style={{ color: WHITE }} className="flex-shrink text-[15px] font-semibold">
          {viewers.length > 0
            ? t('stories.seenBy', { count: viewers.length })
            : t('stories.noViewsYet')}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          haptic('tap')
          onAdd()
        }}
        style={({ pressed }) => [{ backgroundColor: WHITE_FILL }, pressed ? PRESSED_SOFT : null]}
        className="h-11 flex-row items-center gap-1.5 rounded-full px-4"
      >
        <Plus size={20} color={WHITE} strokeWidth={2.5} />
        <Text style={{ color: WHITE }} className="text-[15px] font-semibold">
          {t('stories.add')}
        </Text>
      </Pressable>
    </View>
  )
}

const PRESSED_SOFT: ViewStyle = { transform: [{ scale: 0.96 }] }

function StoryActivitySheet({
  storyId,
  expiresAt,
  open,
  onClose,
}: {
  storyId: string
  expiresAt: string
  open: boolean
  onClose: () => void
}) {
  const { t } = useI18n()
  const colors = useThemeColors()
  const relativeTime = useRelativeTime()
  const { data, isPending } = useStoryActivity(open ? storyId : null)
  const viewers = data ?? []
  const left = hoursLeft(expiresAt)

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={
        viewers.length > 0 ? t('stories.seenBy', { count: viewers.length }) : t('stories.activity')
      }
      description={left > 0 ? t('stories.expiresIn', { count: left }) : t('stories.expired')}
      closeLabel={t('common.close')}
    >
      {isPending ? (
        <Spinner className="py-10" />
      ) : viewers.length === 0 ? (
        <View className="items-center gap-2 px-6 py-10">
          <Eye size={32} color={colors.textMuted} strokeWidth={1.5} />
          <Text className="text-center text-base text-text-muted dark:text-text-muted-dark">
            {t('stories.noViewsYetBody')}
          </Text>
        </View>
      ) : (
        <View className="overflow-hidden rounded-tile bg-surface-sunken dark:bg-surface-sunken-dark">
          {viewers.map((viewer, at) => {
            const Glyph = viewer.reaction ? STORY_REACTION_ICONS[viewer.reaction] : null
            const last = at === viewers.length - 1
            return (
              <View key={viewer.userId} className="min-h-14 flex-row items-center gap-3 pl-4">
                <Avatar name={viewer.displayName} src={viewer.avatarUrl} size="sm" />
                <View
                  className={
                    last
                      ? 'min-h-14 min-w-0 flex-1 flex-row items-center gap-3 pr-4'
                      : 'min-h-14 min-w-0 flex-1 flex-row items-center gap-3 border-b border-border pr-4 dark:border-border-dark'
                  }
                >
                  <View className="min-w-0 flex-1">
                    <Text
                      numberOfLines={1}
                      className="text-[17px] font-semibold text-text dark:text-text-dark"
                    >
                      {viewer.displayName}
                    </Text>
                    <Text className="text-[13px] text-text-subtle dark:text-text-subtle-dark">
                      {relativeTime(viewer.seenAt)}
                    </Text>
                  </View>
                  {Glyph && viewer.reaction ? (
                    <View
                      accessible
                      accessibilityLabel={t(`reactions.${viewer.reaction}` as TranslationKey)}
                      className="h-9 w-9 items-center justify-center rounded-full bg-brand"
                    >
                      <Glyph
                        size={20}
                        color={WHITE}
                        strokeWidth={2.5}
                        fill={viewer.reaction === 'heart' ? WHITE : 'none'}
                      />
                    </View>
                  ) : null}
                </View>
              </View>
            )
          })}
        </View>
      )}
    </Sheet>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BLACK },
  media: { flex: 1, overflow: 'hidden', backgroundColor: BLACK },
  backdrop: { opacity: 0.5, transform: [{ scale: 1.25 }] },
  center: { alignItems: 'center', justifyContent: 'center' },
  top: { position: 'absolute', top: 0, left: 0, right: 0 },
  bottom: { position: 'absolute', bottom: 0, left: 0, right: 0 },
})
