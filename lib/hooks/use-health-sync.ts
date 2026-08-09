import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'

import { useCurrentUserId, useTimeZone } from '@/lib/auth/provider'
import { getLastHealthSync, syncHealthToLogs } from '@/lib/health'
import { haptic } from '@/lib/utils/haptics'

// Traer los datos de salud suele tardar un parpadeo: sin un minimo visible el
// boton parpadea y nadie sabe si se sincronizo. Aqui el giro dura al menos
// MIN_SPIN y despues se queda un rato el resultado.
const MIN_SPIN_MS = 900
const RESULT_MS = 2400

export type HealthSyncStatus = 'idle' | 'syncing' | 'done' | 'empty'

export function useHealthSync() {
  const userId = useCurrentUserId()
  const timeZone = useTimeZone()
  const queryClient = useQueryClient()

  const [status, setStatus] = useState<HealthSyncStatus>('idle')
  const [lastSync, setLastSync] = useState<string | null>(null)

  const alive = useRef(true)
  const resultTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    void getLastHealthSync().then((value) => {
      if (alive.current) setLastSync(value)
    })
    return () => {
      alive.current = false
      if (resultTimer.current) clearTimeout(resultTimer.current)
    }
  }, [])

  const sync = useCallback(async () => {
    if (!userId || status === 'syncing') return 0

    if (resultTimer.current) clearTimeout(resultTimer.current)
    setStatus('syncing')
    const startedAt = Date.now()

    let changes = 0
    try {
      changes = await syncHealthToLogs(userId, timeZone)
      await queryClient.invalidateQueries({ queryKey: ['logs'] })
    } finally {
      const elapsed = Date.now() - startedAt
      if (elapsed < MIN_SPIN_MS) {
        await new Promise((resolve) => setTimeout(resolve, MIN_SPIN_MS - elapsed))
      }
    }

    if (!alive.current) return changes

    haptic(changes > 0 ? 'success' : 'tap')
    setStatus(changes > 0 ? 'done' : 'empty')
    setLastSync(new Date().toISOString())
    resultTimer.current = setTimeout(() => {
      if (alive.current) setStatus('idle')
    }, RESULT_MS)

    return changes
  }, [userId, status, timeZone, queryClient])

  return { status, lastSync, sync, syncing: status === 'syncing' }
}
