import { LinearGradient } from 'expo-linear-gradient'
import * as Sharing from 'expo-sharing'
import { Download, Share2 } from 'lucide-react-native'
import { useRef } from 'react'
import { Share, Text, View } from 'react-native'
import ViewShot, { captureRef } from 'react-native-view-shot'

import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/sheet'
import { useToast } from '@/components/ui/toast'
import { useThemeColors } from '@/constants/colors'
import { useI18n } from '@/i18n/provider'

// La tarjeta 9:16 del resumen, como la del canvas de la web pero dibujada con
// vistas nativas y capturada con view-shot: misma jerarquia (marca, titulo,
// numero grande, barras por dia, metricas y top de actividades).
export type RecapShareData = {
  heading: string
  rangeLabel: string
  totalLogs: number
  totalLabel: string
  deltaLabel: string | null
  metrics: { label: string; value: string }[]
  weekdayInitials: string[]
  countsByDay: number[]
  activities: { name: string; detail: string; count: number; color: string }[]
  activitiesLabel: string
  shareText: string
}

export function RecapShareSheet({
  open,
  data,
  onClose,
}: {
  open: boolean
  data: RecapShareData
  onClose: () => void
}) {
  const { t } = useI18n()
  const { showToast } = useToast()
  const colors = useThemeColors()
  const cardRef = useRef<ViewShot>(null)

  const shareImage = async () => {
    try {
      const uri = await captureRef(cardRef, { format: 'png', quality: 1 })
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png' })
      } else {
        showToast(t('common.genericError'), 'error')
      }
    } catch {
      showToast(t('weekly.imageFailed'), 'error')
    }
  }

  const shareText = async () => {
    try {
      await Share.share({ message: data.shareText })
    } catch {
      // Cancelar el menu del sistema no es un error.
    }
  }

  const peak = Math.max(...data.countsByDay, 1)
  const topPeak = Math.max(...data.activities.map((activity) => activity.count), 1)

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('weekly.shareTitle')}
      description={t('weekly.shareBody')}
      closeLabel={t('common.close')}
      footer={
        <View className="gap-2">
          <Button
            title={t('weekly.shareImage')}
            size="lg"
            fullWidth
            icon={<Share2 size={18} color="#fff" />}
            onPress={() => void shareImage()}
          />
          <Button
            title={t('weekly.copyText')}
            variant="secondary"
            fullWidth
            icon={<Download size={16} color={colors.text} />}
            onPress={() => void shareText()}
          />
        </View>
      }
    >
      <View className="items-center py-2">
        <ViewShot ref={cardRef} options={{ format: 'png', quality: 1 }}>
          <View style={{ width: 270, height: 480, borderRadius: 20, overflow: 'hidden' }}>
            <LinearGradient
              colors={[colors.brand + '3D', colors.surface, colors.surface]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.6, y: 1 }}
              style={{ flex: 1, padding: 20 }}
            >
              <Text className="text-xs font-extrabold" style={{ color: colors.brand }}>
                getdailyme
              </Text>
              <Text className="mt-3 text-xl font-extrabold" style={{ color: colors.text }}>
                {data.heading}
              </Text>
              <Text className="text-[11px] font-semibold" style={{ color: colors.textMuted }}>
                {data.rangeLabel}
              </Text>

              <View className="mt-4 flex-row items-end gap-2">
                <Text className="text-6xl font-extrabold" style={{ color: colors.text }}>
                  {data.totalLogs}
                </Text>
                <Text className="pb-2 text-xs font-bold" style={{ color: colors.textMuted }}>
                  {data.totalLabel}
                </Text>
              </View>

              {data.deltaLabel ? (
                <View
                  className="mt-1 self-start rounded-full px-2.5 py-1"
                  style={{ backgroundColor: colors.brand }}
                >
                  <Text className="text-[10px] font-bold text-white">{data.deltaLabel}</Text>
                </View>
              ) : null}

              <View className="mt-4 flex-row items-end justify-between gap-1">
                {data.countsByDay.map((count, index) => (
                  <View key={index} className="flex-1 items-center gap-1">
                    <View
                      className="w-full justify-end overflow-hidden rounded-md"
                      style={{ height: 48, backgroundColor: colors.text + '14' }}
                    >
                      <View
                        className="w-full rounded-md"
                        style={{
                          backgroundColor: colors.brand,
                          height: count > 0 ? Math.max(6, (count / peak) * 48) : 0,
                        }}
                      />
                    </View>
                    <Text className="text-[8px] font-bold" style={{ color: colors.textSubtle }}>
                      {data.weekdayInitials[index]}
                    </Text>
                  </View>
                ))}
              </View>

              <View className="mt-3 flex-row gap-2">
                {data.metrics.slice(0, 2).map((metric) => (
                  <View
                    key={metric.label}
                    className="flex-1 rounded-xl p-2.5"
                    style={{ backgroundColor: colors.text + '0D' }}
                  >
                    <Text className="text-sm font-extrabold" style={{ color: colors.text }} numberOfLines={1}>
                      {metric.value}
                    </Text>
                    <Text className="text-[9px] font-semibold" style={{ color: colors.textMuted }} numberOfLines={1}>
                      {metric.label}
                    </Text>
                  </View>
                ))}
              </View>

              <Text className="mt-3 text-[9px] font-bold uppercase" style={{ color: colors.textSubtle }}>
                {data.activitiesLabel}
              </Text>
              <View className="mt-1 gap-2">
                {data.activities.slice(0, 3).map((activity) => (
                  <View key={activity.name}>
                    <View className="flex-row items-center justify-between">
                      <Text className="text-[11px] font-extrabold" style={{ color: colors.text }} numberOfLines={1}>
                        {activity.name}
                      </Text>
                      <Text className="text-[11px] font-extrabold" style={{ color: activity.color }}>
                        {activity.count}
                      </Text>
                    </View>
                    <Text className="text-[9px]" style={{ color: colors.textMuted }} numberOfLines={1}>
                      {activity.detail}
                    </Text>
                    <View
                      className="mt-0.5 overflow-hidden rounded-full"
                      style={{ height: 5, backgroundColor: colors.text + '14' }}
                    >
                      <View
                        className="rounded-full"
                        style={{
                          height: 5,
                          backgroundColor: activity.color,
                          width: `${Math.max(6, (activity.count / topPeak) * 100)}%`,
                        }}
                      />
                    </View>
                  </View>
                ))}
              </View>

              <View className="flex-1" />
              <Text className="text-center text-[9px] font-semibold" style={{ color: colors.textSubtle }}>
                {t('weekly.imageFooter')}
              </Text>
            </LinearGradient>
          </View>
        </ViewShot>
      </View>
    </Sheet>
  )
}
