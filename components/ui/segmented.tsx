import { Pressable, Text, View } from 'react-native'

import { SHADOW_TILE } from '@/constants/colors'
import { cn } from '@/lib/utils/cn'

export type SegmentedOption<T extends string> = { value: T; label: string }

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: SegmentedOption<T>[]
  onChange: (next: T) => void
}) {
  return (
    <View className="flex-row gap-1 rounded-2xl bg-surface-sunken p-1 dark:bg-surface-sunken-dark">
      {options.map((option) => {
        const selected = option.value === value
        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={selected ? SHADOW_TILE : undefined}
            className={cn(
              'min-h-11 flex-1 items-center justify-center rounded-xl',
              selected && 'bg-surface dark:bg-surface-raised-dark',
            )}
          >
            <Text
              maxFontSizeMultiplier={1.2}
              className={cn(
                'text-sm font-semibold',
                selected
                  ? 'text-text dark:text-text-dark'
                  : 'text-text-muted dark:text-text-muted-dark',
              )}
            >
              {option.label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}
