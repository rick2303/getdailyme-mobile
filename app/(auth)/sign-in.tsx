import { AtSign, Lock } from 'lucide-react-native'
import { useState } from 'react'
import { Alert, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Button } from '@/components/ui/button'
import { TextInput } from '@/components/ui/field'
import { useToast } from '@/components/ui/toast'
import { useI18n } from '@/i18n/provider'
import { useThemeColors } from '@/constants/colors'
import { supabase } from '@/lib/supabase/client'

type Mode = 'signIn' | 'signUp'

// Contraseña primero, como en la web: entra al instante sin esperar correos.
// Google/Apple llegan con la fase de OAuth nativo (necesitan build de EAS para
// probarse de verdad, no tiene sentido fingirlos en desarrollo).
export default function SignInScreen() {
  const { t } = useI18n()
  const { showToast } = useToast()
  const colors = useThemeColors()

  const [mode, setMode] = useState<Mode>('signIn')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [pending, setPending] = useState(false)

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
