import { useIsRestoring, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { AppState } from 'react-native'

import { createLog } from '@/lib/api/logs'
import type { ActivityLog } from '@/lib/api/types'
import { requestPush } from '@/lib/push/client'
import { useCurrentUserId } from '@/lib/auth/provider'
import { useActiveActivities } from '@/lib/hooks/use-activities'
import { useCreateLog } from '@/lib/hooks/use-logs'
import { mutationKeys, queryKeys } from '@/lib/query/keys'
import type { CreateLogVariables } from '@/lib/query/offline-mutations'
import { isSupabaseConfigured, supabase } from '@/lib/supabase/client'
import { onWidgetLog, readWidgetLogs, removeWidgetLogs, shareWidgetSession } from '@/lib/widget-bridge'
import { planWidgetDrain, toCreateLogVariables } from '@/lib/widget-queue'

export function WidgetSessionBinder() {
  useEffect(() => {
    if (!isSupabaseConfigured()) return
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''
    const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ''

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session || !session.expires_at) {
        shareWidgetSession(null)
        return
      }
      shareWidgetSession({
        url,
        anonKey,
        userId: session.user.id,
        accessToken: session.access_token,
        expiresAt: session.expires_at,
      })
    })

    return () => subscription.unsubscribe()
  }, [])

  return null
}

export function WidgetQueueBinder() {
  const userId = useCurrentUserId()
  const queryClient = useQueryClient()
  const isRestoring = useIsRestoring()
  const { mutateAsync } = useCreateLog()
  const { data: activities } = useActiveActivities()

  const create = useRef(mutateAsync)
  create.current = mutateAsync
  const activityIds = useRef<Set<string> | undefined>(undefined)
  activityIds.current = activities ? new Set(activities.map((activity) => activity.id)) : undefined

  useEffect(() => {
    if (!userId || isRestoring) return
    let running = false

    const drain = async () => {
      if (running) return
      running = true
      try {
        const entries = await readWidgetLogs()
        if (entries.length === 0) return

        const history =
          queryClient.getQueryData<ActivityLog[]>(queryKeys.activityHistory(userId)) ?? []
        const inFlightIds = new Set(
          queryClient
            .getMutationCache()
            .findAll({ mutationKey: mutationKeys.createLog })
            .filter((mutation) => mutation.state.status === 'pending')
            .map((mutation) => (mutation.state.variables as CreateLogVariables | undefined)?.id)
            .filter((id): id is string => typeof id === 'string'),
        )

        const plan = planWidgetDrain(entries, {
          userId,
          knownIds: new Set(history.map((log) => log.id)),
          inFlightIds,
          activityIds: activityIds.current,
        })

        await removeWidgetLogs(plan.toRemove)
        if (plan.settled) {
          void queryClient.invalidateQueries({ queryKey: ['logs'] })
          void queryClient.invalidateQueries({ queryKey: ['feed'] })
        }

        for (const entry of plan.toConfirm) {
          createLog(supabase, toCreateLogVariables(entry))
            .then((created) => {
              if (created) void requestPush({ type: 'friend_log', logId: entry.id }).catch(() => undefined)
              return removeWidgetLogs([entry.id])
            })
            .catch(() => undefined)
        }

        for (const entry of plan.toCreate) {
          create
            .current(toCreateLogVariables(entry))
            .then(() => removeWidgetLogs([entry.id]))
            .catch(() => undefined)
        }
      } finally {
        running = false
      }
    }

    void drain()
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void drain()
    })
    const unsubscribe = onWidgetLog(() => void drain())

    return () => {
      subscription.remove()
      unsubscribe()
    }
  }, [userId, isRestoring, queryClient])

  return null
}
