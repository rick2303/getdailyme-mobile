import AsyncStorage from '@react-native-async-storage/async-storage'

export type SignInMethod = 'password' | 'apple' | 'google'

const STORAGE_KEY = 'gdm_last_sign_in_method'
const METHODS: readonly SignInMethod[] = ['password', 'apple', 'google']

export async function readLastSignInMethod(): Promise<SignInMethod | null> {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEY)
    return METHODS.includes(value as SignInMethod) ? (value as SignInMethod) : null
  } catch {
    return null
  }
}

export async function rememberSignInMethod(method: SignInMethod) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, method)
  } catch {
    return
  }
}

export function usesEmail(method: SignInMethod | null) {
  return method === 'password'
}
