import { useQueryClient } from '@tanstack/react-query'
import { HeartPulse } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { Text, View } from 'react-native'

import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { useThemeColors } from '@/constants/colors'
import { useI18n } from '@/i18n/provider'
import { useCurrentUserId, useTimeZone } from '@/lib/auth/provider'
import { isHealthConnected, loadHealthLinks, syncHealthToLogs } from '@/lib/health'

// Si la actividad esta vinculada a una metrica de salud, la ficha muestra el
// aviso y un boton para traer los datos al momento, sin pasar por ajustes.
export function HealthSyncButton({ activityId }: { activityId: string }) {
  const { t } = useI18n()
  const { showToast } = useToast()
  const colors = useThemeColors()
  const userId = useCurrentUserId()
  const timeZone = useTimeZone()
  const queryClient = useQueryClient()

  const [linked, setLinked] = useState(false)
  const [busy, setBusy] = useState(false)

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

  const sync = async () => {
    if (!userId) return
    setBusy(true)
    const changes = await syncHealthToLogs(userId, timeZone)
    setBusy(false)
    await queryClient.invalidateQueries({ queryKey: ['logs'] })
    showToast(changes > 0 ? t('health.synced') : t('health.nothingToSync'), 'success')
  }

  return (
    <View className="gap-2 rounded-2xl bg-brand-soft p-3 dark:bg-brand-soft-dark">
      <View className="flex-row items-center gap-2">
        <HeartPulse size={14} color={colors.brand} />
        <Text className="flex-1 text-xs font-semibold text-brand dark:text-brand-dark">
          {t('health.linkedBadge')}
        </Text>
      </View>
      <Button
        title={t('health.syncActivity')}
        variant="secondary"
        size="sm"
        fullWidth
        loading={busy}
        onPress={() => void sync()}
      />
    </View>
  )
}
