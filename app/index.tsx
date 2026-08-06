import { Text, View } from 'react-native'

import { useT } from '@/i18n/provider'

// Pantalla provisional: confirma que el runtime, NativeWind y el i18n portado
// arrancan. Las pantallas reales llegan por fases sobre esta base.
export default function Index() {
  const t = useT()

  return (
    <View className="flex-1 items-center justify-center bg-bg dark:bg-bg-dark">
      <Text className="text-2xl font-extrabold text-brand">{t('common.appName')}</Text>
      <Text className="mt-2 text-sm text-text-muted dark:text-text-muted-dark">
        {t('common.tagline')}
      </Text>
    </View>
  )
}
