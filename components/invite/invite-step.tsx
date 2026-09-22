import { Heart, Share2, Users } from 'lucide-react-native'
import { useState } from 'react'
import { Platform, Text, View } from 'react-native'
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { InviteOutcome } from '@/components/invite/outcome'
import { useShareInvite, type InviteKind } from '@/components/invite/use-share-invite'
import { Button } from '@/components/ui/button'
import { useThemeColors } from '@/constants/colors'
import { useI18n } from '@/i18n/provider'
import { haptic } from '@/lib/utils/haptics'

export function InviteStep({ onDone, leaving = false }: { onDone: () => void; leaving?: boolean }) {
  const { t } = useI18n()
  const colors = useThemeColors()
  const reducedMotion = useReducedMotion()
  const { share, ready } = useShareInvite()
  const [sent, setSent] = useState(false)

  const send = async (as: InviteKind) => {
    haptic('tap')
    if (await share(as)) {
      haptic('success')
      setSent(true)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bg-dark">
      <Animated.View
        entering={Platform.OS === 'ios' && !reducedMotion ? FadeInDown.springify().damping(30) : undefined}
        className="flex-1 justify-center px-6 py-8"
      >
        <InviteOutcome
          icon={<Users size={28} color={colors.brand} />}
          title={t('onboarding.inviteTitle')}
          body={t('onboarding.inviteBody')}
          action={
            <View className="w-full gap-2 pt-2">
              <Button
                title={t('onboarding.inviteCta')}
                size="lg"
                fullWidth
                variant={sent ? 'secondary' : 'primary'}
                disabled={!ready || leaving}
                icon={<Share2 size={18} color={sent ? colors.text : '#fff'} />}
                onPress={() => void send('friend')}
              />
              <Button
                title={t('couple.propose')}
                size="lg"
                fullWidth
                variant="secondary"
                disabled={!ready || leaving}
                icon={<Heart size={18} color={colors.text} />}
                onPress={() => void send('couple')}
              />
              <Button
                title={sent ? t('onboarding.inviteContinue') : t('onboarding.inviteLater')}
                size="lg"
                fullWidth
                variant={sent ? 'primary' : 'ghost'}
                loading={leaving}
                onPress={onDone}
              />
              <Text
                accessibilityLiveRegion="polite"
                className="pt-1 text-center text-xs text-text-subtle dark:text-text-subtle-dark"
              >
                {sent ? t('onboarding.inviteSent') : t('onboarding.inviteLaterHint')}
              </Text>
            </View>
          }
        />
      </Animated.View>
    </SafeAreaView>
  )
}
