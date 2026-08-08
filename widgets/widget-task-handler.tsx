import AsyncStorage from '@react-native-async-storage/async-storage'
import type { WidgetTaskHandlerProps } from 'react-native-android-widget'

import type { WidgetPayload } from '@/lib/widget'
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

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  let data = FALLBACK
  try {
    const raw = await AsyncStorage.getItem('widgetData')
    if (raw) data = JSON.parse(raw) as WidgetPayload
  } catch {
    // sin datos aun: el widget muestra el estado vacio
  }

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED':
      props.renderWidget(<GetdailymeWidget data={data} />)
      break
    default:
      break
  }
}
