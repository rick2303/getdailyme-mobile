import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'

import { useCurrentUserId, useTimeZone } from '@/lib/auth/provider'
import { getLastHealthSync, syncHealthToLogs, type HealthSyncResult } from '@/lib/health'
import { haptic } from '@/lib/utils/haptics'

// Traer los datos de salud suele tardar un parpadeo: sin un minimo visible el
// boton parpadea y nadie sabe si se sincronizo. Aqui el giro dura al menos
// MIN_SPIN y despues se queda un rato el resultado.
const MIN_SPIN_MS = 900
const RESULT_MS = 2400

export type HealthSyncStatus = 'idle' | 'syncing' | 'done' | 'empty' | 'error'

export function useHealthSync() {
  const userId = useCurrentUserId()
  const timeZone = useTimeZone()
  const queryClient = useQueryClient()

  const [status, setStatus] = useState<HealthSyncStatus>('idle')
  const [lastSync, setLastSync] = useState<string | null>(null)

  const alive = useRef(true)
  const resultTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // El estado se lee dentro de sync() solo para no lanzar dos a la vez. Si
  // entrara como dependencia, cada cambio de estado crearia un sync() nuevo y
  // los botones que lo guardan en un efecto se quedarian con el viejo.
  const running = useRef(false)

  useEffect(() => {
    alive.current = true
    void getLastHealthSync().then((value) => {
      if (alive.current) setLastSync(value)
    })
    return () => {
      alive.current = false
      if (resultTimer.current) clearTimeout(resultTimer.current)
    }
  }, [])

  // Devuelve null si no habia nada que hacer (sin sesion, o ya se estaba
  // sincronizando): quien llama no debe cantar un resultado que no ocurrio.
  const sync = useCallback(async (): Promise<HealthSyncResult | null> => {
    if (!userId || running.current) return null

    running.current = true
    if (resultTimer.current) clearTimeout(resultTimer.current)
    setStatus('syncing')
    const startedAt = Date.now()

    let result: HealthSyncResult = { changes: 0, failed: 0 }
    try {
      result = await syncHealthToLogs(userId, timeZone)
      await queryClient.invalidateQueries({ queryKey: ['logs'] })
      await queryClient.invalidateQueries({ queryKey: ['feed'] })
    } catch {
      result = { changes: 0, failed: 1 }
    } finally {
      const elapsed = Date.now() - startedAt
      if (elapsed < MIN_SPIN_MS) {
        await new Promise((resolve) => setTimeout(resolve, MIN_SPIN_MS - elapsed))
      }
      running.current = false
    }

    if (!alive.current) return result

    const outcome = result.failed > 0 ? 'error' : result.changes > 0 ? 'done' : 'empty'
    haptic(outcome === 'done' ? 'success' : outcome === 'error' ? 'warning' : 'tap')
    setStatus(outcome)
    setLastSync(new Date().toISOString())
    resultTimer.current = setTimeout(() => {
      if (alive.current) setStatus('idle')
    }, RESULT_MS)

    return result
  }, [userId, timeZone, queryClient])

  return { status, lastSync, sync, syncing: status === 'syncing' }
}
