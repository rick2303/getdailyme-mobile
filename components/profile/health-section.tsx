import { Check, Footprints, HeartPulse, Lock, Moon, RefreshCw, Zap } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { AppState, Platform, Pressable, Text, View } from 'react-native'

import { ActivityIcon } from '@/components/activities/activity-icon'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { useThemeColors } from '@/constants/colors'
import { useI18n } from '@/i18n/provider'
import {
  HEALTH_METRICS,
  isHealthConnected,
  loadHealthLinks,
  openHealthSettings,
  readHealthAccess,
  requestHealthPermissions,
  saveHealthLinks,
  type HealthAccess,
  type HealthLinks,
  type HealthMetric,
} from '@/lib/health'
import { useAuth } from '@/lib/auth/provider'
import { useActiveActivities } from '@/lib/hooks/use-activities'
import { useHealthSync } from '@/lib/hooks/use-health-sync'
import { useRelativeTime } from '@/lib/hooks/use-relative-time'

// Conectar la salud del telefono: cada metrica se vincula a una actividad y
// de ahi en adelante se registra sola al abrir la app. Una metrica sin permiso
// concedido no se puede vincular a ciegas: primero hay que arreglar el permiso.
const METRIC_ICONS: Record<HealthMetric, typeof Footprints> = {
  steps: Footprints,
  exercise: Zap,
  sleep: Moon,
}

const NO_ACCESS: HealthAccess = { steps: false, exercise: false, sleep: false }

export function HealthSection() {
  const { t } = useI18n()
  const { showToast } = useToast()
  const colors = useThemeColors()
  const relative = useRelativeTime()
  const { data: activities } = useActiveActivities()
  const { status, lastSync, sync } = useHealthSync()
  useAuth()

  const [connected, setConnected] = useState(false)
  const [links, setLinks] = useState<HealthLinks>({})
  const [access, setAccess] = useState<HealthAccess>(NO_ACCESS)
  const [forced, setForced] = useState<HealthMetric[]>([])
  const [picking, setPicking] = useState<HealthMetric | null>(null)
  const [busy, setBusy] = useState(false)
  const [granting, setGranting] = useState<HealthMetric | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const [isConnected, savedLinks] = await Promise.all([isHealthConnected(), loadHealthLinks()])
      if (cancelled) return
      setConnected(isConnected)
      setLinks(savedLinks)
      if (!isConnected) return
      const current = await readHealthAccess()
      if (!cancelled) setAccess(current)
    }

    void load()

    // Al volver de Salud o de Health Connect hay que releer: el permiso puede
    // haber cambiado fuera de la app.
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void load()
    })

    return () => {
      cancelled = true
      subscription.remove()
    }
  }, [])

  const connect = async () => {
    setBusy(true)
    const granted = await requestHealthPermissions()
    setBusy(false)
    if (!granted) {
      showToast(t('health.unavailable'), 'error')
      return
    }
    setConnected(true)
    setAccess(granted)
    showToast(t('health.connected'), 'success')
  }

  // Volver a pedir una metrica suelta. iOS no vuelve a preguntar si ya
  // respondiste: en ese caso queda ir a Salud a mano.
  const grant = async (metric: HealthMetric) => {
    setGranting(metric)
    const granted = await requestHealthPermissions([metric])
    setGranting(null)
    const next = granted ?? (await readHealthAccess())
    setAccess(next)
    if (next[metric]) {
      showToast(t('health.granted'), 'success')
      return
    }
    showToast(t('health.stillBlocked'), 'error')
    void openHealthSettings()
  }

  const recheck = async (metric: HealthMetric) => {
    setGranting(metric)
    const next = await readHealthAccess()
    setGranting(null)
    setAccess(next)
    showToast(next[metric] ? t('health.granted') : t('health.stillBlocked'), next[metric] ? 'success' : 'error')
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
    const changes = await sync()
    showToast(changes > 0 ? t('health.synced') : t('health.nothingToSync'), 'success')
  }

  const metricLabel: Record<HealthMetric, string> = {
    steps: t('health.metricSteps'),
    exercise: t('health.metricExercise'),
    sleep: t('health.metricSleep'),
  }

  const activityById = new Map((activities ?? []).map((activity) => [activity.id, activity]))
  const syncTitle =
    status === 'syncing'
      ? t('health.syncing')
      : status === 'done'
        ? t('health.synced')
        : status === 'empty'
          ? t('health.nothingToSync')
          : t('health.syncNow')

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
            const allowed = access[metric] || forced.includes(metric) || Boolean(links[metric])
            const blocked = !access[metric]
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
                  <Icon
                    size={18}
                    color={blocked && !linked ? colors.textSubtle : open ? colors.brand : colors.textMuted}
                  />
                  <View className="min-w-0 flex-1">
                    <Text className="text-sm font-bold text-text dark:text-text-dark">
                      {metricLabel[metric]}
                    </Text>
                    <Text
                      className={
                        blocked
                          ? 'text-xs text-danger'
                          : 'text-xs text-text-muted dark:text-text-muted-dark'
                      }
                      numberOfLines={1}
                    >
                      {blocked
                        ? t('health.noAccess')
                        : linked
                          ? linked.name
                          : t('health.notLinked')}
                    </Text>
                  </View>
                  {blocked ? (
                    <Lock size={16} color={colors.textSubtle} />
                  ) : linked ? (
                    <Check size={16} color={colors.brand} />
                  ) : null}
                </Pressable>

                {open ? (
                  <View className="gap-2 rounded-2xl bg-surface-sunken p-2 dark:bg-surface-sunken-dark">
                    {blocked ? (
                      <View className="gap-2 p-1">
                        <Text className="text-xs leading-relaxed text-text-muted dark:text-text-muted-dark">
                          {Platform.OS === 'ios' ? t('health.blockedIos') : t('health.blockedAndroid')}
                        </Text>
                        <Button
                          title={Platform.OS === 'ios' ? t('health.openHealth') : t('health.grant')}
                          variant="secondary"
                          size="sm"
                          fullWidth
                          loading={granting === metric}
                          icon={<RefreshCw size={16} color={colors.text} />}
                          onPress={() => void grant(metric)}
                        />
                        <Button
                          title={t('health.recheck')}
                          variant="ghost"
                          size="sm"
                          fullWidth
                          disabled={granting === metric}
                          onPress={() => void recheck(metric)}
                        />
                      </View>
                    ) : null}

                    {allowed ? (
                      <View className="gap-1">
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
                    ) : (
                      <Button
                        title={t('health.linkAnyway')}
                        variant="ghost"
                        size="sm"
                        fullWidth
                        onPress={() => setForced((current) => [...current, metric])}
                      />
                    )}
                  </View>
                ) : null}
              </View>
            )
          })}

          <Button
            title={syncTitle}
            variant="secondary"
            fullWidth
            loading={status === 'syncing'}
            disabled={status === 'syncing'}
            icon={
              status === 'done' || status === 'empty' ? (
                <Check size={18} color={colors.brand} />
              ) : (
                <RefreshCw size={18} color={colors.text} />
              )
            }
            onPress={() => void syncNow()}
          />

          {lastSync ? (
            <Text className="px-1 text-center text-xs text-text-subtle dark:text-text-subtle-dark">
              {t('health.lastSync', { time: relative(lastSync) })}
            </Text>
          ) : null}
        </>
      )}
    </View>
  )
}
