import { useQueryClient } from '@tanstack/react-query'
import { Camera, Check, Flame, ImagePlus, Minus, Plus, Timer, Trash2, X } from 'lucide-react-native'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FlatList, Image, Platform, Pressable, RefreshControl, Text, View } from 'react-native'
import { Gesture, GestureDetector } from 'react-native-gesture-handler'
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOutUp,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'
import Svg, { Circle } from 'react-native-svg'

import AsyncStorage from '@react-native-async-storage/async-storage'
import { useLocalSearchParams } from 'expo-router'

import { ActivityGlyph } from '@/components/activities/activity-icon'
import { HealthSyncButton } from '@/components/activities/health-sync-button'
import { ActivityEditorSheet } from '@/components/activities/activity-editor-sheet'
import { QuickLogSheet } from '@/components/activities/quick-log-sheet'
import { Confetti } from '@/components/ui/confetti'
import { MilestoneSheet, STREAK_MILESTONES } from '@/components/profile/milestone-sheet'
import { Button, IconButton } from '@/components/ui/button'
import { TextArea } from '@/components/ui/field'
import { Sheet } from '@/components/ui/sheet'
import { TimePicker } from '@/components/ui/time-picker'
import { useToast } from '@/components/ui/toast'
import {
  ACTIVITY_HEX,
  SHADOW_TILE,
  useActivityHex,
  useActivityInk,
  useThemeColors,
  withTint,
  withTintStrong,
} from '@/constants/colors'
import { endTimerActivity, startTimerActivity } from '@/modules/live-activity'
import { useI18n } from '@/i18n/provider'
import { useActivityLabels } from '@/lib/activities/labels'
import { stepperIncrement, usesQuickLogSheet } from '@/lib/activities/input-modes'
import { computeStreak, computeWeeklyStreak } from '@/lib/activities/streaks'
import { uploadActivityPhoto } from '@/lib/api/storage'
import type { Activity } from '@/lib/api/types'
import { useAuth, useCurrentUserId, useTimeZone } from '@/lib/auth/provider'
import { useActiveActivities } from '@/lib/hooks/use-activities'
import { useAmountsByActivity, useCreateLog, useDatesByActivity, useDeleteLog, useHistorySummary, useRecentLogs, useTodayTotals, useWeekProgress } from '@/lib/hooks/use-logs'
import { formatElapsed, useClearSession, useSessionFor, useStartSession, useTicker } from '@/lib/hooks/use-sessions'
import { forgetHealthLog } from '@/lib/health'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { haptic } from '@/lib/utils/haptics'
import { pickImage, type PhotoSource } from '@/lib/utils/pick-image'
import { formatTime, todayKey, shiftDateKey, zonedDateTimeToIso } from '@/lib/utils/dates'

