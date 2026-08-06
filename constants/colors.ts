import { useColorScheme } from 'react-native'

// Los mismos tokens que tailwind.config.js, accesibles desde codigo para lo
// que no acepta className: colores de iconos, tintes calculados, el ring del
// tile. Una sola fuente en hex; la web sigue siendo la referencia en oklch.
export const LIGHT = {
  bg: '#F8F8FB',
  surface: '#FFFFFF',
  surfaceSunken: '#EFEFF4',
  border: '#E3E3EA',
  text: '#26262F',
  textMuted: '#5D5D68',
  textSubtle: '#70707B',
  brand: '#6B4EE6',
  brandSoft: '#EDE9FC',
  danger: '#D93A3A',
  success: '#2E9E5B',
}

export const DARK: Record<keyof typeof LIGHT, string> = {
  bg: '#121219',
  surface: '#1E1E28',
  surfaceSunken: '#181820',
  border: '#3A3A46',
  text: '#F2F2F5',
  textMuted: '#A8A8B3',
  textSubtle: '#8F8F9A',
  brand: '#8B75F0',
  brandSoft: '#2E2850',
  danger: '#E66A6A',
  success: '#4FBF7E',
}

// Colores de actividad (claro/oscuro), espejo de data-activity-color de la web.
export const ACTIVITY_HEX: Record<string, { light: string; dark: string }> = {
  blue: { light: '#3D7BE8', dark: '#6FA2F2' },
  cyan: { light: '#3D9DBF', dark: '#66C3E3' },
  teal: { light: '#2E9E8F', dark: '#5CC4B5' },
  green: { light: '#2E9E5B', dark: '#5CC488' },
  lime: { light: '#6FAE2F', dark: '#98D45C' },
  amber: { light: '#C08A2D', dark: '#E3B25C' },
  orange: { light: '#D07B33', dark: '#EDA466' },
  red: { light: '#D93A3A', dark: '#E66A6A' },
  pink: { light: '#D4498F', dark: '#EE7CB6' },
  purple: { light: '#9A3FD1', dark: '#C077EA' },
  indigo: { light: '#5E4FD9', dark: '#8C7FEB' },
  slate: { light: '#6E7280', dark: '#9CA0AC' },
}

export function useThemeColors() {
  const scheme = useColorScheme()
  return scheme === 'dark' ? DARK : LIGHT
}

export function useActivityHex(color: string): string {
  const scheme = useColorScheme()
  const entry = ACTIVITY_HEX[color] ?? ACTIVITY_HEX.blue
  return scheme === 'dark' ? entry.dark : entry.light
}

// Tinte al 14%: el fondo suave de los iconos de actividad, como activity-tint.
export function withTint(hex: string): string {
  return `${hex}24`
}
