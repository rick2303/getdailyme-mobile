import { QueryClient, focusManager } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { useEffect, useState, type ReactNode } from 'react'
import { AppState } from 'react-native'

import { registerOfflineMutations } from './offline-mutations'
import { createCachePersister } from './persister'

const ONE_WEEK_MS = 1000 * 60 * 60 * 24 * 7

// react-query se apoya en el "foco de la ventana" para saber cuando volver a
// pedir datos, y en nativo esa ventana no existe: sin esto, refetchOnWindowFocus
// no se dispara nunca y volver del fondo enseña lo de hace horas.
function useAppStateAsFocus() {
  useEffect(() => {
    focusManager.setFocused(AppState.currentState === 'active')
    const subscription = AppState.addEventListener('change', (state) => {
      focusManager.setFocused(state === 'active')
    })
    return () => subscription.remove()
  }, [])
}

// Misma configuracion que la web: offlineFirst y mutaciones en cola que
// sobreviven a cerrar la app, con AsyncStorage en lugar de IndexedDB.
function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        networkMode: 'offlineFirst',
        staleTime: 30_000,
        gcTime: ONE_WEEK_MS,
        retry: 2,
      },
      mutations: {
        networkMode: 'offlineFirst',
        retry: 3,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30_000),
      },
    },
  })
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => {
    const client = createQueryClient()
    registerOfflineMutations(client)
    return client
  })
  const [persister] = useState(() => createCachePersister())

  useAppStateAsFocus()

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: ONE_WEEK_MS,
        dehydrateOptions: {
          shouldDehydrateMutation: (mutation) => mutation.state.isPaused,
        },
      }}
      onSuccess={() => {
        void queryClient.resumePausedMutations().then(() => {
          void queryClient.invalidateQueries()
        })
      }}
    >
      {children}
    </PersistQueryClientProvider>
  )
}