export default function TodayScreen() {
  const { t } = useI18n()
  const queryClient = useQueryClient()
  const brandColors = useThemeColors()
  const { profile } = useAuth()
  const userId = useCurrentUserId()
  const { showToast } = useToast()
  const { data: activities } = useActiveActivities()
  const { totals } = useTodayTotals()
  const weekProgress = useWeekProgress()
  const amountsBy = useAmountsByActivity()
  const datesByActivity = useDatesByActivity()
  const timeZone = useTimeZone()
  const createLog = useCreateLog()
  const deleteLog = useDeleteLog()
  const startSession = useStartSession()
  const clearSession = useClearSession()

  const [detailActivity, setDetailActivity] = useState<Activity | null>(null)
  const [quickActivity, setQuickActivity] = useState<Activity | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [celebrating, setCelebrating] = useState(false)
  const [milestone, setMilestone] = useState<number | null>(null)

  const refresh = async () => {
    setRefreshing(true)
    await queryClient.invalidateQueries({ queryKey: ['logs'] })
    await queryClient.invalidateQueries({ queryKey: ['activities'] })
    setRefreshing(false)
  }

  // Un acceso rapido del icono de la app puede pedir crear actividad.
  const { create } = useLocalSearchParams<{ create?: string }>()
  useEffect(() => {
    if (create === '1') setEditorOpen(true)
  }, [create])

  const quickSession = useSessionFor(quickActivity?.id ?? null)

  const today = todayKey(timeZone)
  const list = activities ?? []
  const todayCount = useMemo(
    () => [...totals.values()].reduce((sum, entry) => sum + entry.count, 0),
    [totals],
  )

  // Dia completo: todas las actividades con meta diaria o de check cumplidas.
  const dayComplete = useMemo(() => {
    const due = list.filter(
      (activity) =>
        activity.input_mode === 'check' ||
        (activity.daily_target !== null && activity.target_period === 'day'),
    )
    if (due.length === 0) return false
    return due.every((activity) => {
      const entry = totals.get(activity.id)
      if (activity.input_mode === 'check') return (entry?.count ?? 0) > 0
      return (entry?.amount ?? 0) >= (activity.daily_target ?? Infinity)
    })
  }, [list, totals])

  // Celebrar solo la transicion en vivo: abrir la app con el dia ya completo
  // no tira confetti.
  const [sawComplete, setSawComplete] = useState<boolean | null>(null)
  useEffect(() => {
    if (list.length === 0) return
    if (sawComplete === null) {
      setSawComplete(dayComplete)
      return
    }
    if (dayComplete && !sawComplete) {
      setSawComplete(true)
      setCelebrating(true)
      haptic('success')
      return
    }
    if (!dayComplete && sawComplete) setSawComplete(false)
  }, [dayComplete, sawComplete, list.length])

  // El temporizador que apaga el confetti vive aparte, colgado de `celebrating`.
  // Dentro del efecto de arriba no funcionaba: `setSawComplete(true)` cambiaba
  // una de sus dependencias, React ejecutaba la limpieza antes de volver a
  // correrlo y el clearTimeout mataba el temporizador en el mismo instante en
  // que se creaba. El confetti se quedaba puesto con sus 26 vistas animadas y,
  // como `celebrating` ya no volvia a false, no se disparaba nunca mas.
  useEffect(() => {
    if (!celebrating) return
    const timeout = setTimeout(() => setCelebrating(false), 2400)
    return () => clearTimeout(timeout)
  }, [celebrating])

  // Hitos de racha: al cruzar 7/30/100/365 se celebra una sola vez.
  const { allDates, today: streakToday } = useHistorySummary()
  const streak = useMemo(() => computeStreak(allDates, streakToday).current, [allDates, streakToday])
  useEffect(() => {
    if (!STREAK_MILESTONES.includes(streak)) return
    void AsyncStorage.getItem('gdm_milestone_seen').then((seen) => {
      if (Number(seen ?? 0) >= streak) return
      setMilestone(streak)
      void AsyncStorage.setItem('gdm_milestone_seen', String(streak))
    })
  }, [streak])

  // Registrar con deshacer, como la web: el toast trae el boton y borrar el
  // registro optimista lo revierte todo.
  const logWithUndo = (activity: Activity, options?: { amount?: number; note?: string | null; photoUrl?: string | null; loggedAt?: Date }) => {
    const logId = createLog.logActivity(activity, options)
    showToast(
      `${t('today.logged')} · ${activity.name}`,
      'success',
      logId && userId
        ? {
            label: t('today.undo'),
            onPress: () => {
              haptic('warning')
              deleteLog.mutate({ logId, userId, photoUrl: options?.photoUrl ?? null })
            },
          }
        : undefined,
    )
  }

  const onTileTap = (activity: Activity) => {
    if (usesQuickLogSheet(activity.input_mode)) {
      haptic('tap')
      setQuickActivity(activity)
    } else {
      haptic('success')
      logWithUndo(activity)
    }
  }

  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? t('today.greetingMorning') : hour < 19 ? t('today.greetingAfternoon') : t('today.greetingEvening')

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bg-dark" edges={['top']}>
      <FlatList
        data={list}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperClassName="gap-3 px-4"
        contentContainerClassName="gap-3 pb-8"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={brandColors.brand}
            colors={[brandColors.brand]}
          />
        }
        ListHeaderComponent={
          <View className="px-4 pb-2 pt-4">
            <Text className="text-2xl font-extrabold text-text dark:text-text-dark">
              {dayComplete
                ? t('today.dayComplete')
                : `${greeting}${profile ? `, ${profile.display_name.split(' ')[0]}` : ''}`}
            </Text>
            <Text className="mt-1 text-sm text-text-muted dark:text-text-muted-dark">
              {dayComplete
                ? t('today.dayCompleteSubtitle')
                : todayCount > 0
                  ? t('today.subtitleProgress', { count: todayCount })
                  : t('today.subtitleEmpty')}
            </Text>
            <Text className="mt-1 text-xs text-text-subtle dark:text-text-subtle-dark">
              {t('today.tapHint')}
            </Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <ActivityTile
            activity={item}
            todayTotal={totals.get(item.id)}
            weekTotal={weekProgress.totals.get(item.id) ?? 0}
            amounts={amountsBy.byActivity.get(item.id)}
            dates={datesByActivity.get(item.id)}
            today={today}
            index={index}
            onTap={() => onTileTap(item)}
            onLongPress={() => {
              haptic('tap')
              setDetailActivity(item)
            }}
          />
        )}
        ListEmptyComponent={
          <View className="items-center gap-2 px-8 pb-4 pt-10">
            <Text className="text-center text-lg font-bold text-text dark:text-text-dark">
              {t('today.emptyTitle')}
            </Text>
            <Text className="text-center text-sm text-text-muted dark:text-text-muted-dark">
              {t('today.emptyBody')}
            </Text>
            <View className="w-full pt-2">
              <Button
                title={t('today.createFirst')}
                fullWidth
                onPress={() => setEditorOpen(true)}
              />
            </View>
          </View>
        }
        ListFooterComponent={
          list.length > 0 ? (
            <View className="px-4 pt-2">
              <Button
                title={t('today.addActivity')}
                variant="secondary"
                fullWidth
                onPress={() => setEditorOpen(true)}
              />
            </View>
          ) : null
        }
      />

      <QuickLogSheet
        open={quickActivity !== null}
        activity={quickActivity}
        session={quickSession}
        onClose={() => setQuickActivity(null)}
        onLog={(amount) => {
          if (quickActivity) logWithUndo(quickActivity, { amount })
        }}
        onStartTimer={() => {
          if (quickActivity) {
            startSession.mutate(quickActivity.id)
            startTimerActivity(
              quickActivity.name,
              ACTIVITY_HEX[quickActivity.color]?.light ?? '#007EB6',
              new Date().toISOString(),
            )
          }
        }}
        onStopTimer={(elapsedMinutes) => {
          if (quickActivity) {
            logWithUndo(quickActivity, { amount: elapsedMinutes })
            clearSession.mutate(quickActivity.id)
            endTimerActivity()
          }
        }}
        onDiscardTimer={() => {
          if (quickActivity) {
            clearSession.mutate(quickActivity.id)
            endTimerActivity()
          }
        }}
      />

      <LogDetailSheet
        activity={detailActivity}
        onClose={() => setDetailActivity(null)}
        onSave={(activity, amount, dateKey, time, note, photoUrl) => {
          haptic('success')
          const loggedAt = new Date(zonedDateTimeToIso(dateKey, time, timeZone))
          logWithUndo(activity, { amount, note: note || null, photoUrl, loggedAt })
          setDetailActivity(null)
        }}
      />

      <ActivityEditorSheet open={editorOpen} onClose={() => setEditorOpen(false)} />

      <MilestoneSheet milestone={milestone} onClose={() => setMilestone(null)} />

      <Confetti visible={celebrating} />
    </SafeAreaView>
  )
}

