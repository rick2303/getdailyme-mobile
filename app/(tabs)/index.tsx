import DateTimePicker from '@react-native-community/datetimepicker'
import { Flame, Minus, Plus } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { FlatList, Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ActivityIcon } from '@/components/activities/activity-icon'
import { ActivityEditorSheet } from '@/components/activities/activity-editor-sheet'
import { Button, IconButton } from '@/components/ui/button'
import { TextArea } from '@/components/ui/field'
import { Sheet } from '@/components/ui/sheet'
import { useToast } from '@/components/ui/toast'
import { useThemeColors } from '@/constants/colors'
import { useI18n } from '@/i18n/provider'
import { useActivityLabels } from '@/lib/activities/labels'
import { stepperIncrement } from '@/lib/activities/input-modes'
import { computeStreak } from '@/lib/activities/streaks'
import type { Activity } from '@/lib/api/types'
import { useAuth, useTimeZone } from '@/lib/auth/provider'
import { useActiveActivities } from '@/lib/hooks/use-activities'
import { useCreateLog, useDatesByActivity, useDeleteLog, useTodayTotals } from '@/lib/hooks/use-logs'
import { haptic } from '@/lib/utils/haptics'
import { todayKey, shiftDateKey, zonedDateTimeToIso } from '@/lib/utils/dates'

export default function TodayScreen() {
  const { t } = useI18n()
  const { profile } = useAuth()
  const { showToast } = useToast()
  const { data: activities } = useActiveActivities()
  const { totals } = useTodayTotals()
  const datesByActivity = useDatesByActivity()
  const timeZone = useTimeZone()
  const createLog = useCreateLog()
  const deleteLog = useDeleteLog()

  const [detailActivity, setDetailActivity] = useState<Activity | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)

  const today = todayKey(timeZone)
  const list = activities ?? []
  const todayCount = useMemo(
    () => [...totals.values()].reduce((sum, entry) => sum + entry.count, 0),
    [totals],
  )

  const quickLog = (activity: Activity) => {
    haptic('success')
    const logId = createLog.logActivity(activity)
    showToast(`${t('today.logged')} · ${activity.name}`, 'success')
    void logId
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
          </View>
        }
        renderItem={({ item }) => (
          <ActivityTile
            activity={item}
            todayTotal={totals.get(item.id)}
            dates={datesByActivity.get(item.id)}
            today={today}
            onTap={() => quickLog(item)}
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

      <LogDetailSheet
        activity={detailActivity}
        onClose={() => setDetailActivity(null)}
        onSave={(activity, amount, dateKey, time, note) => {
          haptic('success')
          const loggedAt = new Date(zonedDateTimeToIso(dateKey, time, timeZone))
          createLog.logActivity(activity, { amount, note: note || null, loggedAt })
          showToast(t('today.logged'), 'success')
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
        {streak > 0 ? (
          <View className="flex-row items-center gap-1">
            <Flame size={14} color={colors.brand} />
            <Text className="text-xs font-bold text-brand dark:text-brand-dark">{streak}</Text>
          </View>
        ) : null}
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
  onSave: (activity: Activity, amount: number, dateKey: string, time: string, note: string) => void
}) {
  const { t } = useI18n()
  const { unitLabel } = useActivityLabels()
  const colors = useThemeColors()
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

  const [lastActivityId, setLastActivityId] = useState<string | null>(null)
  if (activity && activity.id !== lastActivityId) {
    setLastActivityId(activity.id)
    setAmount(activity.step)
    setDateKey(today)
    setNote('')
  }

  if (!activity) return null

  const increment = stepperIncrement(activity.unit, activity.input_mode, activity.step)

  return (
    <Sheet
      open={activity !== null}
      onClose={onClose}
      title={activity.name}
      description={unitLabel(activity.unit, 2)}
      closeLabel={t('common.close')}
      footer={
        <Button
          title={t('common.save')}
          size="lg"
          fullWidth
          onPress={() => onSave(activity, amount, dateKey, time, note.trim())}
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
            <DayChip
              label={t('common.today')}
              selected={dateKey === today}
              onPress={() => setDateKey(today)}
            />
            <DayChip
              label={t('common.yesterday')}
              selected={dateKey === yesterday}
              onPress={() => setDateKey(yesterday)}
            />
            <DayChip
              label={time}
              selected={false}
              onPress={() => setShowTimePicker(true)}
            />
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
