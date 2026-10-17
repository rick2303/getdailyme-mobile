import AsyncStorage from '@react-native-async-storage/async-storage'
import type { WidgetTaskHandlerProps } from 'react-native-android-widget'

import { sendPing } from '@/lib/api/couple-presence'
import { createLog } from '@/lib/api/logs'
import { requestPush } from '@/lib/push/client'
import { supabase } from '@/lib/supabase/client'
import { getBrowserTimeZone, todayKey } from '@/lib/utils/dates'
import { newId } from '@/lib/utils/ids'
import type { CoupleWidgetPayload, FriendsWidgetPayload, WidgetPayload } from '@/lib/widget'
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
import { CoupleWidget, PING_PARTNER_ACTION } from './couple-widget'
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

const COUPLE_FALLBACK: CoupleWidgetPayload = {
  brand: '#007EB6',
  paired: false,
  partnerId: null,
  partnerName: '',
  partnerInitials: '',
  partnerAvatar: null,
  mood: null,
  moodLabel: null,
  moodAt: null,
  receivedLabel: '',
  pingLabel: '',
  sentLabel: '',
  tooSoonLabel: '',
  emptyTitle: 'Pareja',
  emptyBody: '',
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

// Pienso en ti desde la pantalla de inicio. Se pinta "Enviado" en cuanto sale,
// y el freno de 15 segundos lo pone la base: un toque de mas no llega.
async function pingFromWidget(props: WidgetTaskHandlerProps) {
  const stored = await read<CoupleWidgetPayload>('widgetCouple', COUPLE_FALLBACK)
  if (!stored.paired) return

  const { session } = await currentSession()
  if (!session) return

  try {
    const result = await sendPing(supabase)
    if (result.outcome === 'sent' && result.pingId) {
      await requestPush({ type: 'couple_ping', pingId: result.pingId }).catch(() => undefined)
    }
    if (result.outcome !== 'sent' && result.outcome !== 'too_soon') return
  } catch {
    return
  }

  const next = { ...stored, pingSentAt: Date.now() }
  await AsyncStorage.setItem('widgetCouple', JSON.stringify(next)).catch(() => undefined)
  props.renderWidget(<CoupleWidget data={next} />)
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const action = props.widgetAction

  if (action === 'WIDGET_CLICK') {
    if (props.clickAction === LOG_ACTIVITY_ACTION) await logFromWidget(props)
    if (props.clickAction === PING_PARTNER_ACTION) await pingFromWidget(props)
    return
  }

  if (action !== 'WIDGET_ADDED' && action !== 'WIDGET_UPDATE' && action !== 'WIDGET_RESIZED') {
    return
  }

  // El sistema pide por nombre: con dos widgets ya no vale pintar siempre el
  // mismo, y cada uno lee su propia clave.
  if (props.widgetInfo.widgetName === 'CoupleWidget') {
    const data = await read<CoupleWidgetPayload>('widgetCouple', COUPLE_FALLBACK)
    props.renderWidget(<CoupleWidget data={data} />)
    return
  }

  if (props.widgetInfo.widgetName === 'FriendsWidget') {
    const data = await read<FriendsWidgetPayload>('widgetFriends', FRIENDS_FALLBACK)
    props.renderWidget(<FriendsWidget data={data} />)
    return
  }

  const data = await read<WidgetPayload>('widgetData', FALLBACK)
  props.renderWidget(<GetdailymeWidget data={data} />)
}
