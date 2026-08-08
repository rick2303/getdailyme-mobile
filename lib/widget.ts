import { Platform } from 'react-native'

// El puente hacia el widget de iOS: la app escribe el estado del dia en el
// App Group y pide al sistema redibujar. En Android aun no hay widget.
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

function ensureBridge(): boolean {
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

export function updateWidget(payload: WidgetPayload) {
  if (!ensureBridge()) return
  try {
    storage!.set('widgetData', JSON.stringify(payload))
    reload!()
  } catch {
    // El widget es decorativo: si el puente falla, la app sigue como si nada.
  }
}
