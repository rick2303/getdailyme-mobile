import AsyncStorage from '@react-native-async-storage/async-storage'
import { getLocales } from 'expo-localization'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { DEFAULT_LOCALE, LOCALES, type Locale } from './config'
import { getDictionary } from './dictionaries'
import {
  translate,
  type TranslationKey,
  type TranslationParams,
  type Translator,
} from './translate'

// Mismo contrato que el proveedor web (useI18n/useT y los mismos diccionarios);
// cambia el almacen: cookie en la web, AsyncStorage aqui.
const STORAGE_KEY = 'gdm_locale'

type I18nContextValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: Translator
}

const I18nContext = createContext<I18nContextValue | null>(null)

function deviceLocale(): Locale {
  const language = getLocales()[0]?.languageCode ?? ''
  return (LOCALES as readonly string[]).includes(language) ? (language as Locale) : DEFAULT_LOCALE
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(deviceLocale)

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored && (LOCALES as readonly string[]).includes(stored)) {
          setLocaleState(stored as Locale)
        }
      })
      .catch(() => undefined)
  }, [])

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => undefined)
  }, [])

  const value = useMemo<I18nContextValue>(() => {
    const dictionary = getDictionary(locale)
    const t: Translator = (key: TranslationKey, params?: TranslationParams) =>
      translate(dictionary, locale, key, params)
    return { locale, setLocale, t }
  }, [locale, setLocale])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext)
  if (!context) throw new Error('useI18n must be used inside I18nProvider')
  return context
}

export function useT(): Translator {
  return useI18n().t
}
