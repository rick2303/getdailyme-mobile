import Svg, { Circle, Path } from 'react-native-svg'

import { useThemeColors } from '@/constants/colors'

// El mismo logo SVG de la web, dibujado con react-native-svg.
export function BrandLogo({ size = 56 }: { size?: number }) {
  const colors = useThemeColors()

  return (
    <Svg viewBox="0 0 512 512" width={size} height={size}>
      <Circle
        cx={256}
        cy={256}
        r={196}
        fill="none"
        stroke={colors.brand}
        strokeOpacity={0.22}
        strokeWidth={44}
      />
      <Path
        d="M256 60a196 196 0 0 1 179.2 116.7"
        fill="none"
        stroke={colors.brand}
        strokeWidth={44}
        strokeLinecap="round"
      />
      <Path
        d="M168 262l58 58 118-128"
        fill="none"
        stroke={colors.brand}
        strokeWidth={46}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}
