import { Minus, Plus } from 'lucide-react-native'
import { useEffect } from 'react'
import { Pressable, Text, View } from 'react-native'
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated'

import { SHADOW_TILE, useActivityHex, useThemeColors, withTint, withTintStrong } from '@/constants/colors'
import { useI18n } from '@/i18n/provider'
import { useActivityLabels } from '@/lib/activities/labels'
import type { Activity } from '@/lib/api/types'
import { ICON_STROKE } from '@/lib/icons/tokens'
import { cn } from '@/lib/utils/cn'
import { haptic } from '@/lib/utils/haptics'

const SPRING = { stiffness: 260, damping: 30 }

// El medidor de las hojas de registro, como en la web: en vez de describir lo
// que va a pasar, se ensena. Lo que ya llevas en el periodo sube desde abajo y
// encima, mas claro, lo que estas a punto de sumar. La cifra grande es lo que
// se suma; debajo, de donde a donde te deja.
export function LogMeter({
  activity,
  total,
  adding,
  step,
  onChange,
  compact = false,
}: {
  activity: Activity
  total: number
  adding: number
  step: number
  onChange: (next: number) => void
  // Mas bajo, para la hoja de detalle, donde lo que se viene a ver es la lista.
  compact?: boolean
}) {
  const { t } = useI18n()
  const { unitLabel } = useActivityLabels()
  const colors = useThemeColors()
  const hex = useActivityHex(activity.color)
  const reducedMotion = useReducedMotion()

  const target = activity.daily_target ?? 0
  const after = total + adding
  const base = target > 0 ? Math.min(1, total / target) : 0
  const preview = target > 0 ? Math.min(1, after / target) : 0
  const reaches = target > 0 && total < target && after >= target

  // El relleno amortigua hacia el nuevo nivel, como el anillo del tile de Hoy.
  const baseHeight = useSharedValue(base * 100)
  const previewHeight = useSharedValue(preview * 100)
  useEffect(() => {
    baseHeight.value = reducedMotion ? base * 100 : withSpring(base * 100, SPRING)
    previewHeight.value = reducedMotion ? preview * 100 : withSpring(preview * 100, SPRING)
  }, [base, preview, baseHeight, previewHeight, reducedMotion])
  const baseStyle = useAnimatedStyle(() => ({ height: `${baseHeight.value}%` }))
  const previewStyle = useAnimatedStyle(() => ({ height: `${previewHeight.value}%` }))

  const bump = (delta: number) => {
    haptic('tap')
    onChange(Math.max(step, adding + delta))
  }

  return (
    <View
      className={cn(
        'items-center justify-center overflow-hidden rounded-3xl bg-surface-sunken px-3 dark:bg-surface-sunken-dark',
        compact ? 'min-h-32 py-4' : 'min-h-48 py-6',
      )}
    >
      <Animated.View
        pointerEvents="none"
        className="absolute inset-x-0 bottom-0"
        style={[{ backgroundColor: withTint(hex) }, previewStyle]}
      />
      <Animated.View
        pointerEvents="none"
        className="absolute inset-x-0 bottom-0"
        style={[{ backgroundColor: withTintStrong(hex) }, baseStyle]}
      />

      <View className="w-full flex-row items-center justify-between gap-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.decrease')}
          disabled={adding <= step}
          onPress={() => bump(-step)}
          style={SHADOW_TILE}
          className={cn(
            'h-14 w-14 items-center justify-center rounded-full bg-surface active:scale-90 dark:bg-surface-dark',
            adding <= step ? 'opacity-40' : '',
          )}
        >
          <Minus size={24} color={colors.text} strokeWidth={ICON_STROKE.emphasis} />
        </Pressable>

        <View className="min-w-0 flex-1 items-center">
          <Text
            maxFontSizeMultiplier={1.2}
            className={cn('font-extrabold leading-none', compact ? 'text-[34px]' : 'text-[56px]')}
            style={{ color: hex, fontVariant: ['tabular-nums'] }}
          >
            +{adding}
          </Text>
          <Text className="mt-1 text-sm text-text-muted dark:text-text-muted-dark" numberOfLines={1}>
            {unitLabel(activity.unit, adding)}
          </Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.increase')}
          onPress={() => bump(step)}
          style={SHADOW_TILE}
          className="h-14 w-14 items-center justify-center rounded-full bg-surface active:scale-90 dark:bg-surface-dark"
        >
          <Plus size={24} color={colors.text} strokeWidth={ICON_STROKE.emphasis} />
        </Pressable>
      </View>

      <Text
        className="mt-3 text-xs text-text-muted dark:text-text-muted-dark"
        style={{ fontVariant: ['tabular-nums'] }}
      >
        {target > 0
          ? reaches
            ? t('quickLog.meterReaches', { target })
            : t('quickLog.meterProgress', { total, after, target })
          : t('quickLog.meterNoTarget', { total, after })}
      </Text>
    </View>
  )
}
