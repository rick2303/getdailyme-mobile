import '../global.css'

import { Stack, useRouter, useSegments } from 'expo-router'
import { useEffect } from 'react'
import { View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import { ErrorBoundary } from '@/components/ui/error-boundary'
import { Spinner } from '@/components/ui/feedback'
import { ToastProvider } from '@/components/ui/toast'
import { I18nProvider } from '@/i18n/provider'
import { AuthProvider, useAuth } from '@/lib/auth/provider'
import { initOneSignal, loginOneSignal, logoutOneSignal } from '@/lib/onesignal'
import { QueryProvider } from '@/lib/query/provider'
import { applyThemeMode, loadThemeMode } from '@/lib/theme'

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

function ThemeBinder() {
  useEffect(() => {
    void loadThemeMode().then(applyThemeMode)
  }, [])
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
              <ToastProvider>
                <ThemeBinder />
                <PushBinder />
                <Gate>
                  <Stack screenOptions={{ headerShown: false }} />
                </Gate>
              </ToastProvider>
            </AuthProvider>
          </I18nProvider>
        </QueryProvider>
      </SafeAreaProvider>
      </ErrorBoundary>
    </GestureHandlerRootView>
  )
}
