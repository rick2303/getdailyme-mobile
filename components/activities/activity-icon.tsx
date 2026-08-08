import { View } from 'react-native'

import { useActivityHex, withTint } from '@/constants/colors'
import { getIconComponent } from '@/lib/icons'
import { cn } from '@/lib/utils/cn'

const SIZES = {
  sm: { box: 36, radius: 12, glyph: 20 },
  md: { box: 48, radius: 16, glyph: 24 },
  lg: { box: 64, radius: 20, glyph: 32 },
} as const

export function ActivityGlyph({
  icon,
  size,
  color,
  strokeWidth = 2.1,
}: {
  icon: string
  size: number
  color: string
  strokeWidth?: number
}) {
  const Glyph = getIconComponent(icon)
  return <Glyph size={size} color={color} strokeWidth={strokeWidth} />
}

export function ActivityIcon({
  icon,
  color,
  size = 'md',
  className,
}: {
  icon: string
  color: string
  size?: keyof typeof SIZES
  className?: string
}) {
  const hex = useActivityHex(color)
  const Glyph = getIconComponent(icon)
  const spec = SIZES[size]

  return (
    <View
      className={cn('items-center justify-center', className)}
      style={{
        width: spec.box,
        height: spec.box,
        borderRadius: spec.radius,
        backgroundColor: withTint(hex),
      }}
    >
      <Glyph size={spec.glyph} color={hex} strokeWidth={2.1} />
    </View>
  )
}
