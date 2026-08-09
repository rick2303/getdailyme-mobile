import { useEffect, useState } from 'react'
import { StyleSheet } from 'react-native'
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated'

import { BrandLogo } from '@/components/brand/brand-logo'
import { ACCENT_HEX, DEFAULT_ACCENT } from '@/lib/theme'

// La apertura de la app: el splash nativo (fondo de marca) continua aqui sin
// costura, el logo blanco rebota al aparecer y luego todo se abre con un zoom
// suave revelando la app. El toque getdailyme sobre la receta de splitwo.
const SPLASH_BG = ACCENT_HEX[DEFAULT_ACCENT].light.brand

export function AnimatedSplash({ onDone }: { onDone: () => void }) {
  const [gone, setGone] = useState(false)

  const logoScale = useSharedValue(0.6)
  const logoOpacity = useSharedValue(0)
  const overlayOpacity = useSharedValue(1)
  const overlayScale = useSharedValue(1)

  useEffect(() => {
    logoOpacity.value = withTiming(1, { duration: 240 })
    logoScale.value = withSpring(1, { stiffness: 240, damping: 16 })

    overlayScale.value = withDelay(1950, withTiming(1.08, { duration: 420, easing: Easing.out(Easing.quad) }))
    overlayOpacity.value = withDelay(
      1950,
      withTiming(0, { duration: 420, easing: Easing.out(Easing.quad) }, (finished) => {
        if (finished) runOnJS(setGone)(true)
      }),
    )
  }, [logoOpacity, logoScale, overlayOpacity, overlayScale])

  useEffect(() => {
    if (gone) onDone()
  }, [gone, onDone])

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
    transform: [{ scale: overlayScale.value }],
  }))

  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }))

  if (gone) return null

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFillObject, { backgroundColor: SPLASH_BG, alignItems: 'center', justifyContent: 'center', zIndex: 50 }, overlayStyle]}
    >
      <Animated.View style={logoStyle}>
        <BrandLogo size={96} color="#fff" />
      </Animated.View>
    </Animated.View>
  )
}
