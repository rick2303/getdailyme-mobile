import AsyncStorage from '@react-native-async-storage/async-storage'
import type { WidgetTaskHandlerProps } from 'react-native-android-widget'

import type { FriendsWidgetPayload, WidgetPayload } from '@/lib/widget'
import { FriendsWidget } from './friends-widget'
import { GetdailymeWidget } from './getdailyme-widget'

// El sistema pide redibujar el widget (al añadirlo, al reanudar, cada media
// hora): se lee el ultimo estado que dejo la app en AsyncStorage.
const FALLBACK: WidgetPayload = {
  done: 0,
  due: 0,
  streak: 0,
  brand: '#007EB6',
  complete: false,
  activities: [],
}

const FRIENDS_FALLBACK: FriendsWidgetPayload = {
  brand: '#007EB6',
  entries: [],
}

async function read<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    // sin datos aun: el widget muestra el estado vacio
    return fallback
  }
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const action = props.widgetAction
  if (action !== 'WIDGET_ADDED' && action !== 'WIDGET_UPDATE' && action !== 'WIDGET_RESIZED') {
    return
  }

  // El sistema pide por nombre: con dos widgets ya no vale pintar siempre el
  // mismo, y cada uno lee su propia clave.
  if (props.widgetInfo.widgetName === 'FriendsWidget') {
    const data = await read<FriendsWidgetPayload>('widgetFriends', FRIENDS_FALLBACK)
    props.renderWidget(<FriendsWidget data={data} />)
    return
  }

  const data = await read<WidgetPayload>('widgetData', FALLBACK)
  props.renderWidget(<GetdailymeWidget data={data} />)
}
