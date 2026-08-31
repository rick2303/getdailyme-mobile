import '../global.css'

import { useQueryClient } from '@tanstack/react-query'
import * as QuickActions from 'expo-quick-actions'
import { useQuickActionRouting } from 'expo-quick-actions/router'
import { Stack, useRouter, useSegments } from 'expo-router'
import { useEffect, useMemo, useRef, useState } from 'react'
import { AppState, Platform, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { AnimatedSplash } from '@/components/brand/animated-splash'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { Spinner } from '@/components/ui/feedback'
import { ToastProvider } from '@/components/ui/toast'
import { I18nProvider, useT } from '@/i18n/provider'
import { AuthProvider, useAuth } from '@/lib/auth/provider'
import { ACTIVITY_HEX, useThemeColors } from '@/constants/colors'
import { computeStreak } from '@/lib/activities/streaks'
import { initCrashReporting, setCrashUser, wrapRoot } from '@/lib/crash'
import { useActiveActivities } from '@/lib/hooks/use-activities'
import { useHistorySummary, useTodayTotals } from '@/lib/hooks/use-logs'
import { isHealthConnected, syncHealthToLogs } from '@/lib/health'
import { claimParkedInvite } from '@/lib/invite-handoff'
import { initOneSignal, loginOneSignal, logoutOneSignal } from '@/lib/onesignal'
import { QueryProvider } from '@/lib/query/provider'
import { ThemeProvider } from '@/lib/theme-context'
import { updateWidget } from '@/lib/widget'

// Arranca antes que cualquier componente: un crash durante el primer render
// tambien tiene que llegar. Sin DSN no hace nada.
initCrashReporting()

// El guardia de rutas: sin sesion -> acceso; con sesion sin onboarding ->
// bienvenida; el resto -> tabs. Es el equivalente movil del proxy de la web.
function Gate({ children }: { children: React.ReactNode }) {
  const { user, needsOnboarding, isLoadingSession, isLoadingProfile } = useAuth()
  const segments = useSegments()
  const router = useRouter()

  const ready = !isLoadingSession && (!user || !isLoadingProfile)

  useEffect(() => {
    if (!ready) return
    const inAuth = segments[0] === '(auth)'
    const inWelcome = segments[0] === 'welcome'

    if (!user && !inAuth) {
      router.replace('/sign-in')
    } else if (user && needsOnboarding && !inWelcome) {
      router.replace('/welcome')
    } else if (user && !needsOnboarding && (inAuth || inWelcome)) {
      router.replace('/')
    }
  }, [ready, user, needsOnboarding, segments, router])

  if (!ready) {
    return (
      <View className="flex-1 items-center justify-center bg-bg dark:bg-bg-dark">
        <Spinner />
      </View>
    )
  }

  return <>{children}</>
}

// Los accesos del icono de la app: registrar, feed y nueva actividad. El
// routing lo resuelve el helper de expo-quick-actions con el href de cada uno.
function QuickActionsBinder() {
  const t = useT()
  useQuickActionRouting()

  useEffect(() => {
    void QuickActions.setItems([
      {
        id: 'log',
        title: t('quickActions.log'),
        icon: Platform.OS === 'ios' ? 'symbol:plus.circle' : undefined,
        params: { href: '/' },
      },
      {
        id: 'feed',
        title: t('quickActions.feed'),
        icon: Platform.OS === 'ios' ? 'symbol:bolt.heart' : undefined,
        params: { href: '/feed' },
      },
      {
        id: 'new-activity',
        title: t('quickActions.newActivity'),
        icon: Platform.OS === 'ios' ? 'symbol:sparkles' : undefined,
        params: { href: '/?create=1' },
      },
    ])
  }, [t])

  return null
}

// Mantiene el widget de iOS al dia: cada cambio en actividades o registros
// reescribe el resumen en el App Group y pide redibujar.
function WidgetBinder() {
  const { data: activities } = useActiveActivities()
  const { totals } = useTodayTotals()
  const { allDates, today } = useHistorySummary()
  const colors = useThemeColors()

  const streak = useMemo(() => computeStreak(allDates, today).current, [allDates, today])

  useEffect(() => {
    const list = activities ?? []
    if (list.length === 0) return

    const withGoal = list.filter(
      (activity) =>
        activity.input_mode === 'check' ||
        (activity.daily_target !== null && activity.target_period === 'day'),
    )
    const reachedCount = (activity: (typeof list)[number]) => {
      const entry = totals.get(activity.id)
      if (activity.input_mode === 'check') return (entry?.count ?? 0) > 0
      return (entry?.amount ?? 0) >= (activity.daily_target ?? Infinity)
    }
    const done = withGoal.filter(reachedCount).length
    const due = withGoal.length

    const pending = withGoal
      .filter((activity) => !reachedCount(activity))
      .slice(0, 5)
      .map((activity) => {
        const entry = totals.get(activity.id)
        const progress =
          activity.input_mode === 'check'
            ? 0
            : Math.min(1, (entry?.amount ?? 0) / (activity.daily_target ?? 1))
        return {
          name: activity.name,
          color: ACTIVITY_HEX[activity.color]?.light ?? '#007EB6',
          progress,
        }
      })

    updateWidget({
      done,
      due,
      streak,
      brand: colors.brand,
      complete: due > 0 && done === due,
      activities: pending,
    })
  }, [activities, totals, streak, colors.brand])

  return null
}

// Sincroniza salud al abrir la app y al volver del fondo, si esta conectada.
function HealthBinder() {
  const { user, profile } = useAuth()
  const queryClient = useQueryClient()

  const userId = user?.id ?? null
  const timeZone = profile?.timezone ?? null

  useEffect(() => {
    if (!userId || !timeZone) return
    let cancelled = false

    const sync = async () => {
      if (cancelled) return
      if (!(await isHealthConnected())) return
      const { changes } = await syncHealthToLogs(userId, timeZone)
      // Sin esto la salud escribia en la base y la pantalla seguia enseñando lo
      // de antes: los registros no aparecian hasta tirar para refrescar.
      if (changes > 0 && !cancelled) {
        await queryClient.invalidateQueries({ queryKey: ['logs'] })
        await queryClient.invalidateQueries({ queryKey: ['feed'] })
      }
    }

    void sync()
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void sync()
    })

    return () => {
      cancelled = true
      subscription.remove()
    }
  }, [userId, timeZone, queryClient])

  return null
}

