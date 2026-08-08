import { LinearGradient } from 'expo-linear-gradient'
import * as Sharing from 'expo-sharing'
import { Flame, Share2 } from 'lucide-react-native'
import { useRef } from 'react'
import { Text, View } from 'react-native'
import ViewShot, { captureRef } from 'react-native-view-shot'

import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/sheet'
import { useToast } from '@/components/ui/toast'
import { useThemeColors } from '@/constants/colors'
import { useI18n } from '@/i18n/provider'
import { useAuth } from '@/lib/auth/provider'

// La celebracion de hitos de racha (7, 30, 100, 365 dias): tarjeta con la
// llama y el numero grande, compartible como imagen igual que el resumen.
export const STREAK_MILESTONES = [7, 30, 100, 365]

export function MilestoneSheet({
  milestone,
  onClose,
}: {
  milestone: number | null
  onClose: () => void
}) {
  const { t } = useI18n()
  const { showToast } = useToast()
  const { profile } = useAuth()
  const colors = useThemeColors()
  const cardRef = useRef<ViewShot>(null)

  const share = async () => {
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1 })
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png' })
      }
    } catch {
      showToast(t('common.genericError'), 'error')
    }
  }

  if (milestone === null) return null

  return (
    <Sheet
      open={milestone !== null}
      onClose={onClose}
      title={t('milestones.title', { count: milestone })}
      description={t('milestones.body')}
      closeLabel={t('common.close')}
      footer={
        <Button
          title={t('milestones.shareCta')}
          size="lg"
          fullWidth
          icon={<Share2 size={18} color="#fff" />}
          onPress={() => void share()}
        />
      }
    >
      <View className="items-center py-3">
        <ViewShot ref={cardRef} options={{ format: 'png', quality: 1 }}>
          <View style={{ width: 280, height: 280, borderRadius: 24, overflow: 'hidden' }}>
            <LinearGradient
              colors={['#F97316' + '2E', colors.surface, colors.surface]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.7, y: 1 }}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}
            >
              <Text className="text-xs font-extrabold" style={{ color: colors.brand }}>
                getdailyme
              </Text>
              <View
                className="mt-4 h-20 w-20 items-center justify-center rounded-full"
                style={{ backgroundColor: '#F97316' + '26' }}
              >
                <Flame size={40} color="#F97316" strokeWidth={2.5} />
              </View>
              <Text className="mt-4 text-5xl font-extrabold" style={{ color: colors.text }}>
                {milestone}
              </Text>
              <Text className="text-base font-bold" style={{ color: colors.textMuted }}>
                {t('stats.days', { count: milestone })}
              </Text>
              {profile ? (
                <Text className="mt-2 text-sm font-semibold" style={{ color: colors.textSubtle }}>
                  @{profile.username}
                </Text>
              ) : null}
              <Text className="mt-3 text-[10px] font-semibold" style={{ color: colors.textSubtle }}>
                {t('milestones.cardFooter')}
              </Text>
            </LinearGradient>
          </View>
        </ViewShot>
      </View>
    </Sheet>
  )
}
