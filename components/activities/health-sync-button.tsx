import { Check, HeartPulse, RefreshCw } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'

import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { useThemeColors } from '@/constants/colors'
import { useI18n } from '@/i18n/provider'
import { isHealthConnected, loadHealthLinks } from '@/lib/health'
import { useHealthSync } from '@/lib/hooks/use-health-sync'
import { useRelativeTime } from '@/lib/hooks/use-relative-time'

// Si la actividad esta vinculada a una metrica de salud, la ficha muestra el
// aviso y un boton para traer los datos al momento, sin pasar por ajustes.
export function HealthSyncButton({ activityId }: { activityId: string }) {
  const { t } = useI18n()
  const { showToast } = useToast()
  const colors = useThemeColors()
  const relative = useRelativeTime()
  const { status, lastSync, sync } = useHealthSync()

  const [linked, setLinked] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      if (!(await isHealthConnected())) return
      const links = await loadHealthLinks()
      if (!cancelled) setLinked(Object.values(links).includes(activityId))
    })()
    return () => {
      cancelled = true
    }
  }, [activityId])

  if (!linked) return null

  const run = async () => {
    const changes = await sync()
    showToast(changes > 0 ? t('health.synced') : t('health.nothingToSync'), 'success')
  }

  const title =
    status === 'syncing'
      ? t('health.syncing')
      : status === 'done'
        ? t('health.synced')
        : status === 'empty'
          ? t('health.nothingToSync')
          : t('health.syncActivity')

  return (
    <View className="gap-2 rounded-2xl bg-brand-soft p-3 dark:bg-brand-soft-dark">
      <View className="flex-row items-center gap-2">
        <HeartPulse size={14} color={colors.brand} />
        <Text className="flex-1 text-xs font-semibold text-brand dark:text-brand-dark">
          {t('health.linkedBadge')}
        </Text>
      </View>
      <Button
        title={title}
        variant="secondary"
        size="sm"
        fullWidth
        loading={status === 'syncing'}
        disabled={status === 'syncing'}
        icon={
          status === 'done' || status === 'empty' ? (
            <Check size={16} color={colors.brand} />
          ) : (
            <RefreshCw size={16} color={colors.text} />
          )
        }
        onPress={() => void run()}
      />
      {lastSync ? (
        <Text className="text-center text-[11px] text-text-subtle dark:text-text-subtle-dark">
          {t('health.lastSync', { time: relative(lastSync) })}
        </Text>
      ) : null}
    </View>
  )
}
