import { ActivityIndicator, Pressable, Text, type PressableProps } from 'react-native'

import { cn } from '@/lib/utils/cn'
import { useThemeColors } from '@/constants/colors'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const CONTAINER: Record<Variant, string> = {
  primary: 'bg-brand',
  secondary: 'bg-surface dark:bg-surface-dark border border-border dark:border-border-dark',
  ghost: 'bg-transparent',
  danger: 'bg-danger',
}

const LABEL: Record<Variant, string> = {
  primary: 'text-white',
  secondary: 'text-text dark:text-text-dark',
  ghost: 'text-text-muted dark:text-text-muted-dark',
  danger: 'text-white',
}

const SIZE: Record<Size, { box: string; label: string }> = {
  sm: { box: 'h-11 px-4 rounded-xl', label: 'text-sm' },
  md: { box: 'h-12 px-5 rounded-2xl', label: 'text-[15px]' },
  lg: { box: 'h-14 px-6 rounded-2xl', label: 'text-base' },
}

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  fullWidth,
  loading,
  icon,
  className,
  disabled,
  ...props
}: PressableProps & {
  title: string
  variant?: Variant
  size?: Size
  fullWidth?: boolean
  loading?: boolean
  icon?: React.ReactNode
  className?: string
}) {
  const colors = useThemeColors()

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      className={cn(
        'flex-row items-center justify-center gap-2 active:opacity-80',
        CONTAINER[variant],
        SIZE[size].box,
        fullWidth && 'w-full',
        (disabled || loading) && 'opacity-50',
        className,
      )}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'secondary' || variant === 'ghost' ? colors.text : '#fff'} />
      ) : (
        icon
      )}
      <Text className={cn('font-semibold', LABEL[variant], SIZE[size].label)}>{title}</Text>
    </Pressable>
  )
}

export function IconButton({
  label,
  children,
  className,
  disabled,
  ...props
}: PressableProps & { label: string; children: React.ReactNode; className?: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      className={cn(
        'h-11 w-11 items-center justify-center rounded-full active:opacity-70',
        disabled && 'opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </Pressable>
  )
}
