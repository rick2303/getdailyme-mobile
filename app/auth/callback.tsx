import { useRouter } from 'expo-router'
import { useEffect } from 'react'
import { View } from 'react-native'

import { Spinner } from '@/components/ui/feedback'
import { useAuth } from '@/lib/auth/provider'

// Aterrizaje del deep link getdailyme://auth/callback. El intercambio del
// codigo lo hace la pantalla de acceso dentro de openAuthSessionAsync; esta
// ruta solo existe para que el enlace no caiga en "unmatched route" si Android
// ademas lo entrega como intent. En cuanto hay sesion, el Gate del layout
// raiz mueve a quien corresponda; si no la hay, de vuelta al acceso.
export default function AuthCallbackScreen() {
  const { user, isLoadingSession } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoadingSession) return
    const timeout = setTimeout(() => {
      router.replace(user ? '/' : '/sign-in')
    }, 1500)
    return () => clearTimeout(timeout)
  }, [user, isLoadingSession, router])

  return (
    <View className="flex-1 items-center justify-center bg-bg dark:bg-bg-dark">
      <Spinner />
    </View>
  )
}
