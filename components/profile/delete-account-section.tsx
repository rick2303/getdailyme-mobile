import { Trash2 } from 'lucide-react-native'
import { useState } from 'react'
import { View } from 'react-native'

import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useToast } from '@/components/ui/toast'
import { useThemeColors } from '@/constants/colors'
import { useI18n } from '@/i18n/provider'
import { requestAccountDeletion } from '@/lib/push/client'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'

// Borrar la cuenta desde el aparato: la Edge Function limpia storage y borra
// el usuario; despues solo queda cerrar la sesion local, contra el servidor
// fallaria porque la cuenta ya no existe.
export function DeleteAccountSection() {
  const { t } = useI18n()
  const { showToast } = useToast()
  const colors = useThemeColors()

  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const deleteAccount = async () => {
    setDeleting(true)
    try {
      await requestAccountDeletion()
      await getSupabaseBrowserClient()
        .auth.signOut({ scope: 'local' })
        .catch(() => undefined)
    } catch {
      setDeleting(false)
      setConfirming(false)
      showToast(t('profile.deleteAccountFailed'), 'error')
    }
  }

  return (
    <View>
      <Button
        title={t('profile.deleteAccount')}
        variant="ghost"
        size="lg"
        fullWidth
        icon={<Trash2 size={18} color={colors.danger} />}
        onPress={() => setConfirming(true)}
      />

      <ConfirmDialog
        open={confirming}
        title={t('profile.deleteAccountTitle')}
        body={t('profile.deleteAccountBody')}
        confirmLabel={t('profile.deleteAccountConfirm')}
        pending={deleting}
        onConfirm={() => void deleteAccount()}
        onCancel={() => setConfirming(false)}
      />
    </View>
  )
}
