import { Platform } from 'react-native'

export function startTimerActivity(name: string, colorHex: string, startedAtIso: string) {
  if (Platform.OS !== 'ios') return
  try {
    const { requireNativeModule } = require('expo-modules-core') as {
      requireNativeModule: (name: string) => {
        startActivity: (name: string, colorHex: string, startedAtMs: number) => void
      }
    }
    requireNativeModule('LiveActivity').startActivity(
      name,
      colorHex,
      new Date(startedAtIso).getTime(),
    )
  } catch {
    // Sin el modulo (Expo Go, simulador viejo) el cronometro sigue sin isla.
  }
}

export function endTimerActivity() {
  if (Platform.OS !== 'ios') return
  try {
    const { requireNativeModule } = require('expo-modules-core') as {
      requireNativeModule: (name: string) => { endActivity: () => void }
    }
    requireNativeModule('LiveActivity').endActivity()
  } catch {
    // idem
  }
}
