import { useColorScheme } from 'react-native'

import { ACCENT_HEX } from '@/lib/theme'
import { useAccent } from '@/lib/theme-context'

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
  brand: '#007EB6',
  brandSoft: '#D9F3FF',
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
  brand: '#44B0EB',
  brandSoft: '#073248',
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
  const accent = useAccent()
  const palette = scheme === 'dark' ? DARK : LIGHT
  const hex = ACCENT_HEX[accent][scheme === 'dark' ? 'dark' : 'light']
  return { ...palette, brand: hex.brand, brandSoft: hex.soft }
}

export function useActivityHex(color: string): string {
  const scheme = useColorScheme()
  const entry = ACTIVITY_HEX[color] ?? ACTIVITY_HEX.blue
  return scheme === 'dark' ? entry.dark : entry.light
}

// Tintes como los de la web: 12% para fondos suaves (activity-tint) y 22%
// para el disco del icono (activity-tint-strong).
export function withTint(hex: string): string {
  return `${hex}1F`
}

export function withTintStrong(hex: string): string {
  return `${hex}38`
}

function mixChannel(a: number, b: number, amount: number): number {
  return Math.round(a * amount + b * (1 - amount))
}

// El color de tinta de la web (activity-ink): la tonalidad de la actividad
// mezclada hacia negro en claro y hacia blanco en oscuro para que lea bien
// sobre su propio tinte.
export function activityInk(hex: string, scheme: 'light' | 'dark'): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const toward = scheme === 'dark' ? 255 : 0
  const amount = scheme === 'dark' ? 0.8 : 0.82
  const to = (v: number) => mixChannel(v, toward, amount).toString(16).padStart(2, '0')
  return `#${to(r)}${to(g)}${to(b)}`
}

export function useActivityInk(color: string): string {
  const scheme = useColorScheme()
  const entry = ACTIVITY_HEX[color] ?? ACTIVITY_HEX.blue
  return scheme === 'dark'
    ? activityInk(entry.dark, 'dark')
    : activityInk(entry.light, 'light')
}

// La sombra suave de los tiles de la web (shadow-tile), en las dos plataformas.
export const SHADOW_TILE = {
  shadowColor: '#26262F',
  shadowOpacity: 0.07,
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 3 },
  elevation: 2,
} as const
