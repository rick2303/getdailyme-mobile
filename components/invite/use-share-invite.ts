import { Share } from 'react-native'

import { useToast } from '@/components/ui/toast'
import { useI18n } from '@/i18n/provider'
import { coupleInviteUrl } from '@/lib/api/couple'
import { inviteUrl } from '@/lib/api/invites'
import { useInviteToken } from '@/lib/hooks/use-invite'

export const APP_ORIGIN = 'https://app.getdailyme.com'

export type InviteKind = 'friend' | 'couple'

export function useShareInvite() {
  const { t } = useI18n()
  const { showToast } = useToast()
  const { data: inviteToken } = useInviteToken()

  const share = async (as: InviteKind): Promise<boolean> => {
    if (!inviteToken) {
      showToast(t('common.genericError'), 'error')
      return false
    }

    const url =
      as === 'couple' ? coupleInviteUrl(APP_ORIGIN, inviteToken) : inviteUrl(APP_ORIGIN, inviteToken)
    const message = as === 'couple' ? t('couple.proposeMessage') : t('friends.inviteMessage')

    try {
      const result = await Share.share({ message: `${message}\n${url}` })
      return result.action === Share.sharedAction
    } catch {
      return false
    }
  }

  return { share, ready: Boolean(inviteToken) }
}
