import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'

import { fetchFeedPage } from '@/lib/api/feed'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { ActivityUnit } from '@/lib/activities/units'
import type { FriendsWidgetPayload, WidgetFriendEntry } from '@/lib/widget'

// Lo ultimo que han registrado tus amistades, con su foto de perfil al lado —
// como la lista de un chat o las sugerencias de a quien escribir.
//
// La foto no puede ir como URL: los widgets no descargan nada. En iOS las
// vistas de WidgetKit son sincronas y en Android el widget se dibuja fuera del
// proceso de la app. Lo que no este ya en el aparato cuando toca pintar, no se
// pinta. Asi que viaja como base64 dentro del payload.
//
// Con avatares eso sale barato: a 72px son un par de KB cada uno. La version
// anterior de esto llevaba la foto del registro a 400px, que son ~40 KB para
// una sola imagen — y el payload se reescribe en cada actualizacion.
const AVATAR_SIZE = 72
const AVATAR_QUALITY = 0.7

// Cuatro personas distintas, no cuatro registros: si alguien registra cinco
// vasos de agua seguidos, el widget entero seria suyo. Una fila por persona con
// lo ultimo que hizo se parece mas a una lista de chats, que es la idea.
const MAX_ENTRIES = 4

type Options = {
  brand: string
  currentUserId: string | null
  activityName: (name: string) => string
  amountWithUnit: (amount: number, unit: ActivityUnit) => string
  relativeTime: (iso: string) => string
}

// Las mismas iniciales que pinta el componente Avatar cuando no hay foto.
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}

async function avatarToBase64(url: string): Promise<string | null> {
  try {
    const context = ImageManipulator.manipulate(url)
    context.resize({ width: AVATAR_SIZE, height: AVATAR_SIZE })
    const rendered = await context.renderAsync()
    const result = await rendered.saveAsync({
      format: SaveFormat.JPEG,
      compress: AVATAR_QUALITY,
      base64: true,
    })
    return result.base64 ?? null
  } catch {
    // Sin avatar el widget pinta las iniciales, que es lo que hace la app.
    return null
  }
}

export async function buildFriendsWidgetPayload(
  options: Options,
): Promise<FriendsWidgetPayload | null> {
  const client = getSupabaseBrowserClient()

  // Se piden mas de las que se pintan: se descartan las propias y se colapsan
  // las repetidas de la misma persona, asi que sin margen el widget se quedaria
  // corto en cuanto alguien tenga un dia movido.
  const page = await fetchFeedPage(client, { limit: 24 })

  const vistos = new Set<string>()
  const recientes = page.filter((entry) => {
    if (entry.user_id === options.currentUserId) return false
    if (vistos.has(entry.user_id)) return false
    vistos.add(entry.user_id)
    return true
  })

  const entries: WidgetFriendEntry[] = []

  for (const entry of recientes.slice(0, MAX_ENTRIES)) {
    entries.push({
      author: entry.author.display_name,
      initials: initialsOf(entry.author.display_name),
      activity: options.activityName(entry.activity.name),
      detail: options.amountWithUnit(entry.amount, entry.activity.unit),
      when: options.relativeTime(entry.logged_at),
      // `avatar_url` es una URL publica completa: el bucket de avatares lo es,
      // asi que no hay que firmar nada.
      avatar: entry.author.avatar_url ? await avatarToBase64(entry.author.avatar_url) : null,
    })
  }

  return { brand: options.brand, entries }
}
