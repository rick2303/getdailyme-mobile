import AsyncStorage from '@react-native-async-storage/async-storage'
import { Appearance } from 'react-native'

// Claro/oscuro/sistema como en la web, con el mecanismo nativo: forzar el
// colorScheme hace que NativeWind y useColorScheme reaccionen solos.
const STORAGE_KEY = 'gdm_theme'

export type ThemeMode = 'light' | 'dark' | 'system'

export const THEME_MODES: ThemeMode[] = ['light', 'dark', 'system']

export function applyThemeMode(mode: ThemeMode) {
  Appearance.setColorScheme((mode === 'system' ? null : mode) as import('react-native').ColorSchemeName)
}

export async function loadThemeMode(): Promise<ThemeMode> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY)
    return stored === 'light' || stored === 'dark' ? stored : 'system'
  } catch {
    return 'system'
  }
}

export async function saveThemeMode(mode: ThemeMode) {
  applyThemeMode(mode)
  try {
    await AsyncStorage.setItem(STORAGE_KEY, mode)
  } catch {
    // sin persistencia no pasa nada: queda para esta sesion
  }
}

// Acentos como en la web (data-accent + cookie): aqui son variables de
// NativeWind mas AsyncStorage. Violeta es el defecto historico de la app.
const ACCENT_KEY = 'gdm_accent'

export const ACCENTS = ['celeste', 'menta', 'violeta'] as const

export type Accent = (typeof ACCENTS)[number]

export const DEFAULT_ACCENT: Accent = 'violeta'

export const ACCENT_HEX: Record<
  Accent,
  { light: { brand: string; soft: string }; dark: { brand: string; soft: string } }
> = {
  celeste: {
    light: { brand: '#007EB6', soft: '#D9F3FF' },
    dark: { brand: '#44B0EB', soft: '#073248' },
  },
  menta: {
    light: { brand: '#068665', soft: '#D6F8E9' },
    dark: { brand: '#4FC39C', soft: '#083628' },
  },
  violeta: {
    light: { brand: '#6B4EE6', soft: '#EDE9FC' },
    dark: { brand: '#8B75F0', soft: '#2E2850' },
  },
}

export function isAccent(value: unknown): value is Accent {
  return typeof value === 'string' && (ACCENTS as readonly string[]).includes(value)
}

export async function loadAccent(): Promise<Accent> {
  try {
    const stored = await AsyncStorage.getItem(ACCENT_KEY)
    return isAccent(stored) ? stored : DEFAULT_ACCENT
  } catch {
    return DEFAULT_ACCENT
  }
}

export async function saveAccent(accent: Accent) {
  try {
    await AsyncStorage.setItem(ACCENT_KEY, accent)
  } catch {
    // sin persistencia no pasa nada: queda para esta sesion
  }
}
