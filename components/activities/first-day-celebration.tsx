import { Flame, Share2 } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { Modal, Pressable, Text, View } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
} from 'react-native-reanimated'

import { useShareInvite } from '@/components/invite/use-share-invite'
import { Button } from '@/components/ui/button'
import { SHADOW_TILE, useThemeColors, withTintStrong } from '@/constants/colors'
import { useI18n } from '@/i18n/provider'
import { haptic } from '@/lib/utils/haptics'

const SHOW_AFTER_MS = 450

export function FirstDayCelebration({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n()
  const colors = useThemeColors()
  const reducedMotion = useReducedMotion()
  const { share, ready } = useShareInvite()
  const [shown, setShown] = useState(false)
  const fill = useSharedValue(0)

  useEffect(() => {
    if (!open) {
      setShown(false)
      return
    }
    const timeout = setTimeout(() => setShown(true), SHOW_AFTER_MS)
    return () => clearTimeout(timeout)
  }, [open])

  useEffect(() => {
    if (!shown) {
      fill.value = 0
      return
    }
    haptic('success')
    fill.value = reducedMotion ? 1 : withDelay(100, withSpring(1, { stiffness: 90, damping: 20 }))
  }, [shown, reducedMotion, fill])

  const fillStyle = useAnimatedStyle(() => ({ height: `${fill.value * 100}%` }))

  const invite = async () => {
    haptic('tap')
    if (await share('friend')) onClose()
  }

  return (
    <Modal visible={shown} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/45 px-6">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          onPress={onClose}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <View
          accessibilityViewIsModal
          style={SHADOW_TILE}
          className="w-full max-w-xs overflow-hidden rounded-[28px] bg-surface px-6 pb-6 pt-8 dark:bg-surface-dark"
        >
          <Animated.View
            pointerEvents="none"
            style={[
              { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: withTintStrong(colors.brand) },
              fillStyle,
            ]}
          />

          <View className="items-center">
            <Flame size={40} color={colors.streak} strokeWidth={2.5} />

            <View className="mt-2 flex-row items-baseline gap-2">
              <Text className="text-xl font-bold text-text-muted dark:text-text-muted-dark">
                {t('firstDay.dayLabel')}
              </Text>
              <Text
                maxFontSizeMultiplier={1.2}
                className="text-6xl font-extrabold text-text dark:text-text-dark"
                style={{ fontVariant: ['tabular-nums'] }}
              >
                1
              </Text>
            </View>

            <Text
              accessibilityRole="header"
              className="mt-4 text-center text-xl font-extrabold text-text dark:text-text-dark"
            >
              {t('firstDay.title')}
            </Text>
            <Text className="mt-1.5 text-center text-[15px] leading-relaxed text-text-muted dark:text-text-muted-dark">
              {t('firstDay.body')}
            </Text>

            <View className="mt-6 w-full gap-2">
              <Button title={t('firstDay.done')} size="lg" fullWidth onPress={onClose} />
              <Button
                title={t('firstDay.invite')}
                size="lg"
                fullWidth
                variant="secondary"
                disabled={!ready}
                icon={<Share2 size={18} color={colors.text} />}
                onPress={() => void invite()}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  )
}
