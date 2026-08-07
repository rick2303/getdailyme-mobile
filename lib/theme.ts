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