const RING_RADIUS = 26
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS

const ACCESSIBILITY_ACTIONS = [
  { name: 'activate' as const },
  { name: 'longpress' as const },
]

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

function ActivityTile({
  activity,
  todayTotal,
  weekTotal,
  amounts,
  dates,
  today,
  index,
  onTap,
  onLongPress,
}: {
  activity: Activity
  todayTotal?: { amount: number; count: number }
  weekTotal: number
  amounts?: Map<string, number>
  dates?: Set<string>
  today: string
  index: number
  onTap: () => void
  onLongPress: () => void
}) {
  const { t } = useI18n()
  const { activityName, unitLabel } = useActivityLabels()
  const hex = useActivityHex(activity.color)
  const ink = useActivityInk(activity.color)

  const session = useSessionFor(activity.id)
  const running = Boolean(session)
  const now = useTicker(running)

  const [burst, setBurst] = useState<{ id: number; amount: number } | null>(null)

  // El +N se borra con un efecto y no con un setTimeout suelto dentro del
  // gesto: asi cada toque renueva su propio temporizador. Antes, dos toques
  // seguidos creaban dos, y el del primero borraba el +N del segundo a los
  // 900 ms de haber empezado el primero, no el segundo.
  useEffect(() => {
    if (!burst) return
    const timeout = setTimeout(() => setBurst(null), 900)
    return () => clearTimeout(timeout)
  }, [burst])

  const amount = todayTotal?.amount ?? 0
  const target = activity.daily_target
  const isCheck = activity.input_mode === 'check'
  const done = isCheck && amount > 0
  const isWeekly = activity.target_period === 'week'
  const periodTotal = isWeekly ? weekTotal : amount
  const progress = target ? Math.min(periodTotal / target, 1) : amount > 0 ? 1 : 0
  const goalReached = done || Boolean(target && periodTotal >= target)

  // El anillo no salta: amortigua hacia el nuevo progreso como en la web.
  const ringOffset = useSharedValue(RING_CIRCUMFERENCE * (1 - progress))
  useEffect(() => {
    ringOffset.value = withSpring(RING_CIRCUMFERENCE * (1 - progress), {
      stiffness: 220,
      damping: 28,
    })
  }, [progress, ringOffset])
  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: ringOffset.value }))

  const tap = () => {
    if (activity.input_mode === 'counter') {
      setBurst((current) => ({ id: (current?.id ?? 0) + 1, amount: activity.step }))
    }
    onTap()
  }

  // El toque y el mantener pulsado se reconocen en el hilo nativo. Con el
  // Pressable de React Native el temporizador del long-press vive en JS: justo
  // despues de registrar algo (o de sincronizar salud) el hilo esta ocupado
  // repintando la lista, el temporizador llega tarde y lo que se cuela es un
  // toque, o sea otro registro en vez de abrir el detalle.
  // La ref se actualiza en un efecto, no en el cuerpo: escribir durante el
  // render funciona hoy pero deja de estar garantizado en cuanto entra
  // StrictMode o el render concurrente.
  const handlers = useRef({ tap, long: onLongPress })
  useEffect(() => {
    handlers.current = { tap, long: onLongPress }
  })
  const fireTap = useCallback(() => handlers.current.tap(), [])
  const fireLongPress = useCallback(() => handlers.current.long(), [])

  const pressScale = useSharedValue(1)
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: pressScale.value }] }))

  const gesture = useMemo(() => {
    const longPress = Gesture.LongPress()
      .minDuration(300)
      .maxDistance(24)
      .onBegin(() => {
        'worklet'
        pressScale.value = withTiming(0.96, { duration: 90 })
      })
      .onStart(() => {
        'worklet'
        runOnJS(fireLongPress)()
      })
      .onFinalize(() => {
        'worklet'
        pressScale.value = withTiming(1, { duration: 120 })
      })

    const singleTap = Gesture.Tap()
      .maxDistance(16)
      .onEnd((_event, success) => {
        'worklet'
        if (success) runOnJS(fireTap)()
      })

    return Gesture.Exclusive(longPress, singleTap)
  }, [fireLongPress, fireTap, pressScale])

  // Meta semanal: la racha va en semanas cumplidas, como en la web.
  const streak = useMemo(() => {
    if (activity.target_period === 'week') {
      return computeWeeklyStreak(amounts ?? new Map(), activity.daily_target ?? 0, today)
    }
    return dates ? computeStreak(dates, today).current : 0
  }, [activity.target_period, activity.daily_target, amounts, dates, today])

  const summary = () => {
    if (running && session) return formatElapsed(session.started_at, now)
    if (isCheck) return done ? t('quickLog.doneToday') : t('quickLog.pendingToday')
    if (target) {
      return isWeekly
        ? t('today.ofWeeklyTarget', { current: periodTotal, target })
        : t('today.ofTarget', { current: amount, target })
    }
    return `${amount} ${unitLabel(activity.unit, amount)}`
  }

  return (
    <Animated.View
      entering={Platform.OS === 'ios' ? FadeIn.delay(Math.min(index, 8) * 40).duration(320) : undefined}
      className="flex-1"
    >
    <GestureDetector gesture={gesture}>
    <Animated.View
      collapsable={false}
      accessible
      accessibilityRole="button"
      accessibilityLabel={activity.name}
      accessibilityActions={ACCESSIBILITY_ACTIONS}
      onAccessibilityTap={fireTap}
      onAccessibilityAction={(event) => {
        if (event.nativeEvent.actionName === 'longpress') fireLongPress()
        else fireTap()
      }}
      style={[{ flex: 1 }, pressStyle]}
    >
    <View
      style={[
        SHADOW_TILE,
        goalReached ? { backgroundColor: withTint(hex), borderColor: 'transparent' } : null,
        running ? { borderColor: hex } : null,
      ]}
      className="relative mb-0 flex-1 gap-2 overflow-hidden rounded-3xl border border-border bg-surface p-3.5 dark:border-border-dark dark:bg-surface-dark"
    >
      <View className="flex-row items-start justify-between">
        <View className="h-16 w-16 items-center justify-center">
          <Svg viewBox="0 0 64 64" width={64} height={64} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
            <Circle
              cx={32}
              cy={32}
              r={RING_RADIUS}
              fill="none"
              strokeWidth={5}
              stroke={hex}
              opacity={0.2}
            />
            <AnimatedCircle
              cx={32}
              cy={32}
              r={RING_RADIUS}
              fill="none"
              strokeWidth={5}
              strokeLinecap="round"
              stroke={hex}
              strokeDasharray={`${RING_CIRCUMFERENCE}`}
              animatedProps={ringProps}
            />
          </Svg>
          <View
            className="h-[47px] w-[47px] items-center justify-center rounded-full"
            style={{ backgroundColor: done ? hex : withTintStrong(hex) }}
          >
            {done ? (
              <Check size={24} color="#fff" strokeWidth={3} />
            ) : (
              <ActivityGlyph icon={activity.icon} size={24} color={ink} />
            )}
          </View>
        </View>

        <View className="items-end gap-1">
          {running ? (
            <View
              className="flex-row items-center gap-1 rounded-full px-2 py-1"
              style={{ backgroundColor: withTint(hex) }}
            >
              <Timer size={14} color={ink} strokeWidth={3} />
              <Text className="text-[11px] font-bold" style={{ color: ink }}>
                {t('quickLog.timerRunning')}
              </Text>
            </View>
          ) : null}
          {streak > 1 ? (
            <View className="flex-row items-center gap-1 rounded-full bg-surface-sunken px-2 py-1 dark:bg-surface-sunken-dark">
              <Flame size={14} color="#F97316" strokeWidth={3} />
              <Text className="text-[11px] font-bold text-text-muted dark:text-text-muted-dark">
                {streak}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <View className="w-full">
        <Text className="text-[15px] font-bold text-text dark:text-text-dark" numberOfLines={1}>
          {activityName(activity.name)}
        </Text>
        <Text
          className={
            running
              ? 'mt-0.5 text-xs font-medium tabular-nums'
              : 'mt-0.5 text-xs font-medium text-text-muted dark:text-text-muted-dark'
          }
          style={running ? { color: hex } : undefined}
          numberOfLines={1}
        >
          {summary()}
        </Text>
      </View>

      {burst ? (
        <Animated.View
          key={burst.id}
          entering={FadeInDown.duration(150)}
          exiting={FadeOutUp.duration(450)}
          className="absolute bottom-4 right-4"
          pointerEvents="none"
        >
          <Text className="text-lg font-extrabold" style={{ color: hex }}>
            +{burst.amount}
          </Text>
        </Animated.View>
      ) : null}

      {goalReached ? (
        <View
          className="absolute bottom-0 left-0 right-0 h-1"
          style={{ backgroundColor: hex }}
        />
      ) : null}
    </View>
    </Animated.View>
    </GestureDetector>
    </Animated.View>
  )
}

function LogDetailSheet({
  activity,
  onClose,
  onSave,
}: {
  activity: Activity | null
  onClose: () => void
  onSave: (
    activity: Activity,
    amount: number,
    dateKey: string,
    time: string,
    note: string,
    photoUrl: string | null,
  ) => void
}) {
  const { t, locale } = useI18n()
  const { unitLabel } = useActivityLabels()
  const { showToast } = useToast()
  const colors = useThemeColors()
  const userId = useCurrentUserId()
  const timeZone = useTimeZone()
  const today = todayKey(timeZone)
  const yesterday = shiftDateKey(today, -1)
  const { data: recentLogs } = useRecentLogs()
  const removeLog = useDeleteLog()

  const [amount, setAmount] = useState(1)
  const [dateKey, setDateKey] = useState(today)
  const [time, setTime] = useState(nowAsTimeOfDay)
  const [note, setNote] = useState('')
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  // Esta hoja no se desmonta nunca (vive en el arbol de la pantalla y solo
  // devuelve null sin actividad), asi que todo lo del borrador anterior hay que
  // limpiarlo a mano, y en cada apertura, no solo al cambiar de actividad. La
  // hora entra aqui: si no, se queda la que se eligio en el registro anterior,
  // o peor, la de cuando se abrio la app.
  const session = activity?.id ?? 'closed'
  const [lastSession, setLastSession] = useState(session)
  if (session !== lastSession) {
    setLastSession(session)
    if (activity) {
      setAmount(activity.step)
      setDateKey(today)
      setTime(nowAsTimeOfDay())
      setShowTimePicker(false)
      setNote('')
      setPhotoUri(null)
    }
  }

  if (!activity) return null

  const increment = stepperIncrement(activity.unit, activity.input_mode, activity.step)

  const pickPhoto = async (source: PhotoSource) => {
    const result = await pickImage(source)
    if (result.status === 'denied') {
      showToast(t('log.cameraDenied'), 'error')
      return
    }
    if (result.status === 'picked') setPhotoUri(result.uri)
  }

  const save = async () => {
    let photoPath: string | null = null
    if (photoUri && userId) {
      setUploading(true)
      try {
        photoPath = await uploadActivityPhoto(
          getSupabaseBrowserClient(),
          userId,
          activity.id,
          photoUri,
        )
      } catch {
        showToast(t('common.genericError'), 'error')
        setUploading(false)
        return
      }
      setUploading(false)
    }
    onSave(activity, amount, dateKey, time, note.trim(), photoPath)
  }

  return (
    <Sheet
      open={activity !== null}
      onClose={onClose}
      title={activity.name}
      description={unitLabel(activity.unit, 2)}
      closeLabel={t('common.close')}
      footer={
        <Button
          title={uploading ? t('common.saving') : t('common.save')}
          size="lg"
          fullWidth
          loading={uploading}
          onPress={() => void save()}
        />
      }
    >
      <View className="gap-5 pt-2">
        <HealthSyncButton activityId={activity.id} />

        <View className="flex-row items-center justify-between rounded-2xl bg-surface-sunken p-3 dark:bg-surface-sunken-dark">
          <IconButton
            label="-"
            onPress={() => {
              haptic('tap')
              setAmount((value) => Math.max(1, value - increment))
            }}
            className="bg-surface dark:bg-surface-dark"
          >
            <Minus size={20} color={colors.text} />
          </IconButton>
          <View className="items-center">
            <Text className="text-3xl font-extrabold text-brand dark:text-brand-dark">{amount}</Text>
            <Text className="text-xs font-semibold text-text-muted dark:text-text-muted-dark">
              {unitLabel(activity.unit, amount)}
            </Text>
          </View>
          <IconButton
            label="+"
            onPress={() => {
              haptic('tap')
              setAmount((value) => value + increment)
            }}
            className="bg-surface dark:bg-surface-dark"
          >
            <Plus size={20} color={colors.text} />
          </IconButton>
        </View>

        <View className="gap-2">
          <Text className="px-1 text-sm font-bold text-text-muted dark:text-text-muted-dark">
            {t('log.whenLabel')}
          </Text>
          <View className="flex-row gap-2">
            <DayChip label={t('common.today')} selected={dateKey === today} onPress={() => setDateKey(today)} />
            <DayChip
              label={t('common.yesterday')}
              selected={dateKey === yesterday}
              onPress={() => setDateKey(yesterday)}
            />
            <DayChip
              label={time}
              selected={showTimePicker}
              onPress={() => setShowTimePicker((current) => !current)}
            />
          </View>
          {showTimePicker ? (
            <TimePicker
              value={timeOfDayToDate(time)}
              onChange={(selected) => setTime(dateToTimeOfDay(selected))}
              onClose={() => setShowTimePicker(false)}
            />
          ) : null}
        </View>

        <View className="gap-2">
          <Text className="px-1 text-sm font-bold text-text-muted dark:text-text-muted-dark">
            {t('log.photoLabel')} ({t('common.optional')})
          </Text>
          {photoUri ? (
            <View className="overflow-hidden rounded-2xl">
              <Image source={{ uri: photoUri }} className="aspect-video w-full" resizeMode="cover" />
              <View className="absolute right-2 top-2">
                <IconButton
                  label={t('log.removePhoto')}
                  onPress={() => setPhotoUri(null)}
                  className="h-9 w-9 bg-black/55"
                >
                  <X size={16} color="#fff" />
                </IconButton>
              </View>
            </View>
          ) : (
            <View className="flex-row gap-2">
              <PhotoSourceButton
                label={t('log.sourceCamera')}
                icon={<Camera size={18} color={colors.textMuted} />}
                onPress={() => void pickPhoto('camera')}
              />
              <PhotoSourceButton
                label={t('log.sourceLibrary')}
                icon={<ImagePlus size={18} color={colors.textMuted} />}
                onPress={() => void pickPhoto('library')}
              />
            </View>
          )}
        </View>

        <TextArea
          label={`${t('log.noteLabel')} (${t('common.optional')})`}
          placeholder={t('log.notePlaceholder')}
          value={note}
          maxLength={280}
          onChangeText={setNote}
        />

        <View className="gap-2">
          <Text className="px-1 text-sm font-bold text-text-muted dark:text-text-muted-dark">
            {t('log.historyTitle')}
          </Text>
          {(recentLogs ?? []).filter(
            (log) => log.activity_id === activity.id && log.local_date === today,
          ).length === 0 ? (
            <Text className="rounded-2xl bg-surface-sunken px-4 py-5 text-center text-sm text-text-muted dark:bg-surface-sunken-dark dark:text-text-muted-dark">
              {t('log.historyEmpty')}
            </Text>
          ) : (
            (recentLogs ?? [])
              .filter((log) => log.activity_id === activity.id && log.local_date === today)
              .map((log) => (
                <View
                  key={log.id}
                  className="flex-row items-center gap-3 rounded-2xl bg-surface-sunken px-3.5 py-2.5 dark:bg-surface-sunken-dark"
                >
                  <View className="min-w-0 flex-1">
                    <Text className="text-sm font-bold text-text dark:text-text-dark">
                      +{log.amount} {unitLabel(activity.unit, log.amount)}
                    </Text>
                    <Text
                      className="text-xs text-text-muted dark:text-text-muted-dark"
                      numberOfLines={1}
                    >
                      {formatTime(new Date(log.logged_at), locale, timeZone)}
                      {log.note ? ` · ${log.note}` : ''}
                    </Text>
                  </View>
                  <IconButton
                    label={t('log.deleteLog')}
                    onPress={() => {
                      if (!userId) return
                      haptic('warning')
                      // Si el registro lo puso la salud hay que decirselo, o la
                      // siguiente sincronizacion lo vuelve a crear y parece que
                      // la papelera no hace nada.
                      void forgetHealthLog(log.id)
                      removeLog.mutate({ logId: log.id, userId, photoUrl: log.photo_url })
                    }}
                  >
                    <Trash2 size={16} color={colors.danger} />
                  </IconButton>
                </View>
              ))
          )}
        </View>
      </View>
    </Sheet>
  )
}

function PhotoSourceButton({
  label,
  icon,
  onPress,
}: {
  label: string
  icon: React.ReactNode
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="h-12 flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-surface-sunken dark:border-border-dark dark:bg-surface-sunken-dark"
    >
      {icon}
      <Text
        className="text-sm font-bold text-text-muted dark:text-text-muted-dark"
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  )
}

// La hora del registro se guarda como "HH:mm" en la zona del perfil; el picker
// trabaja con Date, asi que se envuelve en un dia cualquiera para ir y volver.
function nowAsTimeOfDay(): string {
  return dateToTimeOfDay(new Date())
}

function dateToTimeOfDay(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function timeOfDayToDate(time: string): Date {
  const [hours, minutes] = time.split(':').map(Number)
  return new Date(2000, 0, 1, Number.isFinite(hours) ? hours : 0, Number.isFinite(minutes) ? minutes : 0)
}

function DayChip({
  label,
  selected,
  onPress,
}: {
  label: string
  selected: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={
        selected
          ? 'h-11 flex-1 items-center justify-center rounded-2xl border border-brand bg-brand-soft dark:bg-brand-soft-dark'
          : 'h-11 flex-1 items-center justify-center rounded-2xl border border-border bg-surface-sunken dark:border-border-dark dark:bg-surface-sunken-dark'
      }
    >
      <Text
        className={
          selected
            ? 'text-sm font-semibold text-brand dark:text-brand-dark'
            : 'text-sm font-semibold text-text-muted dark:text-text-muted-dark'
        }
      >
        {label}
      </Text>
    </Pressable>
  )
}
