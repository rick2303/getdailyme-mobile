import AsyncStorage from '@react-native-async-storage/async-storage'

// El enlace de invitacion suele abrirse antes de tener cuenta, que es justo
// cuando el guardia de rutas manda a la pantalla de acceso y el token se
// volatiliza. Aqui se aparca hasta que haya sesion; el binder del layout lo
// recoge y devuelve a la pantalla de canje.
const PENDING_INVITE_KEY = 'gdm_pending_invite'

export function inviteHref(parked: string): string {
  return parked.startsWith('/') ? parked : `/invite/${parked}`
}

export async function parkInvite(token: string, asCouple = false) {
  try {
    await AsyncStorage.setItem(
      PENDING_INVITE_KEY,
      asCouple ? `/invite/${token}?pareja=1` : `/invite/${token}`,
    )
  } catch {
    // sin almacenamiento la invitacion se pierde, como antes de esto
  }
}

export async function hasParkedInvite(): Promise<boolean> {
  try {
    return Boolean(await AsyncStorage.getItem(PENDING_INVITE_KEY))
  } catch {
    return false
  }
}

export async function claimParkedInvite(): Promise<string | null> {
  try {
    const token = await AsyncStorage.getItem(PENDING_INVITE_KEY)
    if (token) await AsyncStorage.removeItem(PENDING_INVITE_KEY)
    return token
  } catch {
    return null
  }
}

export async function forgetParkedInvite() {
  try {
    await AsyncStorage.removeItem(PENDING_INVITE_KEY)
  } catch {
    // da igual: si queda, el binder lo canjea una vez y lo borra
  }
}
