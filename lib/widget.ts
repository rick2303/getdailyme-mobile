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

export function updateWidget(payload: WidgetPayload) {
  if (Platform.OS === 'ios') {
    if (!ensureIosBridge()) return
    try {
      storage!.set('widgetData', JSON.stringify(payload))
      reload!()
    } catch {
      // El widget es decorativo: si el puente falla, la app sigue como si nada.
    }
    return
  }

  if (Platform.OS === 'android') {
    void AsyncStorage.setItem('widgetData', JSON.stringify(payload)).catch(() => undefined)
    updateAndroidWidget(payload)
  }
}
