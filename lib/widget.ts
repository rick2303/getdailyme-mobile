import AsyncStorage from '@react-native-async-storage/async-storage'
import { createElement } from 'react'
import { Platform } from 'react-native'

// El puente hacia los widgets: en iOS la app escribe el estado del dia en el
// App Group y pide redibujar; en Android lo deja en AsyncStorage y avisa al
// task handler de react-native-android-widget.
export type WidgetPayload = {
  done: number
  due: number
  streak: number
  brand: string
  complete: boolean
  activities: { name: string; color: string; progress: number }[]
}

// El segundo widget: lo ultimo que han registrado tus amistades.
//
// Las fotos de perfil viajan como base64 dentro del payload y no como URL. No
// es pereza: los widgets no pueden descargar nada. En iOS las vistas de
// WidgetKit son sincronas, y en Android el widget se dibuja fuera del proceso
// de la app. Lo que no este ya en el aparato cuando toca pintar, no se pinta.
//
// Con avatares sale barato —a 72px son un par de KB— y por eso caben cuatro. El
// payload se reescribe en cada actualizacion, asi que el peso importa.
export type WidgetFriendEntry = {
  author: string
  initials: string
  activity: string
  detail: string
  when: string
  // Base64 sin el prefijo `data:`: cada plataforma lo pone como lo necesita.
  // Null cuando esa persona no tiene foto; entonces se pintan las iniciales.
  avatar: string | null
}

export type FriendsWidgetPayload = {
  brand: string
  entries: WidgetFriendEntry[]
}

let storage: { set: (key: string, value: string) => void } | null = null
let reload: (() => void) | null = null

function ensureIosBridge(): boolean {
  if (Platform.OS !== 'ios') return false
  if (storage && reload) return true
  try {
    const targets = require('@bacons/apple-targets') as {
      ExtensionStorage: new (group: string) => { set: (key: string, value: string) => void }
    } & { ExtensionStorage: { reloadWidget: () => void } }
    const instance = new targets.ExtensionStorage('group.com.getdailyme.app')
    storage = instance
    reload = () => (targets.ExtensionStorage as unknown as { reloadWidget: () => void }).reloadWidget()
    return true
  } catch {
    return false
  }
}

function updateAndroidWidget(payload: WidgetPayload) {
  try {
    const { requestWidgetUpdate } = require('react-native-android-widget') as {
      requestWidgetUpdate: (options: {
        widgetName: string
        renderWidget: () => React.ReactElement
      }) => Promise<void>
    }
    const { GetdailymeWidget } = require('../widgets/getdailyme-widget') as {
      GetdailymeWidget: (props: { data: WidgetPayload }) => React.ReactElement
    }
    void requestWidgetUpdate({
      widgetName: 'GetdailymeWidget',
      renderWidget: () => createElement(GetdailymeWidget, { data: payload }),
    })
  } catch {
    // Sin el modulo nativo (Expo Go, web) el widget simplemente no se refresca.
  }
}

// Red de seguridad: redibujar el widget cuesta (en iOS despierta la extension)
// y quien llama puede repetir el mismo estado. Si nada cambio, no se toca.
let lastPayload: string | null = null

export function updateWidget(payload: WidgetPayload) {
  const serialized = JSON.stringify(payload)
  if (serialized === lastPayload) return
  lastPayload = serialized

  if (Platform.OS === 'ios') {
    if (!ensureIosBridge()) return
    try {
      storage!.set('widgetData', serialized)
      reload!()
    } catch {
      // El widget es decorativo: si el puente falla, la app sigue como si nada.
    }
    return
  }

  if (Platform.OS === 'android') {
    void AsyncStorage.setItem('widgetData', serialized).catch(() => undefined)
    updateAndroidWidget(payload)
  }
}

function updateAndroidFriendsWidget(payload: FriendsWidgetPayload) {
  try {
    const { requestWidgetUpdate } = require('react-native-android-widget') as {
      requestWidgetUpdate: (options: {
        widgetName: string
        renderWidget: () => React.ReactElement
      }) => Promise<void>
    }
    const { FriendsWidget } = require('../widgets/friends-widget') as {
      FriendsWidget: (props: { data: FriendsWidgetPayload }) => React.ReactElement
    }
    void requestWidgetUpdate({
      widgetName: 'FriendsWidget',
      renderWidget: () => createElement(FriendsWidget, { data: payload }),
    })
  } catch {
    // Sin el modulo nativo (Expo Go, web) el widget simplemente no se refresca.
  }
}

let lastFriends: string | null = null

export function updateFriendsWidget(payload: FriendsWidgetPayload) {
  const serialized = JSON.stringify(payload)
  if (serialized === lastFriends) return
  lastFriends = serialized

  if (Platform.OS === 'ios') {
    if (!ensureIosBridge()) return
    try {
      storage!.set('widgetFriends', serialized)
      reload!()
    } catch {
      // El widget es decorativo: si el puente falla, la app sigue como si nada.
    }
    return
  }

  if (Platform.OS === 'android') {
    void AsyncStorage.setItem('widgetFriends', serialized).catch(() => undefined)
    updateAndroidFriendsWidget(payload)
  }
}
