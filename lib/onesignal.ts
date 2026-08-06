import { Platform } from 'react-native'

// Lazy singleton — loaded once on native, never on web
let _os: typeof import('react-native-onesignal').OneSignal | null = null

function getOS() {
  if (Platform.OS === 'web') return null
  if (!_os) {
    // Named export, not default
    _os = require('react-native-onesignal').OneSignal
  }
  return _os
}

export function initOneSignal(appId: string) {
  const os = getOS()
  if (!os) return
  os.initialize(appId)
  os.Notifications.requestPermission(true)
}

export function loginOneSignal(userId: string) {
  getOS()?.login(userId)
}

export function logoutOneSignal() {
  getOS()?.logout()
}
