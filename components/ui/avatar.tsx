import { Image, Text, View } from 'react-native'

import { useActivityHex, useActivityInk, withTint } from '@/constants/colors'
import { cn } from '@/lib/utils/cn'

const SIZES = {
  sm: { box: 'h-9 w-9', label: 'text-xs' },
  md: { box: 'h-11 w-11', label: 'text-sm' },
  lg: { box: 'h-20 w-20', label: 'text-2xl' },
} as const

// Sin foto, cada persona tiene su color, siempre el mismo (como en la web):
// con todas las caras en el azul del acento no se distinguia a nadie. Sale de
// la paleta de actividades, con su tinte y su tinta para que el contraste sea
// el mismo que el de un icono de actividad.
const AVATAR_COLORS = [
  'blue',
  'teal',
  'green',
  'amber',
  'orange',
  'red',
  'pink',
  'purple',
  'indigo',
  'cyan',
] as const

// FNV-1a: estable entre ejecuciones y dispositivos, igual que en la web.
export function avatarColorFor(seed: string): (typeof AVATAR_COLORS)[number] {
  let hash = 0x811c9dc5
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193) >>> 0
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

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
  const color = avatarColorFor(name.trim().toLowerCase())
  const hex = useActivityHex(color)
  const ink = useActivityInk(color)

  return (
    <View
      className={cn(
        'items-center justify-center overflow-hidden rounded-full',
        src ? 'bg-surface-sunken dark:bg-surface-sunken-dark' : '',
        SIZES[size].box,
        className,
      )}
      style={src ? undefined : { backgroundColor: withTint(hex) }}
    >
      {src ? (
        <Image source={{ uri: src }} className="h-full w-full" accessibilityLabel={name} />
      ) : (
        <Text className={cn('font-bold', SIZES[size].label)} style={{ color: ink }}>
          {initialsFrom(name)}
        </Text>
      )}
    </View>
  )
}
