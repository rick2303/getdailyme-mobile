import * as AppleAuthentication from 'expo-apple-authentication'
import * as WebBrowser from 'expo-web-browser'
import { AtSign, Lock } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { Alert, Platform, ScrollView, Text, useColorScheme, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Button } from '@/components/ui/button'
import { TextInput } from '@/components/ui/field'
import { useToast } from '@/components/ui/toast'
import { useI18n } from '@/i18n/provider'
import { useThemeColors } from '@/constants/colors'
import { supabase } from '@/lib/supabase/client'

WebBrowser.maybeCompleteAuthSession()

type Mode = 'signIn' | 'signUp'

const OAUTH_REDIRECT = 'getdailyme://auth/callback'

export default function SignInScreen() {
  const { t } = useI18n()
  const { showToast } = useToast()
  const colors = useThemeColors()
  const scheme = useColorScheme()

  const [mode, setMode] = useState<Mode>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)
  const [pendingGoogle, setPendingGoogle] = useState(false)
  const [appleAvailable, setAppleAvailable] = useState(false)

  useEffect(() => {
    AppleAuthentication.isAvailableAsync()
      .then(setAppleAvailable)
      .catch(() => setAppleAvailable(false))
  }, [])

  const trimmedEmail = email.trim().toLowerCase()
  const canSubmit = /.+@.+\..+/.test(trimmedEmail) && password.length >= 8 && !pending

  const submit = async () => {
    setPending(true)
    try {
      if (mode === 'signIn') {
        const { error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        })
        if (error) showToast(t('auth.wrongCredentials'), 'error')
      } else {
        const { error } = await supabase.auth.signUp({ email: trimmedEmail, password })
        if (error) {
          showToast(
            error.message.includes('already') ? t('auth.emailInUse') : t('auth.weakPassword'),
            'error',
          )
        }
      }
    } catch {
      showToast(t('auth.failed'), 'error')
    } finally {
      setPending(false)
    }
  }

  // La receta de splitwo para Google en nativo: pedir la URL con
  // skipBrowserRedirect, abrirla en el navegador del sistema y canjear aqui
  // mismo el codigo PKCE (para eso esta el cryptoPolyfill del arranque).
  const signInWithGoogle = async () => {
    setPendingGoogle(true)
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: OAUTH_REDIRECT,
          skipBrowserRedirect: true,
          queryParams: { prompt: 'select_account' },
        },
      })
      if (error || !data.url) throw error ?? new Error('sin url de oauth')

      const result = await WebBrowser.openAuthSessionAsync(data.url, OAUTH_REDIRECT)
      if (result.type !== 'success') return

      // El fragmento se recorta antes de leer los parametros: el navegador de
      // iOS conserva un "#" vacio al final que contaminaria el codigo y el
      // servidor responderia 404 al canjearlo. Aprendido en splitwo.
      const queryString = result.url.split('#')[0].split('?')[1] ?? ''
      const params = Object.fromEntries(new URLSearchParams(queryString))

      if (params.error) {
        showToast(t('auth.failed'), 'error')
        return
      }

      if (params.code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(params.code)
        if (exchangeError) {
          // Si otro manejador canjeo el codigo primero, la sesion ya existe:
          // solo es fallo si de verdad no hay sesion.
          const {
            data: { session },
          } = await supabase.auth.getSession()
          if (!session?.user) showToast(t('auth.failed'), 'error')
        }
      } else {
        const hash = result.url.split('#')[1] ?? ''
        const tokens = Object.fromEntries(new URLSearchParams(hash))
        if (tokens.access_token && tokens.refresh_token) {
          await supabase.auth.setSession({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
          })
        } else {
          showToast(t('auth.failed'), 'error')
        }
      }
    } catch {
      showToast(t('auth.failed'), 'error')
    } finally {
      setPendingGoogle(false)
    }
  }

  const signInWithApple = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      })
      if (!credential.identityToken) throw new Error('sin identity token')

      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      })
      if (error) throw error

      // Apple solo entrega el nombre en la primera autorizacion: si llego, se
      // guarda para que el onboarding no arranque con un nombre generado.
      const appleName = [credential.fullName?.givenName, credential.fullName?.familyName]
        .filter(Boolean)
        .join(' ')
        .trim()
      if (appleName) {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (user) {
          await supabase
            .from('profiles')
            .update({ display_name: appleName })
            .eq('id', user.id)
            .is('onboarded_at', null)
        }
      }
    } catch (caught) {
      if ((caught as { code?: string })?.code !== 'ERR_REQUEST_CANCELED') {
        showToast(t('auth.failed'), 'error')
      }
    }
  }

  const resetPassword = async () => {
    if (!/.+@.+\..+/.test(trimmedEmail)) {
      showToast(t('auth.invalidEmail'), 'error')
      return
    }
    try {
      await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: 'https://app.getdailyme.com/reset-password',
      })
      Alert.alert(t('auth.resetSentTitle'), t('auth.resetSentBody', { email: trimmedEmail }))
    } catch {
      showToast(t('common.genericError'), 'error')
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bg-dark">
      <ScrollView contentContainerClassName="flex-grow justify-center px-6 py-10" keyboardShouldPersistTaps="handled">
        <View className="items-center gap-2 pb-8">
          <Text className="text-3xl font-extrabold text-brand">getdailyme</Text>
          <Text className="text-center text-base text-text-muted dark:text-text-muted-dark">
            {t('auth.heroTitle')}
          </Text>
        </View>

        <View className="gap-4">
          <TextInput
            label={t('auth.emailLabel')}
            placeholder={t('auth.emailPlaceholder')}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            leading={<AtSign size={18} color={colors.textSubtle} />}
          />

          <TextInput
            label={t('auth.passwordLabel')}
            placeholder={t('auth.passwordPlaceholder')}
            secureTextEntry
            autoCapitalize="none"
            autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
            value={password}
            onChangeText={setPassword}
            leading={<Lock size={18} color={colors.textSubtle} />}
          />

          <Button
            title={mode === 'signIn' ? t('auth.signIn') : t('auth.signUp')}
            size="lg"
            fullWidth
            disabled={!canSubmit}
            loading={pending}
            onPress={() => void submit()}
          />

          <View className="flex-row items-center gap-3">
            <View className="h-px flex-1 bg-border dark:bg-border-dark" />
            <Text className="text-xs font-semibold text-text-subtle dark:text-text-subtle-dark">
              {t('auth.dividerOr')}
            </Text>
            <View className="h-px flex-1 bg-border dark:bg-border-dark" />
          </View>

          <Button
            title={t('auth.continueWithGoogle')}
            variant="secondary"
            size="lg"
            fullWidth
            loading={pendingGoogle}
            onPress={() => void signInWithGoogle()}
          />

          {Platform.OS === 'ios' && appleAvailable ? (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={
                scheme === 'dark'
                  ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                  : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
              }
              cornerRadius={16}
              style={{ height: 52, width: '100%' }}
              onPress={() => void signInWithApple()}
            />
          ) : null}

          <Button
            title={mode === 'signIn' ? t('auth.noAccount') : t('auth.haveAccount')}
            variant="ghost"
            fullWidth
            onPress={() => setMode((current) => (current === 'signIn' ? 'signUp' : 'signIn'))}
          />

          {mode === 'signIn' ? (
            <Button
              title={t('auth.forgotPassword')}
              variant="ghost"
              size="sm"
              fullWidth
              onPress={() => void resetPassword()}
            />
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
