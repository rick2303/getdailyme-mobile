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

export async function hasPushPermission(): Promise<boolean> {
  const os = getOS()
  if (!os) return false
  try {
    return await os.Notifications.getPermissionAsync()
  } catch {
    return false
  }
}

export async function requestPushPermission(): Promise<boolean> {
  const os = getOS()
  if (!os) return false
  try {
    return await os.Notifications.requestPermission(true)
  } catch {
    return false
  }
}

export function optInPush() {
  getOS()?.User.pushSubscription.optIn()
}

export function optOutPush() {
  getOS()?.User.pushSubscription.optOut()
}

export async function isPushOptedIn(): Promise<boolean> {
  const os = getOS()
  if (!os) return false
  try {
    return await os.User.pushSubscription.getOptedInAsync()
  } catch {
    return false
  }
}

export function logoutOneSignal() {
  getOS()?.logout()
}
