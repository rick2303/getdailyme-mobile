import DateTimePicker from '@react-native-community/datetimepicker'
import * as ImagePicker from 'expo-image-picker'
import { Flame, ImagePlus, Minus, Plus, Timer, X } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { FlatList, Image, Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ActivityIcon } from '@/components/activities/activity-icon'
import { ActivityEditorSheet } from '@/components/activities/activity-editor-sheet'
import { QuickLogSheet } from '@/components/activities/quick-log-sheet'
import { Button, IconButton } from '@/components/ui/button'
import { TextArea } from '@/components/ui/field'
import { Sheet } from '@/components/ui/sheet'
import { useToast } from '@/components/ui/toast'
import { useThemeColors } from '@/constants/colors'
import { useI18n } from '@/i18n/provider'
import { useActivityLabels } from '@/lib/activities/labels'
import { stepperIncrement, usesQuickLogSheet } from '@/lib/activities/input-modes'
import { computeStreak } from '@/lib/activities/streaks'
import { uploadActivityPhoto } from '@/lib/api/storage'
import type { Activity } from '@/lib/api/types'
import { useAuth, useCurrentUserId, useTimeZone } from '@/lib/auth/provider'
import { useActiveActivities } from '@/lib/hooks/use-activities'
import { useCreateLog, useDatesByActivity, useDeleteLog, useTodayTotals } from '@/lib/hooks/use-logs'
import { useClearSession, useSessionFor, useStartSession } from '@/lib/hooks/use-sessions'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { haptic } from '@/lib/utils/haptics'
import { todayKey, shiftDateKey, zonedDateTimeToIso } from '@/lib/utils/dates'

export default function TodayScreen() {
  const { t } = useI18n()
  const { profile } = useAuth()
  const userId = useCurrentUserId()
  const { showToast } = useToast()
  const { data: activities } = useActiveActivities()
  const { totals } = useTodayTotals()
  const datesByActivity = useDatesByActivity()
  const timeZone = useTimeZone()
  const createLog = useCreateLog()
  const deleteLog = useDeleteLog()
  const startSession = useStartSession()
  const clearSession = useClearSession()

  const [detailActivity, setDetailActivity] = useState<Activity | null>(null)
  const [quickActivity, setQuickActivity] = useState<Activity | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)

  const quickSession = useSessionFor(quickActivity?.id ?? null)

  const today = todayKey(timeZone)
  const list = activities ?? []
  const todayCount = useMemo(
    () => [...totals.values()].reduce((sum, entry) => sum + entry.count, 0),
    [totals],
  )

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
        ListHeaderComponent={
          <View className="px-4 pb-2 pt-4">
            <Text className="text-2xl font-extrabold text-text dark:text-text-dark">
              {greeting}
              {profile ? `, ${profile.display_name.split(' ')[0]}` : ''}
            </Text>
            <Text className="mt-1 text-sm text-text-muted dark:text-text-muted-dark">
              {todayCount > 0
                ? t('today.subtitleProgress', { count: todayCount })
                : t('today.subtitleEmpty')}
            </Text>
            <Text className="mt-1 text-xs text-text-subtle dark:text-text-subtle-dark">
              {t('today.tapHint')}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <ActivityTile
            activity={item}
            todayTotal={totals.get(item.id)}
            dates={datesByActivity.get(item.id)}
            today={today}
            onTap={() => onTileTap(item)}
            onLongPress={() => {
              haptic('tap')
              setDetailActivity(item)
            }}
          />
        )}
        ListFooterComponent={
          <View className="px-4 pt-2">
            <Button
              title={t('today.addActivity')}
              variant="secondary"
              fullWidth
              onPress={() => setEditorOpen(true)}
            />
          </View>
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
          if (quickActivity) startSession.mutate(quickActivity.id)
        }}
        onStopTimer={(elapsedMinutes) => {
          if (quickActivity) {
            logWithUndo(quickActivity, { amount: elapsedMinutes })
            clearSession.mutate(quickActivity.id)
          }
        }}
        onDiscardTimer={() => {
          if (quickActivity) clearSession.mutate(quickActivity.id)
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
    </SafeAreaView>
  )
}

