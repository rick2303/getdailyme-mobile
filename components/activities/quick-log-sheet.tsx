import { Play, Square, Timer, X } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import { HealthSyncButton } from '@/components/activities/health-sync-button'
import { LogMeter } from '@/components/activities/log-meter'
import { Button } from '@/components/ui/button'
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

// El quick log de la web: el medidor, atajos que eligen la cifra, un unico
// boton para registrar y el cronometro para las actividades de duracion.
export function QuickLogSheet({
  open,
  activity,
  session,
  onClose,
  onLog,
  onStartTimer,
  onStopTimer,
  onDiscardTimer,
  periodTotal = 0,
}: {
  open: boolean
  activity: Activity | null
  session: ActiveSession | null
  onClose: () => void
  onLog: (amount: number) => void
  onStartTimer: () => void
  onStopTimer: (elapsedMinutes: number) => void
  onDiscardTimer: () => void
  // Lo que cuenta para la meta: el dia, o la semana si la meta es semanal.
  periodTotal?: number
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
      closeLabel={t('common.close')}
    >
      <View className="gap-5 pt-1">
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
            {/* La hoja gira alrededor del medidor: lo que llevas y lo que vas a
                sumar en la propia pieza. Los atajos solo eligen la cifra y hay
                un unico boton que dice exactamente que se registra. */}
            <LogMeter
              activity={activity}
              total={periodTotal}
              adding={custom}
              step={increment}
              onChange={setCustom}
            />

            <View className="flex-row flex-wrap justify-center gap-2">
              {presets.map((value) => {
                const selected = custom === value
                return (
                  <Pressable
                    key={value}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${value} ${unitLabel(activity.unit, value)}`}
                    onPress={() => {
                      haptic('tap')
                      setCustom(value)
                    }}
                    className="h-11 min-w-16 items-center justify-center rounded-full px-4 active:scale-95"
                    style={{ backgroundColor: selected ? hex : withTint(hex) }}
                  >
                    <Text
                      maxFontSizeMultiplier={1.2}
                      className="text-[17px] font-bold"
                      style={{ color: selected ? '#fff' : hex, fontVariant: ['tabular-nums'] }}
                    >
                      {value}
                    </Text>
                  </Pressable>
                )
              })}
            </View>

            <View className="gap-1">
              <Button
                title={t('quickLog.addAmount', { amount: custom, unit: unitLabel(activity.unit, custom) })}
                size="lg"
                fullWidth
                onPress={() => logAndClose(custom)}
              />

              {supportsTimer(activity.input_mode) ? (
                <Button
                  title={t('quickLog.startTimer')}
                  variant="ghost"
                  fullWidth
                  icon={<Play size={16} color={colors.textMuted} />}
                  onPress={() => {
                    haptic('success')
                    onStartTimer()
                  }}
                />
              ) : null}
            </View>
          </>
        )}
      </View>
    </Sheet>
  )
}
