import '../global.css'

import * as QuickActions from 'expo-quick-actions'
import { useQuickActionRouting } from 'expo-quick-actions/router'
import { Stack, useRouter, useSegments } from 'expo-router'
import { useEffect } from 'react'
import { Platform, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { ErrorBoundary } from '@/components/ui/error-boundary'
import { Spinner } from '@/components/ui/feedback'
import { ToastProvider } from '@/components/ui/toast'
import { I18nProvider, useT } from '@/i18n/provider'
import { AuthProvider, useAuth } from '@/lib/auth/provider'
import { initOneSignal, loginOneSignal, logoutOneSignal } from '@/lib/onesignal'
import { QueryProvider } from '@/lib/query/provider'
import { ThemeProvider } from '@/lib/theme-context'

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

function PushBinder() {
  const { user } = useAuth()

  useEffect(() => {
    const appId = process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID
    if (appId) initOneSignal(appId)
  }, [])

  useEffect(() => {
    if (user) loginOneSignal(user.id)
    else logoutOneSignal()
  }, [user])

  return null
}

export default function RootLayout() {
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
                  <Gate>
                    <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
                  </Gate>
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
