import AsyncStorage from '@react-native-async-storage/async-storage'
import type { WidgetTaskHandlerProps } from 'react-native-android-widget'

import { createLog } from '@/lib/api/logs'
import { requestPush } from '@/lib/push/client'
import { supabase } from '@/lib/supabase/client'
import { getBrowserTimeZone, todayKey } from '@/lib/utils/dates'
import { newId } from '@/lib/utils/ids'
import type { FriendsWidgetPayload, WidgetPayload } from '@/lib/widget'
import {
  appendAndroidWidgetLog,
  markAndroidWidgetLogSent,
  notifyWidgetLog,
} from '@/lib/widget-bridge'
import {
  buildWidgetLog,
  bumpWidgetPayload,
  canLogFromWidget,
  payloadForDay,
  toCreateLogVariables,
} from '@/lib/widget-queue'
import { FriendsWidget } from './friends-widget'
import { GetdailymeWidget, LOG_ACTIVITY_ACTION } from './getdailyme-widget'

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

async function currentSession() {
  try {
    const { data, error } = await supabase.auth.getSession()
    return { session: data.session, reachable: !error }
  } catch {
    return { session: null, reachable: false }
  }
}

async function logFromWidget(props: WidgetTaskHandlerProps) {
  const activityId = props.clickActionData?.activityId
  if (typeof activityId !== 'string') return

  const stored = await read<WidgetPayload>('widgetData', FALLBACK)
  if (!stored.userId) return

  const { session, reachable } = await currentSession()
  if (session && session.user.id !== stored.userId) return
  if (!session && reachable) return

  const timeZone = stored.timeZone ?? getBrowserTimeZone()
  const today = todayKey(timeZone)
  const activity = payloadForDay(stored, today).activities.find((item) => item.id === activityId)
  if (!activity || !canLogFromWidget(activity)) return

  const entry = buildWidgetLog({
    id: newId(),
    activity,
    userId: stored.userId,
    timeZone,
    now: new Date(),
  })
  await appendAndroidWidgetLog(entry)

  const bumped = bumpWidgetPayload(stored, activityId, today)
  await AsyncStorage.setItem('widgetData', JSON.stringify(bumped)).catch(() => undefined)
  props.renderWidget(<GetdailymeWidget data={bumped} />)

  if (session) {
    try {
      const created = await createLog(supabase, toCreateLogVariables(entry))
      await markAndroidWidgetLogSent(entry.id)
      if (created) await requestPush({ type: 'friend_log', logId: entry.id }).catch(() => undefined)
    } catch {
      return notifyWidgetLog()
    }
  }

  notifyWidgetLog()
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const action = props.widgetAction

  if (action === 'WIDGET_CLICK') {
    if (props.clickAction === LOG_ACTIVITY_ACTION) await logFromWidget(props)
    return
  }

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
