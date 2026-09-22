import { useLocalSearchParams, useRouter } from 'expo-router'
import { Heart, Plus } from 'lucide-react-native'
import { useEffect, useRef, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated'
import Svg, { Circle, Path } from 'react-native-svg'

import { Avatar } from '@/components/ui/avatar'
import { useToast } from '@/components/ui/toast'
import { StoryComposer } from '@/components/stories/story-composer'
import { StoryViewer, type StoryAuthor } from '@/components/stories/story-viewer'
import { useThemeColors } from '@/constants/colors'
import { useI18n } from '@/i18n/provider'
import { storyQueue, type StoryRingEntry } from '@/lib/api/stories'
import { useAuth } from '@/lib/auth/provider'
import { useCouple } from '@/lib/hooks/use-couple'
import {
  usePrefetchRingStories,
  usePublishingStory,
  useRefreshRing,
  useStoryRing,
} from '@/lib/hooks/use-stories'
import { cn } from '@/lib/utils/cn'
import { haptic } from '@/lib/utils/haptics'
import { pickImage } from '@/lib/utils/pick-image'

export const STORY_PARAM = 'story'
export const STORY_PARAM_MINE = 'mine'

const RING_SIZE = 68
const RING_STROKE = 2.5
const SEGMENT_GAP_DEG = 9
const MAX_SEGMENTS = 12
const ITEM_WIDTH = 72
const ITEM_GAP = 12
const ADD_ZONE = 44
const ADD_OFFSET = 40
const AVATAR_CLASS = 'h-[60px] w-[60px]'
const MODAL_SETTLE_MS = 400

export function StoryRing() {
  const { t } = useI18n()
  const { profile } = useAuth()
  const { showToast } = useToast()
  const router = useRouter()
  const params = useLocalSearchParams<{ story?: string }>()
  const { data: ring } = useStoryRing()
  const { data: couple } = useCouple()
  const publishing = usePublishingStory()
  const refreshRing = useRefreshRing()
  const [picked, setPicked] = useState<string | null>(null)
  const [queue, setQueue] = useState<StoryAuthor[] | null>(null)
  const pickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  usePrefetchRingStories(ring)

  const entries = ring ?? []
  const mine = profile ? entries.find((entry) => entry.authorId === profile.id) : undefined
  const others = profile ? entries.filter((entry) => entry.authorId !== profile.id) : []
  const requested = typeof params.story === 'string' ? params.story : null
  const deepLinked = requested === STORY_PARAM_MINE && Boolean(mine)

  useEffect(() => {
    if (!requested || !ring || deepLinked) return
    router.setParams({ story: undefined })
    if (requested === STORY_PARAM_MINE) showToast(t('stories.gone'))
  }, [requested, ring, deepLinked, router, showToast, t])

  useEffect(
    () => () => {
      if (pickTimerRef.current) clearTimeout(pickTimerRef.current)
    },
    [],
  )

  if (!profile) return null

  const openFrom = (authorId: string) => {
    const byId = new Map(entries.map((entry) => [entry.authorId, entry]))
    setQueue(
      storyQueue(entries, profile.id, authorId).map((id) => {
        const entry = byId.get(id)
        return {
          id,
          displayName: entry?.displayName ?? profile.display_name,
          avatarUrl: entry?.avatarUrl ?? profile.avatar_url,
        }
      }),
    )
  }

  const activeQueue: StoryAuthor[] | null =
    queue ??
    (deepLinked
      ? [{ id: profile.id, displayName: profile.display_name, avatarUrl: profile.avatar_url }]
      : null)

  const closeViewer = () => {
    setQueue(null)
    refreshRing()
    if (requested) router.setParams({ story: undefined })
  }

  const pickPhoto = async () => {
    haptic('tap')
    const result = await pickImage('library')
    if (result.status === 'picked') setPicked(result.uri)
  }

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="-mx-4"
        contentContainerClassName="px-4 pb-1"
      >
        <View style={{ width: ITEM_WIDTH + ITEM_GAP }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={publishing ? t('stories.publishing') : t('stories.yours')}
            onPress={() => {
              if (mine) {
                haptic('tap')
                openFrom(profile.id)
              } else void pickPhoto()
            }}
            style={{ width: ITEM_WIDTH }}
            className="items-center gap-1 active:opacity-80"
          >
            <SegmentedRing
              total={mine?.total ?? 0}
              unseen={mine?.total ?? 0}
              publishing={publishing}
              idle={!mine}
            >
              <Avatar
                name={profile.display_name}
                src={profile.avatar_url}
                size="lg"
                className={AVATAR_CLASS}
              />
            </SegmentedRing>
            <Text
              numberOfLines={1}
              className="w-full text-center text-xs text-text-muted dark:text-text-muted-dark"
            >
              {publishing ? t('stories.publishing') : t('stories.yours')}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('stories.addTitle')}
            onPress={() => void pickPhoto()}
            style={{
              position: 'absolute',
              top: ADD_OFFSET,
              left: ADD_OFFSET,
              width: ADD_ZONE,
              height: ADD_ZONE,
              padding: 4,
            }}
          >
            <View className="h-6 w-6 items-center justify-center rounded-full border-2 border-bg bg-brand dark:border-bg-dark">
              <Plus size={12} color="#fff" strokeWidth={3} />
            </View>
          </Pressable>
        </View>

        {others.map((entry) => (
          <View key={entry.authorId} style={{ marginRight: ITEM_GAP }}>
            <RingButton
              entry={entry}
              onOpen={() => {
                haptic('tap')
                openFrom(entry.authorId)
              }}
            />
          </View>
        ))}
      </ScrollView>

      {picked ? (
        <StoryComposer
          key={picked}
          uri={picked}
          couple={couple ?? null}
          onClose={() => setPicked(null)}
        />
      ) : null}

      {activeQueue ? (
        <StoryViewer
          key={activeQueue[0]?.id ?? 'none'}
          queue={activeQueue}
          onClose={closeViewer}
          onAddYours={() => {
            closeViewer()
            if (pickTimerRef.current) clearTimeout(pickTimerRef.current)
            pickTimerRef.current = setTimeout(() => void pickPhoto(), MODAL_SETTLE_MS)
          }}
        />
      ) : null}
    </>
  )
}

