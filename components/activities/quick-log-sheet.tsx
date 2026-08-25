import { Minus, Play, Plus, Square, Timer, X } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import { ActivityIcon } from '@/components/activities/activity-icon'
import { HealthSyncButton } from '@/components/activities/health-sync-button'
import { Button, IconButton } from '@/components/ui/button'
import { Sheet } from '@/components/ui/sheet'
import { useActivityHex, useThemeColors, withTint } from '@/constants/colors'
import { useI18n } from '@/i18n/provider'
import { useActivityLabels } from '@/lib/activities/labels'
import { resolveQuickValues, stepperIncrement, supportsTimer } from '@/lib/activities/input-modes'
import type { ActiveSession, Activity } from '@/lib/api/types'
import { useTimeZone } from '@/lib/auth/provider'
import { formatElapsed, useTicker } from '@/lib/hooks/use-sessions'
import { formatTime } from '@/lib/utils/dates'
import { haptic } from '@/lib/utils/haptics'

// El quick log de la web: presets de un toque, cantidad con stepper y el
// cronometro para las actividades de duracion.
export function QuickLogSheet({
  open,
  activity,
  session,
  onClose,
  onLog,
  onStartTimer,
  onStopTimer,
  onDiscardTimer,
}: {
  open: boolean
  activity: Activity | null
  session: ActiveSession | null
  onClose: () => void
  onLog: (amount: number) => void
  onStartTimer: () => void
  onStopTimer: (elapsedMinutes: number) => void
  onDiscardTimer: () => void
}) {
  const { t, locale } = useI18n()
  const { activityName, unitLabel } = useActivityLabels()
  const colors = useThemeColors()
  const timeZone = useTimeZone()
  const hex = useActivityHex(activity?.color ?? 'blue')

  const increment = activity
    ? stepperIncrement(activity.unit, activity.input_mode, activity.step)
    : 1
  const [custom, setCustom] = useState(increment)
  const [lastActivityId, setLastActivityId] = useState<string | null>(null)

  const running = Boolean(session)
  const now = useTicker(open && running)

  if (activity && activity.id !== lastActivityId) {
    setLastActivityId(activity.id)
    setCustom(increment)
  }

  if (!activity) return null

  const presets = resolveQuickValues(activity.quick_values, activity.unit)
  const elapsedMinutes = session
    ? Math.max(1, Math.floor((now - new Date(session.started_at).getTime()) / 60_000))
    : 0

  const logAndClose = (amount: number) => {
    haptic('success')
    onLog(amount)
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={activityName(activity.name)}
      description={unitLabel(activity.unit, 2)}
      closeLabel={t('common.close')}
    >
      <View className="gap-5 pt-1">
        <View className="flex-row items-center gap-3">
          <ActivityIcon icon={activity.icon} color={activity.color} size="md" />
          {activity.daily_target ? (
            <Text className="text-sm text-text-muted dark:text-text-muted-dark">
              {t('activity.targetLabel')}: {activity.daily_target}{' '}
              {unitLabel(activity.unit, activity.daily_target)}
            </Text>
          ) : null}
        </View>

        <HealthSyncButton activityId={activity.id} />

        {running && session ? (
          <View
            className="items-center gap-2 rounded-3xl px-4 py-6"
            style={{ backgroundColor: withTint(hex) }}
          >
            <View className="flex-row items-center gap-2">
              <Timer size={16} color={hex} />
              <Text className="text-sm font-bold" style={{ color: hex }}>
                {t('quickLog.timerRunning')}
              </Text>
            </View>
            <Text className="font-mono text-4xl font-extrabold" style={{ color: hex }}>
              {formatElapsed(session.started_at, now)}
            </Text>
            <Text className="text-xs text-text-muted dark:text-text-muted-dark">
              {t('quickLog.timerStarted', {
                time: formatTime(new Date(session.started_at), locale, timeZone),
              })}
            </Text>
            <View className="mt-2 w-full gap-2">
              <Button
                title={t('quickLog.stopTimer')}
                size="lg"
                fullWidth
                icon={<Square size={18} color="#fff" />}
                onPress={() => {
                  haptic('success')
                  onStopTimer(elapsedMinutes)
                  onClose()
                }}
              />
              <Button
                title={t('quickLog.discardTimer')}
                variant="ghost"
                fullWidth
                icon={<X size={16} color={colors.textMuted} />}
                onPress={() => {
                  haptic('warning')
                  onDiscardTimer()
                }}
              />
            </View>
          </View>
        ) : (
          <>
            <View className="gap-2">
              <Text className="px-1 text-sm font-bold text-text-muted dark:text-text-muted-dark">
                {t('quickLog.presets')}
              </Text>
              <View className="flex-row flex-wrap gap-2.5">
                {presets.map((value) => (
                  <Pressable
                    key={value}
                    accessibilityRole="button"
                    onPress={() => logAndClose(value)}
                    className="h-16 min-w-[47%] flex-1 items-center justify-center rounded-2xl active:opacity-70"
                    style={({ pressed }) => [
                      { backgroundColor: withTint(hex) },
                      pressed ? { transform: [{ scale: 0.95 }] } : null,
                    ]}
                  >
                    <Text maxFontSizeMultiplier={1.2} className="text-xl font-extrabold" style={{ color: hex }}>
                      {value}
                    </Text>
                    <Text maxFontSizeMultiplier={1.2} className="text-xs font-semibold opacity-80" style={{ color: hex }}>
                      {unitLabel(activity.unit, value)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View className="gap-2">
              <Text className="px-1 text-sm font-bold text-text-muted dark:text-text-muted-dark">
                {t('quickLog.custom')}
              </Text>
              <View className="flex-row items-center justify-between rounded-2xl bg-surface-sunken p-3 dark:bg-surface-sunken-dark">
                <IconButton
                  label="-"
                  onPress={() => {
                    haptic('tap')
                    setCustom((value) => Math.max(1, value - increment))
                  }}
                  className="bg-surface dark:bg-surface-dark"
                >
                  <Minus size={20} color={colors.text} />
                </IconButton>
                <View className="items-center">
                  <Text className="text-3xl font-extrabold" style={{ color: hex }}>
                    {custom}
                  </Text>
                  <Text className="text-xs font-semibold text-text-muted dark:text-text-muted-dark">
                    {unitLabel(activity.unit, custom)}
                  </Text>
                </View>
                <IconButton
                  label="+"
                  onPress={() => {
                    haptic('tap')
                    setCustom((value) => value + increment)
                  }}
                  className="bg-surface dark:bg-surface-dark"
                >
                  <Plus size={20} color={colors.text} />
                </IconButton>
              </View>
              <Button title={t('quickLog.add')} size="lg" fullWidth onPress={() => logAndClose(custom)} />
            </View>

            {supportsTimer(activity.input_mode) ? (
              <Button
                title={t('quickLog.startTimer')}
                variant="secondary"
                size="lg"
                fullWidth
                icon={<Play size={18} color={colors.text} />}
                onPress={() => {
                  haptic('success')
                  onStartTimer()
                }}
              />
            ) : null}
          </>
        )}
      </View>
    </Sheet>
  )
}
