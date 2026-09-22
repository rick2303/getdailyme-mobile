import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'

import { parseWidgetLog, type WidgetLogEntry } from '@/lib/widget-queue'

type NativeBridge = {
  setSession: (json: string) => void
  clearSession: () => void
  readLogs: () => string[]
  removeLogs: (ids: string[]) => void
}

export type WidgetSession = {
  url: string
  anonKey: string
  userId: string
  accessToken: string
  expiresAt: number
}

const ANDROID_LOGS_KEY = 'widgetLogs'

let native: NativeBridge | null | undefined

function iosBridge(): NativeBridge | null {
  if (Platform.OS !== 'ios') return null
  if (native !== undefined) return native
  try {
    const { requireNativeModule } = require('expo-modules-core') as {
      requireNativeModule: (name: string) => NativeBridge
    }
    native = requireNativeModule('WidgetBridge')
  } catch {
    native = null
  }
  return native
}

export function shareWidgetSession(session: WidgetSession | null) {
  const bridge = iosBridge()
  if (!bridge) return
  try {
    if (session) bridge.setSession(JSON.stringify(session))
    else bridge.clearSession()
  } catch {
    return
  }
}

async function readAndroidLogs(): Promise<WidgetLogEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(ANDROID_LOGS_KEY)
    if (!raw) return []
    const list = JSON.parse(raw) as unknown[]
    return list
      .map((item) => parseWidgetLog(JSON.stringify(item)))
      .filter((entry): entry is WidgetLogEntry => entry !== null)
  } catch {
    return []
  }
}

async function writeAndroidLogs(entries: WidgetLogEntry[]) {
  await AsyncStorage.setItem(ANDROID_LOGS_KEY, JSON.stringify(entries))
}

let androidChain: Promise<unknown> = Promise.resolve()

function serialized<T>(task: () => Promise<T>): Promise<T> {
  const run = androidChain.then(task, task)
  androidChain = run.catch(() => undefined)
  return run
}

export function appendAndroidWidgetLog(entry: WidgetLogEntry): Promise<void> {
  return serialized(async () => {
    const entries = await readAndroidLogs()
    if (entries.some((item) => item.id === entry.id)) return
    await writeAndroidLogs([...entries, entry])
  })
}

export function markAndroidWidgetLogSent(id: string): Promise<void> {
  return serialized(async () => {
    const entries = await readAndroidLogs()
    await writeAndroidLogs(
      entries.map((item) => (item.id === id ? { ...item, sent: true } : item)),
    )
  })
}

export async function readWidgetLogs(): Promise<WidgetLogEntry[]> {
  if (Platform.OS === 'android') return serialized(readAndroidLogs)
  const bridge = iosBridge()
  if (!bridge) return []
  try {
    return bridge
      .readLogs()
      .map(parseWidgetLog)
      .filter((entry): entry is WidgetLogEntry => entry !== null)
  } catch {
    return []
  }
}

export async function removeWidgetLogs(ids: string[]): Promise<void> {
  if (ids.length === 0) return
  if (Platform.OS === 'android') {
    await serialized(async () => {
      const drop = new Set(ids)
      const entries = await readAndroidLogs()
      await writeAndroidLogs(entries.filter((item) => !drop.has(item.id)))
    })
    return
  }
  const bridge = iosBridge()
  if (!bridge) return
  try {
    bridge.removeLogs(ids)
  } catch {
    return
  }
}

const listeners = new Set<() => void>()

export function onWidgetLog(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function notifyWidgetLog() {
  for (const listener of listeners) listener()
}
