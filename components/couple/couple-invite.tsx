import { useRouter } from 'expo-router'
import { Heart, HeartHandshake, Link2Off } from 'lucide-react-native'

import { InviteOutcome } from '@/components/invite/outcome'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/feedback'
import { useToast } from '@/components/ui/toast'
import { useThemeColors } from '@/constants/colors'
import { useI18n } from '@/i18n/provider'
import { useRedeemCoupleInvite } from '@/lib/hooks/use-couple'
import { useInvitePreview } from '@/lib/hooks/use-invite'
import { haptic } from '@/lib/utils/haptics'

export const COUPLE_PARAM = 'pareja'

export function CoupleInvite({ token }: { token: string }) {
  const { t } = useI18n()
  const router = useRouter()
  const colors = useThemeColors()
  const { showToast } = useToast()
  const preview = useInvitePreview(token, true)
  const redeem = useRedeemCoupleInvite()

  const name = redeem.data?.inviter?.displayName ?? preview.data?.displayName ?? ''

  const goFriends = (
    <Button
      title={t('invite.goToFriends')}
      size="lg"
      fullWidth
      onPress={() => router.replace('/friends')}
    />
  )

  if (preview.isLoading) return <Spinner />

  if (!preview.data) {
    return (
      <InviteOutcome
        icon={<Link2Off size={26} color={colors.brand} />}
        title={t('invite.invalidTitle')}
        body={t('invite.invalidBody')}
        action={goFriends}
      />
    )
  }

  const result = redeem.data?.outcome

  if (result === 'paired' || result === 'already_us') {
    return (
      <>
        <Avatar name={name} src={redeem.data?.inviter?.avatarUrl ?? preview.data.avatarUrl} size="lg" />
        <InviteOutcome
          icon={<Heart size={26} color={colors.brand} fill={colors.brand} />}
          title={t(result === 'paired' ? 'couple.paired' : 'couple.alreadyUs')}
          action={
            <Button
              title={t('couple.title')}
              size="lg"
              fullWidth
              onPress={() => router.replace('/couple')}
            />
          }
        />
      </>
    )
  }

  const blocked =
    result === 'already_paired'
      ? t('couple.alreadyPaired')
      : result === 'partner_taken'
        ? t('couple.partnerTaken', { name })
        : result === 'self'
          ? t('invite.selfBody')
          : result === 'blocked'
            ? t('invite.blockedBody')
            : result === 'invalid'
              ? t('invite.invalidBody')
              : null

  return (
    <>
      <Avatar name={preview.data.displayName} src={preview.data.avatarUrl} size="lg" />
      <InviteOutcome
        icon={<HeartHandshake size={26} color={colors.brand} />}
        title={t('couple.previewTitle', { name: preview.data.displayName })}
        body={blocked ?? t('couple.previewBody')}
        action={
          blocked ? (
            goFriends
          ) : (
            <Button
              title={t('couple.previewCta')}
              size="lg"
              fullWidth
              loading={redeem.isPending}
              onPress={() => {
                haptic('success')
                redeem.mutate(token, {
                  onError: () => showToast(t('common.genericError'), 'error'),
                })
              }}
            />
          )
        }
      />
    </>
  )
}
