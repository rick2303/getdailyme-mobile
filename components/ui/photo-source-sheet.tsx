import { Camera, ImagePlus } from 'lucide-react-native'
import { Text, View } from 'react-native'

import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/sheet'
import { useThemeColors } from '@/constants/colors'
import { useI18n } from '@/i18n/provider'
import type { PhotoSource } from '@/lib/utils/pick-image'

// Camara o galeria. Va en una hoja y no en un ActionSheet nativo porque el de
// Android no existe y el de iOS no se puede tematizar como el resto de la app.
export function PhotoSourceSheet({
  open,
  onClose,
  onPick,
}: {
  open: boolean
  onClose: () => void
  onPick: (source: PhotoSource) => void
}) {
  const { t } = useI18n()
  const colors = useThemeColors()

  return (
    <Sheet open={open} onClose={onClose} title={t('log.addPhoto')} closeLabel={t('common.close')}>
      <View className="gap-2.5 pb-2 pt-1">
        <Button
          title={t('log.takePhoto')}
          size="lg"
          fullWidth
          icon={<Camera size={18} color="#fff" />}
          onPress={() => onPick('camera')}
        />
        <Button
          title={t('log.choosePhoto')}
          variant="secondary"
          size="lg"
          fullWidth
          icon={<ImagePlus size={18} color={colors.text} />}
          onPress={() => onPick('library')}
        />
        <Text className="px-1 pt-1 text-center text-xs text-text-subtle dark:text-text-subtle-dark">
          {t('log.photoLabel')} · {t('common.optional')}
        </Text>
      </View>
    </Sheet>
  )
}
