import { Image, Text, View } from 'react-native'

import { cn } from '@/lib/utils/cn'

const SIZES = {
  sm: { box: 'h-9 w-9', label: 'text-xs' },
  md: { box: 'h-11 w-11', label: 'text-sm' },
  lg: { box: 'h-20 w-20', label: 'text-2xl' },
} as const

function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  if (parts.length === 0) return '?'
  return parts.map((part) => part.charAt(0).toUpperCase()).join('')
}

export function Avatar({
  name,
  src,
  size = 'md',
  className,
}: {
  name: string
  src?: string | null
  size?: keyof typeof SIZES
  className?: string
}) {
  return (
    <View
      className={cn(
        'items-center justify-center overflow-hidden rounded-full bg-brand-soft dark:bg-brand-soft-dark',
        SIZES[size].box,
        className,
      )}
    >
      {src ? (
        <Image source={{ uri: src }} className="h-full w-full" accessibilityLabel={name} />
      ) : (
        <Text className={cn('font-bold text-brand dark:text-brand-dark', SIZES[size].label)}>
          {initialsFrom(name)}
        </Text>
      )}
    </View>
  )
}