function PushBinder() {
  const { user, isLoadingSession } = useAuth()
  // Con `user` (el objeto) como dependencia, cada TOKEN_REFRESHED traia un User
  // nuevo y volvia a llamar a login() aunque fuera la misma persona. Con el id
  // solo se reacciona a un cambio de verdad.
  const userId = user?.id ?? null

  useEffect(() => {
    const appId = process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID
    if (appId) initOneSignal(appId)
  }, [])

  // Mientras la sesion se lee de AsyncStorage, `user` es null, que no es lo
  // mismo que "no hay nadie". Sin esperar, cada arranque en frio hacia
  // logout() antes del login(): OneSignal suelta el external_id, mueve la
  // suscripcion a un usuario anonimo y la vuelve a atar un instante despues.
  // Ese vaiven deja aparatos con external_id pero sin suscripcion, y a esos
  // el envio por alias no les llega.
  useEffect(() => {
    if (isLoadingSession) return
    if (userId) loginOneSignal(userId)
    else logoutOneSignal()
    // Mismo criterio para los crashes: solo el id, y solo cuando ya se sabe
    // si hay sesion o no.
    setCrashUser(userId)
  }, [userId, isLoadingSession])

  return null
}

// Recoge la invitacion aparcada cuando el enlace se abrio sin sesion. Espera a
// que el onboarding este hecho: mientras haga falta, el guardia manda a la
// bienvenida y navegar ahora seria pelearse con el.
function PendingInviteBinder() {
  const { user, needsOnboarding, isLoadingProfile } = useAuth()
  const router = useRouter()
  const claimed = useRef(false)

  useEffect(() => {
    if (!user || isLoadingProfile || needsOnboarding || claimed.current) return
    claimed.current = true

    void claimParkedInvite().then((token) => {
      if (token) router.push(`/invite/${token}`)
    })
  }, [user, needsOnboarding, isLoadingProfile, router])

  return null
}

function RootLayout() {
  const [splashDone, setSplashDone] = useState(false)

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ErrorBoundary>
      <SafeAreaProvider>
        <QueryProvider>
          <I18nProvider>
            <AuthProvider>
              <ThemeProvider>
                <ToastProvider>
                  <PushBinder />
                  <QuickActionsBinder />
                  <WidgetBinder />
                  <HealthBinder />
                  <PendingInviteBinder />
                  <Gate>
                    <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
                  </Gate>
                  {!splashDone ? <AnimatedSplash onDone={() => setSplashDone(true)} /> : null}
                </ToastProvider>
              </ThemeProvider>
            </AuthProvider>
          </I18nProvider>
        </QueryProvider>
      </SafeAreaProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  )
}

export default wrapRoot(RootLayout)
