import '@/lib/cryptoPolyfill'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import { Platform } from 'react-native'

import type { Database } from './database.types'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? ''
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ''

export function isSupabaseConfigured(): boolean {
  return supabaseUrl.length > 0 && supabaseAnonKey.length > 0
}

// Misma receta que splitwo: sesion en AsyncStorage y PKCE en nativo. Tipada con
// el Database generado en el repo web, que es la misma base para ambas apps.
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === 'web' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
    flowType: Platform.OS === 'web' ? 'implicit' : 'pkce',
  },
})

// Alias de compatibilidad: los hooks portados de la web piden el cliente con
// este nombre. Aqui hay un unico cliente, asi que siempre es el mismo.
export function getSupabaseBrowserClient() {
  return supabase
}
