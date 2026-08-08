import * as AppleAuthentication from 'expo-apple-authentication'
import { LinearGradient } from 'expo-linear-gradient'
import * as WebBrowser from 'expo-web-browser'
import { ArrowRight, AtSign, Lock } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { Alert, Platform, Pressable, ScrollView, Text, useColorScheme, View } from 'react-native'
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { BrandLogo } from '@/components/brand/brand-logo'
import { GoogleMark } from '@/components/brand/google-mark'
import { Button } from '@/components/ui/button'
import { TextInput } from '@/components/ui/field'
import { useToast } from '@/components/ui/toast'
import { useI18n } from '@/i18n/provider'
import { SHADOW_TILE, useThemeColors } from '@/constants/colors'
import { supabase } from '@/lib/supabase/client'

WebBrowser.maybeCompleteAuthSession()

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 8
const OAUTH_REDIRECT = 'getdailyme://auth/callback'

// La pantalla de acceso de la PWA, uno a uno: hero con el logo, error inline
// bajo los campos (no en toast), CTA con flecha, alternar crear cuenta /
// olvide contraseña en la misma fila, divisor, Google con su marca y Apple
// con el boton oficial. El enlace magico se queda en la web: en nativo el
// correo no puede volver a la app hasta que el dominio este vivo.
export default function SignInScreen() {
  const { t } = useI18n()
  const { showToast } = useToast()
  const colors = useThemeColors()
  const scheme = useColorScheme()

  const [creatingAccount, setCreatingAccount] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [busyGoogle, setBusyGoogle] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [appleAvailable, setAppleAvailable] = useState(false)

  useEffect(() => {
    AppleAuthentication.isAvailableAsync()
      .then(setAppleAvailable)
      .catch(() => setAppleAvailable(false))
  }, [])

  const submitPassword = async () => {
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError(t('auth.invalidEmail'))
      return
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(t('auth.passwordTooShort'))
      return
    }

    setBusy(true)
    setError(null)

    try {
      if (creatingAccount) {
        const { error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        })
        if (signUpError) {
          const message = signUpError.message.toLowerCase()
          if (message.includes('already')) setError(t('auth.emailInUse'))
          else if (message.includes('weak') || message.includes('password'))
            setError(t('auth.weakPassword'))
          else setError(t('auth.failed'))
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        })
        if (signInError) setError(t('auth.wrongCredentials'))
      }
    } catch {
      setError(t('auth.failed'))
    } finally {
      setBusy(false)
    }
  }

  // Receta splitwo: URL con skipBrowserRedirect, navegador del sistema y canje
  // del codigo PKCE aqui mismo, recortando el fragmento fantasma de iOS.
  const signInWithGoogle = async () => {
    setBusyGoogle(true)
    setError(null)
    try {
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: OAUTH_REDIRECT,
          skipBrowserRedirect: true,
          queryParams: { prompt: 'select_account' },
        },
      })
      if (oauthError || !data.url) throw oauthError ?? new Error('sin url de oauth')

      const result = await WebBrowser.openAuthSessionAsync(data.url, OAUTH_REDIRECT)
      if (result.type !== 'success') return

      const queryString = result.url.split('#')[0].split('?')[1] ?? ''
      const params = Object.fromEntries(new URLSearchParams(queryString))

      if (params.error) {
        setError(t('auth.failed'))
        return
      }

      if (params.code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(params.code)
        if (exchangeError) {
          const {
            data: { session },
          } = await supabase.auth.getSession()
          if (!session?.user) setError(t('auth.failed'))
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
          setError(t('auth.failed'))
        }
      }
    } catch {
      setError(t('auth.failed'))
    } finally {
      setBusyGoogle(false)
    }
  }

  const signInWithApple = async () => {
    setError(null)
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      })
      if (!credential.identityToken) throw new Error('sin identity token')

      const { error: signInError } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      })
      if (signInError) throw signInError

      // Apple solo entrega el nombre la primera vez: se guarda para que el
      // onboarding no arranque con un nombre generado.
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
        setError(t('auth.failed'))
      }
    }
  }

  const resetPassword = async () => {
    if (!EMAIL_PATTERN.test(email.trim())) {
      setError(t('auth.invalidEmail'))
      return
    }
    try {
      await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: 'https://app.getdailyme.com/reset-password',
      })
      Alert.alert(t('auth.resetSentTitle'), t('auth.resetSentBody', { email: email.trim() }))
    } catch {
      showToast(t('common.genericError'), 'error')
    }
  }

  return (
    <View className="flex-1 bg-bg dark:bg-bg-dark">
      <LinearGradient
        colors={[colors.brandSoft, scheme === 'dark' ? '#121219' : '#F8F8FB']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.55 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 420 }}
      />
      <SafeAreaView className="flex-1">
        <ScrollView
          contentContainerClassName="flex-grow justify-center px-6 py-8"
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View entering={FadeInDown.duration(500)} className="items-center gap-4 pb-8">
            <View
              style={SHADOW_TILE}
              className="h-24 w-24 items-center justify-center rounded-[28px] bg-surface dark:bg-surface-dark"
            >
              <BrandLogo size={56} />
            </View>
            <View className="items-center">
              <Text className="text-center text-3xl font-extrabold tracking-tight text-text dark:text-text-dark">
                {t('auth.welcomeTitle')}
              </Text>
              <Text className="mt-2 px-4 text-center text-[15px] leading-relaxed text-text-muted dark:text-text-muted-dark">
                {t('auth.welcomeSubtitle')}
              </Text>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInUp.delay(120).duration(500)} className="gap-4">
          <TextInput
            label={t('auth.emailLabel')}
            placeholder={t('auth.emailPlaceholder')}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            value={email}
            onChangeText={(text) => {
              setEmail(text)
              setError(null)
            }}
            leading={<AtSign size={18} color={colors.textSubtle} />}
          />

          <TextInput
            label={t('auth.passwordLabel')}
            placeholder={t('auth.passwordPlaceholder')}
            secureTextEntry
            autoCapitalize="none"
            autoComplete={creatingAccount ? 'new-password' : 'current-password'}
            value={password}
            onChangeText={(text) => {
              setPassword(text)
              setError(null)
            }}
            leading={<Lock size={18} color={colors.textSubtle} />}
          />

          {error ? (
            <Text className="px-1 text-sm font-medium text-danger">{error}</Text>
          ) : null}

          <Button
            title={busy ? t('common.loading') : creatingAccount ? t('auth.signUp') : t('auth.signIn')}
            size="lg"
            fullWidth
            disabled={busy}
            loading={busy}
            icon={busy ? undefined : <ArrowRight size={18} color="#fff" />}
            onPress={() => void submitPassword()}
          />

          <View className="flex-row items-center justify-between px-1">
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setCreatingAccount((value) => !value)
                setError(null)
              }}
            >
              <Text className="text-sm font-semibold text-brand dark:text-brand-dark">
                {creatingAccount ? t('auth.haveAccount') : t('auth.noAccount')}
              </Text>
            </Pressable>
            {creatingAccount ? null : (
              <Pressable accessibilityRole="button" onPress={() => void resetPassword()}>
                <Text className="text-sm font-semibold text-text-muted dark:text-text-muted-dark">
                  {t('auth.forgotPassword')}
                </Text>
              </Pressable>
            )}
          </View>

          <View className="flex-row items-center gap-3 py-1">
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
            loading={busyGoogle}
            labelClassName="text-[17px]"
            icon={busyGoogle ? undefined : <GoogleMark size={20} />}
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
              style={[{ height: 56, width: '100%' }, SHADOW_TILE]}
              onPress={() => void signInWithApple()}
            />
          ) : null}

          <Text className="px-2 pt-2 text-center text-xs leading-relaxed text-text-subtle dark:text-text-subtle-dark">
            {t('auth.legal')}
          </Text>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  )
}