function RingButton({ entry, onOpen }: { entry: StoryRingEntry; onOpen: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={entry.displayName}
      onPress={onOpen}
      style={{ width: ITEM_WIDTH }}
      className="items-center gap-1 active:opacity-80"
    >
      <View>
        <SegmentedRing total={entry.total} unseen={entry.unseen}>
          <Avatar
            name={entry.displayName}
            src={entry.avatarUrl}
            size="lg"
            className={AVATAR_CLASS}
          />
        </SegmentedRing>
        {entry.isCouple ? (
          <View className="absolute bottom-0.5 right-0.5 h-5 w-5 items-center justify-center rounded-full border-2 border-bg bg-brand dark:border-bg-dark">
            <Heart size={10} color="#fff" fill="#fff" />
          </View>
        ) : null}
      </View>
      <Text
        numberOfLines={1}
        className={cn(
          'w-full text-center text-xs',
          entry.unseen > 0
            ? 'font-semibold text-text dark:text-text-dark'
            : 'text-text-muted dark:text-text-muted-dark',
        )}
      >
        {entry.displayName}
      </Text>
    </Pressable>
  )
}

function arc(startDeg: number, endDeg: number, radius: number, center: number): string {
  const toPoint = (deg: number) => {
    const rad = ((deg - 90) * Math.PI) / 180
    return `${center + radius * Math.cos(rad)} ${center + radius * Math.sin(rad)}`
  }
  const large = endDeg - startDeg > 180 ? 1 : 0
  return `M ${toPoint(startDeg)} A ${radius} ${radius} 0 ${large} 1 ${toPoint(endDeg)}`
}

function SpinningRing({ color }: { color: string }) {
  const rotation = useSharedValue(0)
  const center = RING_SIZE / 2
  const radius = center - RING_STROKE

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, { duration: 1400, easing: Easing.linear }),
      -1,
      false,
    )
    return () => cancelAnimation(rotation)
  }, [rotation])

  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }))

  return (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', inset: 0 }, style]}>
      <Svg width={RING_SIZE} height={RING_SIZE}>
        <Circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray="6 7"
        />
      </Svg>
    </Animated.View>
  )
}

function SegmentedRing({
  total,
  unseen,
  publishing = false,
  idle = false,
  children,
}: {
  total: number
  unseen: number
  publishing?: boolean
  idle?: boolean
  children: React.ReactNode
}) {
  const colors = useThemeColors()
  const center = RING_SIZE / 2
  const radius = center - RING_STROKE
  const count = Math.min(Math.max(total, 1), MAX_SEGMENTS)
  const gap = count > 1 ? SEGMENT_GAP_DEG : 0
  const span = 360 / count
  const seenCount = count - Math.min(unseen, count)

  return (
    <View
      className="items-center justify-center"
      style={{ width: RING_SIZE, height: RING_SIZE }}
    >
      {publishing ? (
        <SpinningRing color={colors.brand} />
      ) : idle ? null : (
        <View pointerEvents="none" style={{ position: 'absolute', inset: 0 }}>
          <Svg width={RING_SIZE} height={RING_SIZE}>
            {count === 1 ? (
              <Circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                strokeWidth={RING_STROKE}
                stroke={seenCount === 1 ? colors.borderStrong : colors.brand}
              />
            ) : (
              Array.from({ length: count }, (_, segment) => (
                <Path
                  key={segment}
                  d={arc(segment * span + gap / 2, (segment + 1) * span - gap / 2, radius, center)}
                  fill="none"
                  strokeWidth={RING_STROKE}
                  strokeLinecap="round"
                  stroke={segment < seenCount ? colors.borderStrong : colors.brand}
                />
              ))
            )}
          </Svg>
        </View>
      )}
      {children}
    </View>
  )
}
