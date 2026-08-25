import { useEffect, useMemo } from 'react'
import { View, useWindowDimensions } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  useReducedMotion,
  withDelay,
  withTiming,
} from 'react-native-reanimated'

// Confetti ligero con reanimated: 26 piezas que caen girando desde arriba.
// Sin librerias nuevas y se desmonta solo cuando el padre quita `visible`.
const PIECE_COLORS = [
  '#3D7BE8',
  '#2E9E5B',
  '#C08A2D',
  '#D93A3A',
  '#D4498F',
  '#9A3FD1',
  '#5E4FD9',
  '#3D9DBF',
]

const PIECE_COUNT = 26

type PieceSpec = {
  x: number
  delay: number
  duration: number
  size: number
  color: string
  spin: number
  drift: number
}

function buildPieces(width: number): PieceSpec[] {
  return Array.from({ length: PIECE_COUNT }, (_, index) => ({
    x: (index / PIECE_COUNT) * width + (index % 3) * 8,
    delay: (index % 7) * 90,
    duration: 1400 + (index % 5) * 180,
    size: 7 + (index % 3) * 3,
    color: PIECE_COLORS[index % PIECE_COLORS.length],
    spin: index % 2 === 0 ? 540 : -420,
    drift: ((index % 5) - 2) * 24,
  }))
}

function Piece({ spec, height }: { spec: PieceSpec; height: number }) {
  const progress = useSharedValue(0)

  useEffect(() => {
    progress.value = withDelay(
      spec.delay,
      withTiming(1, { duration: spec.duration, easing: Easing.in(Easing.quad) }),
    )
  }, [progress, spec.delay, spec.duration])

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: spec.x + progress.value * spec.drift },
      { translateY: -30 + progress.value * (height * 0.75) },
      { rotate: `${progress.value * spec.spin}deg` },
    ],
    opacity: progress.value < 0.75 ? 1 : 1 - (progress.value - 0.75) * 4,
  }))

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: spec.size,
          height: spec.size * 1.6,
          borderRadius: 2,
          backgroundColor: spec.color,
        },
        style,
      ]}
    />
  )
}

export function Confetti({ visible }: { visible: boolean }) {
  const { width, height } = useWindowDimensions()
  const pieces = useMemo(() => buildPieces(width), [width])
  // Quien pide menos movimiento en los ajustes del sistema no quiere 26 piezas
  // cayendo por la pantalla. La celebracion sigue existiendo: el titulo cambia
  // a "dia completo" y el haptic se dispara igual, solo desaparece la lluvia.
  const reducedMotion = useReducedMotion()

  if (!visible || reducedMotion) return null

  return (
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      {pieces.map((spec, index) => (
        <Piece key={index} spec={spec} height={height} />
      ))}
    </View>
  )
}
