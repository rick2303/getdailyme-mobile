import { ActivityIndicator, Pressable, Text, type PressableProps, type StyleProp, type ViewStyle } from 'react-native'

import { cn } from '@/lib/utils/cn'
import { SHADOW_TILE, useThemeColors } from '@/constants/colors'

// Mismos acabados que el boton de la web: sombra de tile en los solidos y
// escala 0.97 al pulsar en vez de bajar la opacidad.
type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const CONTAINER: Record<Variant, string> = {
  primary: 'bg-brand',
  secondary: 'bg-surface dark:bg-surface-dark border border-border dark:border-border-dark',
  ghost: 'bg-transparent',
  danger: 'bg-danger',
}

const HAS_SHADOW: Record<Variant, boolean> = {
  primary: true,
  secondary: true,
  ghost: false,
  danger: true,
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

const PRESSED_SCALE: ViewStyle = { transform: [{ scale: 0.97 }] }

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  fullWidth,
  loading,
  icon,
  className,
  labelClassName,
  disabled,
  style,
  ...props
}: PressableProps & {
  title: string
  variant?: Variant
  size?: Size
  fullWidth?: boolean
  loading?: boolean
  icon?: React.ReactNode
  className?: string
  labelClassName?: string
}) {
  const colors = useThemeColors()

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      style={({ pressed }) => [
        HAS_SHADOW[variant] && !disabled ? SHADOW_TILE : null,
        pressed ? PRESSED_SCALE : null,
        style as StyleProp<ViewStyle>,
      ]}
      className={cn(
        'flex-row items-center justify-center gap-2',
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
      <Text className={cn('font-semibold', LABEL[variant], SIZE[size].label, labelClassName)}>{title}</Text>
    </Pressable>
  )
}

const ICON_PRESSED_SCALE: ViewStyle = { transform: [{ scale: 0.9 }] }

export function IconButton({
  label,
  variant = 'ghost',
  children,
  className,
  disabled,
  style,
  ...props
}: PressableProps & {
  label: string
  variant?: 'ghost' | 'secondary'
  children: React.ReactNode
  className?: string
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      style={({ pressed }) => [
        variant === 'secondary' && !disabled ? SHADOW_TILE : null,
        pressed ? ICON_PRESSED_SCALE : null,
        style as StyleProp<ViewStyle>,
      ]}
      className={cn(
        'h-11 w-11 items-center justify-center rounded-full',
        variant === 'secondary' &&
          'border border-border bg-surface dark:border-border-dark dark:bg-surface-dark',
        disabled && 'opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </Pressable>
  )
}
