import { Check, Footprints, HeartPulse, Moon, Zap } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import { ActivityIcon } from '@/components/activities/activity-icon'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { useThemeColors } from '@/constants/colors'
import { useI18n } from '@/i18n/provider'
import {
  HEALTH_METRICS,
  isHealthConnected,
  loadHealthLinks,
  requestHealthPermissions,
  saveHealthLinks,
  syncHealthToLogs,
  type HealthLinks,
  type HealthMetric,
} from '@/lib/health'
import { useAuth, useCurrentUserId, useTimeZone } from '@/lib/auth/provider'
import { useActiveActivities } from '@/lib/hooks/use-activities'
import { useQueryClient } from '@tanstack/react-query'

// Conectar la salud del telefono: cada metrica se vincula a una actividad y
// de ahi en adelante se registra sola al abrir la app.
const METRIC_ICONS: Record<HealthMetric, typeof Footprints> = {
  steps: Footprints,
  exercise: Zap,
  sleep: Moon,
}

export function HealthSection() {
  const { t } = useI18n()
  const { showToast } = useToast()
  const colors = useThemeColors()
  const userId = useCurrentUserId()
  const timeZone = useTimeZone()
  const queryClient = useQueryClient()
  const { data: activities } = useActiveActivities()
  useAuth()

  const [connected, setConnected] = useState(false)
  const [links, setLinks] = useState<HealthLinks>({})
  const [picking, setPicking] = useState<HealthMetric | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void isHealthConnected().then(setConnected)
    void loadHealthLinks().then(setLinks)
  }, [])

  const connect = async () => {
    setBusy(true)
    const granted = await requestHealthPermissions()
    setBusy(false)
    if (granted) {
      setConnected(true)
      showToast(t('health.connected'), 'success')
    } else {
      showToast(t('health.unavailable'), 'error')
    }
  }

  const link = (metric: HealthMetric, activityId: string | null) => {
    const next = { ...links }
    if (activityId) next[metric] = activityId
    else delete next[metric]
    setLinks(next)
    setPicking(null)
    void saveHealthLinks(next)
  }

  const syncNow = async () => {
    if (!userId) return
    setBusy(true)
    const changes = await syncHealthToLogs(userId, timeZone)
    setBusy(false)
    await queryClient.invalidateQueries({ queryKey: ['logs'] })
    showToast(changes > 0 ? t('health.synced') : t('health.nothingToSync'), 'success')
  }

  const metricLabel: Record<HealthMetric, string> = {
    steps: t('health.metricSteps'),
    exercise: t('health.metricExercise'),
    sleep: t('health.metricSleep'),
  }

  const activityById = new Map((activities ?? []).map((activity) => [activity.id, activity]))

  return (
    <View className="gap-3">
      <View className="flex-row items-start gap-3">
        <HeartPulse size={20} color={colors.brand} style={{ marginTop: 2 }} />
        <Text className="min-w-0 flex-1 text-sm leading-relaxed text-text-muted dark:text-text-muted-dark">
          {t('health.intro')}
        </Text>
      </View>

      {!connected ? (
        <Button
          title={t('health.connect')}
          fullWidth
          loading={busy}
          icon={busy ? undefined : <HeartPulse size={18} color="#fff" />}
          onPress={() => void connect()}
        />
      ) : (
        <>
          <Text className="px-1 text-xs text-text-subtle dark:text-text-subtle-dark">
            {t('health.linkHint')}
          </Text>

          {HEALTH_METRICS.map((metric) => {
            const Icon = METRIC_ICONS[metric]
            const linked = links[metric] ? activityById.get(links[metric]!) : undefined
            const open = picking === metric
            return (
              <View key={metric} className="gap-1.5">
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: open }}
                  onPress={() => setPicking(open ? null : metric)}
                  className={
                    open
                      ? 'flex-row items-center gap-3 rounded-2xl border border-brand bg-brand-soft px-4 py-3 dark:bg-brand-soft-dark'
                      : 'flex-row items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 dark:border-border-dark dark:bg-surface-dark'
                  }
                >
                  <Icon size={18} color={open ? colors.brand : colors.textMuted} />
                  <View className="min-w-0 flex-1">
                    <Text className="text-sm font-bold text-text dark:text-text-dark">
                      {metricLabel[metric]}
                    </Text>
                    <Text className="text-xs text-text-muted dark:text-text-muted-dark" numberOfLines={1}>
                      {linked ? linked.name : t('health.notLinked')}
                    </Text>
                  </View>
                  {linked ? <Check size={16} color={colors.brand} /> : null}
                </Pressable>

                {open ? (
                  <View className="gap-1 rounded-2xl bg-surface-sunken p-2 dark:bg-surface-sunken-dark">
                    <Pressable
                      accessibilityRole="button"
                      onPress={() => link(metric, null)}
                      className="rounded-xl px-3 py-2.5"
                    >
                      <Text className="text-sm font-semibold text-text-muted dark:text-text-muted-dark">
                        {t('health.none')}
                      </Text>
                    </Pressable>
                    {(activities ?? []).map((activity) => (
                      <Pressable
                        key={activity.id}
                        accessibilityRole="button"
                        onPress={() => link(metric, activity.id)}
                        className="flex-row items-center gap-2.5 rounded-xl px-3 py-2"
                      >
                        <ActivityIcon icon={activity.icon} color={activity.color} size="sm" />
                        <Text
                          className="min-w-0 flex-1 text-sm font-semibold text-text dark:text-text-dark"
                          numberOfLines={1}
                        >
                          {activity.name}
                        </Text>
                        {links[metric] === activity.id ? (
                          <Check size={16} color={colors.brand} />
                        ) : null}
                      </Pressable>
                    ))}
                  </View>
                ) : null}
              </View>
            )
          })}

          <Button
            title={t('health.syncNow')}
            variant="secondary"
            fullWidth
            loading={busy}
            onPress={() => void syncNow()}
          />
        </>
      )}
    </View>
  )
}
