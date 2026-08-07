import { vars } from 'nativewind'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { View } from 'react-native'

import {
  ACCENT_HEX,
  DEFAULT_ACCENT,
  applyThemeMode,
  loadAccent,
  loadThemeMode,
  saveAccent,
  saveThemeMode,
  type Accent,
  type ThemeMode,
} from '@/lib/theme'

// El equivalente al ThemeProvider de la web: el acento se materializa como
// variables de NativeWind sobre un View raiz, asi bg-brand y compania cambian
// en toda la app sin tocar cada componente.
type ThemeContextValue = {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
  accent: Accent
  setAccent: (accent: Accent) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('system')
  const [accent, setAccentState] = useState<Accent>(DEFAULT_ACCENT)

  useEffect(() => {
    void loadThemeMode().then((stored) => {
      setModeState(stored)
      applyThemeMode(stored)
    })
    void loadAccent().then(setAccentState)
  }, [])

  const setMode = (next: ThemeMode) => {
    setModeState(next)
    void saveThemeMode(next)
  }

  const setAccent = (next: Accent) => {
    setAccentState(next)
    void saveAccent(next)
  }

  const value = useMemo(() => ({ mode, setMode, accent, setAccent }), [mode, accent])

  const accentVars = useMemo(() => {
    const hex = ACCENT_HEX[accent]
    return vars({
      '--gdm-brand': hex.light.brand,
      '--gdm-brand-soft': hex.light.soft,
      '--gdm-brand-dark': hex.dark.brand,
      '--gdm-brand-soft-dark': hex.dark.soft,
    })
  }, [accent])

  return (
    <ThemeContext.Provider value={value}>
      <View style={[{ flex: 1 }, accentVars]}>{children}</View>
    </ThemeContext.Provider>
  )
}

export function useThemeSettings(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useThemeSettings must be used inside ThemeProvider')
  return context
}

export function useAccent(): Accent {
  return useContext(ThemeContext)?.accent ?? DEFAULT_ACCENT
}
