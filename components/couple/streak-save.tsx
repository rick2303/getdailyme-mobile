import { LifeBuoy } from 'lucide-react-native'
import { Text, View } from 'react-native'

import { CoupleGroup } from '@/components/couple/couple-group'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { useThemeColors } from '@/constants/colors'
import { useI18n } from '@/i18n/provider'
import { useCoupleStreak, useSaveCoupleDay } from '@/lib/hooks/use-couple-answers'
import { ICON_STROKE } from '@/lib/icons/tokens'
import { haptic } from '@/lib/utils/haptics'

export function StreakSave({ coupleId, today }: { coupleId: string; today: string }) {
  const { t } = useI18n()
  const { showToast } = useToast()
  const colors = useThemeColors()
  const { data: streak } = useCoupleStreak(coupleId, today)
  const save = useSaveCoupleDay(coupleId)

  const savable = streak?.savable ?? null
  if (!savable) return null

  return (
    <CoupleGroup footer={t('couple.saveHelp')}>
      <View className="flex-row items-start gap-3 p-4">
        <LifeBuoy size={24} color={colors.brand} strokeWidth={ICON_STROKE.airy} />
        <View className="min-w-0 flex-1 gap-3">
          <View className="gap-0.5">
            <Text className="text-[15px] font-bold text-text dark:text-text-dark">
              {t('couple.saveTitle')}
            </Text>
            <Text className="text-sm text-text-muted dark:text-text-muted-dark">
              {t('couple.saveBody')}
            </Text>
          </View>

          <Button
            title={t('couple.saveAction')}
            fullWidth
            loading={save.isPending}
            onPress={() => {
              haptic('success')
              save.mutate(savable, {
                onSuccess: (outcome) => {
                  if (outcome === 'saved') {
                    showToast(t('couple.saved'), 'success')
                    return
                  }
                  if (outcome === 'month_spent') {
                    showToast(t('couple.saveSpent'), 'success')
                    return
                  }
                  if (outcome === 'already_done') {
                    showToast(t('couple.saveAlreadyDone'), 'success')
                    return
                  }
                  showToast(t('common.genericError'), 'error')
                },
                onError: () => showToast(t('common.genericError'), 'error'),
              })
            }}
          />
        </View>
      </View>
    </CoupleGroup>
  )
}
