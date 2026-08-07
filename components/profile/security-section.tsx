import { KeyRound, Lock } from 'lucide-react-native'
import { useState } from 'react'
import { Text, View } from 'react-native'

import { Button } from '@/components/ui/button'
import { TextInput } from '@/components/ui/field'
import { Sheet } from '@/components/ui/sheet'
import { useToast } from '@/components/ui/toast'
import { SHADOW_TILE, useThemeColors } from '@/constants/colors'
import { useI18n } from '@/i18n/provider'
import { useAuth } from '@/lib/auth/provider'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

// La seccion de seguridad de la web: poner o cambiar la contraseña de la
// cuenta, tambien util para quien entro con Google o Apple.
const MIN_PASSWORD_LENGTH = 8

export function SecuritySection() {
  const { t } = useI18n()
  const { user } = useAuth()
  const { showToast } = useToast()
  const colors = useThemeColors()

  const [editing, setEditing] = useState(false)

  const hasPassword = Boolean(user?.identities?.some((identity) => identity.provider === 'email'))

  return (
    <View className="gap-2">
      <Text className="px-1 text-sm font-bold uppercase tracking-wide text-text dark:text-text-dark">
        {t('security.title')}
      </Text>

      <View
        style={SHADOW_TILE}
        className="gap-3 rounded-3xl border border-border bg-surface p-4 dark:border-border-dark dark:bg-surface-dark"
      >
        <View className="flex-row items-center gap-2">
          <KeyRound size={16} color={colors.textMuted} />
          <Text className="text-sm font-bold text-text-muted dark:text-text-muted-dark">
            {t('security.passwordSection')}
          </Text>
        </View>
        <Text className="text-xs text-text-subtle dark:text-text-subtle-dark">
          {t('security.setPasswordHelp')}
        </Text>
        <Button
          title={hasPassword ? t('security.changePassword') : t('security.setPassword')}
          variant="secondary"
          size="lg"
          fullWidth
          icon={<Lock size={18} color={colors.text} />}
          onPress={() => setEditing(true)}
        />
      </View>

      <PasswordSheet
        open={editing}
        title={hasPassword ? t('security.changePassword') : t('security.setPassword')}
        onClose={() => setEditing(false)}
        onSaved={() => showToast(t('security.passwordUpdated'), 'success')}
        onFailed={() => showToast(t('security.passwordUpdateFailed'), 'error')}
      />
    </View>
  )
}

function PasswordSheet({
  open,
  title,
  onClose,
  onSaved,
  onFailed,
}: {
  open: boolean
  title: string
  onClose: () => void
  onSaved: () => void
  onFailed: () => void
}) {
  const { t } = useI18n()
  const colors = useThemeColors()

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setNewPassword('')
      setConfirmPassword('')
      setError(null)
      setSaving(false)
    }
  }

  const save = async () => {
    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      setError(t('auth.passwordTooShort'))
      return
    }
    if (newPassword !== confirmPassword) {
      setError(t('auth.passwordsDontMatch'))
      return
    }

    setSaving(true)
    const { error: updateError } = await getSupabaseBrowserClient().auth.updateUser({
      password: newPassword,
    })
    setSaving(false)

    if (updateError) {
      setError(t('auth.weakPassword'))
      onFailed()
      return
    }

    onSaved()
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={title}
      description={t('security.setPasswordHelp')}
      closeLabel={t('common.close')}
      footer={
        <Button
          title={saving ? t('common.saving') : t('common.save')}
          size="lg"
          fullWidth
          disabled={saving}
          loading={saving}
          onPress={() => void save()}
        />
      }
    >
      <View className="gap-4 pt-2">
        <TextInput
          label={t('auth.newPassword')}
          placeholder={t('auth.passwordPlaceholder')}
          value={newPassword}
          secureTextEntry
          autoCapitalize="none"
          leading={<KeyRound size={20} color={colors.textSubtle} />}
          onChangeText={(text) => {
            setNewPassword(text)
            setError(null)
          }}
        />
        <TextInput
          label={t('auth.confirmPassword')}
          placeholder={t('auth.passwordPlaceholder')}
          value={confirmPassword}
          error={error ?? undefined}
          secureTextEntry
          autoCapitalize="none"
          leading={<Lock size={20} color={colors.textSubtle} />}
          onChangeText={(text) => {
            setConfirmPassword(text)
            setError(null)
          }}
        />
      </View>
    </Sheet>
  )
}
