import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { User } from '@supabase/supabase-js'
import { useRouter } from 'expo-router'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import { fetchProfile, updateProfile } from '@/lib/api/profile'
import type { Profile } from '@/lib/api/types'
import { queryKeys } from '@/lib/query/keys'
import { clearPersistedCache } from '@/lib/query/persister'
import { getSupabaseBrowserClient, isSupabaseConfigured, supabase } from '@/lib/supabase/client'
import { getBrowserTimeZone } from '@/lib/utils/dates'

// Mismo contrato que el proveedor web; cambia el arranque (la sesion sale de
// AsyncStorage, no de cookies del servidor) y el router.
type AuthContextValue = {
  user: User | null
  profile: Profile | null
  isLoadingProfile: boolean
  isLoadingSession: boolean
  needsOnboarding: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoadingSession, setIsLoadingSession] = useState(true)
  const queryClient = useQueryClient()
  const router = useRouter()
  const configured = isSupabaseConfigured()

  useEffect(() => {
    if (!configured) {
      setIsLoadingSession(false)
      return
    }

    supabase.auth
      .getSession()
      .then(({ data }) => {
        setUser(data.session?.user ?? null)
      })
      .finally(() => setIsLoadingSession(false))

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [configured])

  const profileQuery = useQuery({
    queryKey: queryKeys.profile(user?.id ?? 'anonymous'),
    enabled: configured && Boolean(user?.id),
    queryFn: async () => fetchProfile(getSupabaseBrowserClient(), user!.id),
  })

  // Quien viaja se lleva el telefono pero no el perfil: con el huso viejo las
  // rachas y el "hoy" se cuentan con el dia de otra ciudad. Igual que la web.
  const timezoneSynced = useRef(false)
  const profile = profileQuery.data ?? null
  useEffect(() => {
    if (!profile || timezoneSynced.current) return
    const deviceTimeZone = getBrowserTimeZone()
    if (deviceTimeZone === 'UTC' || profile.timezone === deviceTimeZone) return

    timezoneSynced.current = true
    updateProfile(getSupabaseBrowserClient(), profile.id, { timezone: deviceTimeZone })
      .then(() => queryClient.invalidateQueries({ queryKey: queryKeys.profile(profile.id) }))
      .catch(() => {
        timezoneSynced.current = false
      })
  }, [profile, queryClient])

  const signOut = useCallback(async () => {
    if (configured) await supabase.auth.signOut()
    queryClient.clear()
    await clearPersistedCache()
    setUser(null)
    router.replace('/sign-in')
  }, [configured, queryClient, router])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      isLoadingProfile: profileQuery.isLoading,
      isLoadingSession,
      needsOnboarding:
        Boolean(user) && profileQuery.isSuccess && (!profile || !profile.onboarded_at),
      signOut,
    }),
    [user, profile, profileQuery.isLoading, profileQuery.isSuccess, isLoadingSession, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}

export function useCurrentUserId(): string | null {
  return useAuth().user?.id ?? null
}

export function useTimeZone(): string {
  const { profile } = useAuth()
  return profile?.timezone ?? getBrowserTimeZone()
}