function ActivityTile({
  activity,
  todayTotal,
  dates,
  today,
  onTap,
  onLongPress,
}: {
  activity: Activity
  todayTotal?: { amount: number; count: number }
  dates?: Set<string>
  today: string
  onTap: () => void
  onLongPress: () => void
}) {
  const { t } = useI18n()
  const { unitLabel } = useActivityLabels()
  const colors = useThemeColors()

  const amount = todayTotal?.amount ?? 0
  const target = activity.daily_target
  const reached = target !== null && amount >= target
  const streak = useMemo(
    () => (dates ? computeStreak(dates, today).current : 0),
    [dates, today],
  )

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={activity.name}
      onPress={onTap}
      onLongPress={onLongPress}
      delayLongPress={350}
      className="mb-0 flex-1 gap-3 rounded-3xl border border-border bg-surface p-4 active:opacity-80 dark:border-border-dark dark:bg-surface-dark"
    >
      <View className="flex-row items-start justify-between">
        <ActivityIcon icon={activity.icon} color={activity.color} size="sm" />
        <View className="flex-row items-center gap-1.5">
          {usesQuickLogSheet(activity.input_mode) ? (
            <Timer size={13} color={colors.textSubtle} />
          ) : null}
          {streak > 0 ? (
            <View className="flex-row items-center gap-1">
              <Flame size={14} color={colors.brand} />
              <Text className="text-xs font-bold text-brand dark:text-brand-dark">{streak}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <View>
        <Text className="text-[15px] font-bold text-text dark:text-text-dark" numberOfLines={1}>
          {activity.name}
        </Text>
        <Text className="mt-0.5 text-xs text-text-muted dark:text-text-muted-dark" numberOfLines={1}>
          {target !== null
            ? reached
              ? t('today.goalReached')
              : t('today.ofTarget', { current: amount, target })
            : `${amount} ${unitLabel(activity.unit, amount)}`}
        </Text>
      </View>

      {target !== null ? (
        <View className="h-1.5 overflow-hidden rounded-full bg-surface-sunken dark:bg-surface-sunken-dark">
          <View
            className={reached ? 'h-full rounded-full bg-success' : 'h-full rounded-full bg-brand'}
            style={{ width: `${Math.min(100, Math.round((amount / target) * 100))}%` }}
          />
        </View>
      ) : null}
    </Pressable>
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
  const { t } = useI18n()
  const { unitLabel } = useActivityLabels()
  const { showToast } = useToast()
  const colors = useThemeColors()
  const userId = useCurrentUserId()
  const timeZone = useTimeZone()
  const today = todayKey(timeZone)
  const yesterday = shiftDateKey(today, -1)

  const [amount, setAmount] = useState(1)
  const [dateKey, setDateKey] = useState(today)
  const [time, setTime] = useState(() => {
    const now = new Date()
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  })
  const [note, setNote] = useState('')
  const [showTimePicker, setShowTimePicker] = useState(false)
  const [photoUri, setPhotoUri] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const [lastActivityId, setLastActivityId] = useState<string | null>(null)
  if (activity && activity.id !== lastActivityId) {
    setLastActivityId(activity.id)
    setAmount(activity.step)
    setDateKey(today)
    setNote('')
    setPhotoUri(null)
  }

  if (!activity) return null

  const increment = stepperIncrement(activity.unit, activity.input_mode, activity.step)

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      quality: 1,
    })
    if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri)
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
            <DayChip label={time} selected={false} onPress={() => setShowTimePicker(true)} />
          </View>
          {showTimePicker ? (
            <DateTimePicker
              value={new Date(`2000-01-01T${time}:00`)}
              mode="time"
              onChange={(_event, selected) => {
                setShowTimePicker(false)
                if (selected) {
                  setTime(
                    `${String(selected.getHours()).padStart(2, '0')}:${String(
                      selected.getMinutes(),
                    ).padStart(2, '0')}`,
                  )
                }
              }}
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
            <Pressable
              accessibilityRole="button"
              onPress={() => void pickPhoto()}
              className="h-12 flex-row items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-surface-sunken dark:border-border-dark dark:bg-surface-sunken-dark"
            >
              <ImagePlus size={18} color={colors.textMuted} />
              <Text className="text-sm font-bold text-text-muted dark:text-text-muted-dark">
                {t('log.addPhoto')}
              </Text>
            </Pressable>
          )}
        </View>

        <TextArea
          label={`${t('log.noteLabel')} (${t('common.optional')})`}
          placeholder={t('log.notePlaceholder')}
          value={note}
          maxLength={280}
          onChangeText={setNote}
        />
      </View>
    </Sheet>
  )
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
