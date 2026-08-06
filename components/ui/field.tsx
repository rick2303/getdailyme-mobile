import { forwardRef } from 'react'
import { Text, TextInput as RNTextInput, View, type TextInputProps } from 'react-native'

import { cn } from '@/lib/utils/cn'
import { useThemeColors } from '@/constants/colors'

export const TextInput = forwardRef<
  RNTextInput,
  TextInputProps & {
    label?: string
    hint?: string
    error?: string
    leading?: React.ReactNode
    trailing?: React.ReactNode
    className?: string
  }
>(function TextInput({ label, hint, error, leading, trailing, className, ...props }, ref) {
  const colors = useThemeColors()

  return (
    <View className="gap-1.5">
      {label ? (
        <Text className="px-1 text-sm font-semibold text-text-muted dark:text-text-muted-dark">
          {label}
        </Text>
      ) : null}
      <View
        className={cn(
          'flex-row items-center rounded-2xl border border-border bg-surface px-4 dark:border-border-dark dark:bg-surface-dark',
          error && 'border-danger',
          className,
        )}
      >
        {leading}
        <RNTextInput
          ref={ref}
          className="min-h-12 flex-1 py-3 text-base text-text dark:text-text-dark"
          placeholderTextColor={colors.textSubtle}
          {...props}
        />
        {trailing}
      </View>
      {error ? (
        <Text className="px-1 text-sm font-medium text-danger">{error}</Text>
      ) : hint ? (
        <Text className="px-1 text-sm text-text-subtle dark:text-text-subtle-dark">{hint}</Text>
      ) : null}
    </View>
  )
})

export function TextArea(
  props: TextInputProps & { label?: string; hint?: string; error?: string },
) {
  return <TextInput multiline numberOfLines={3} textAlignVertical="top" {...props} />
}
