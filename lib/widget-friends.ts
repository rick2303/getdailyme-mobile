import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'

import { fetchFeedPage } from '@/lib/api/feed'
import { resolveActivityPhotoUrl } from '@/lib/api/storage'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { ActivityUnit } from '@/lib/activities/units'
import type { FriendsWidgetPayload, WidgetFriendEntry } from '@/lib/widget'

// Lo que hace falta para el widget de amistades: las tres ultimas entradas del
// muro y, de la primera que tenga foto, la foto ya reducida a base64.
//
// La foto no puede ir como URL. Los widgets no descargan nada: en iOS las
// vistas de WidgetKit son sincronas y en Android el widget se dibuja fuera del
// proceso de la app. Ademas la URL de Storage es firmada y caduca, asi que
// aunque pudieran, manana no serviria.

// 400px de ancho es de sobra para un widget grande, y a calidad 70 deja el
// base64 en unos 40 KB. Sin reducir, una foto de 1600px se va a mas de un mega
// y eso viaja en cada actualizacion.
const PHOTO_WIDTH = 400
const PHOTO_QUALITY = 0.7

type Options = {
  brand: string
  currentUserId: string | null
  activityName: (name: string) => string
  amountWithUnit: (amount: number, unit: ActivityUnit) => string
  relativeTime: (iso: string) => string
}

async function shrinkToBase64(uri: string): Promise<string | null> {
  try {
    const context = ImageManipulator.manipulate(uri)
    context.resize({ width: PHOTO_WIDTH })
    const rendered = await context.renderAsync()
    const result = await rendered.saveAsync({
      format: SaveFormat.JPEG,
      compress: PHOTO_QUALITY,
      base64: true,
    })
    return result.base64 ?? null
  } catch {
    return null
  }
}

export async function buildFriendsWidgetPayload(
  options: Options,
): Promise<FriendsWidgetPayload | null> {
  const client = getSupabaseBrowserClient()

  // Se piden mas de las tres que se pintan: las propias se descartan despues, y
  // sin margen un dia movido de uno mismo dejaria el widget vacio.
  const page = await fetchFeedPage(client, { limit: 12 })
  const theirs = page.filter((entry) => entry.user_id !== options.currentUserId)

  const entries: WidgetFriendEntry[] = theirs.slice(0, 3).map((entry) => ({
    author: entry.author.display_name,
    activity: options.activityName(entry.activity.name),
    detail: options.amountWithUnit(entry.amount, entry.activity.unit),
    when: options.relativeTime(entry.logged_at),
  }))

  let photo: string | null = null
  let photoAuthor: string | null = null

  const conFoto = theirs.slice(0, 3).find((entry) => entry.photo_url)
  if (conFoto?.photo_url) {
    const url = await resolveActivityPhotoUrl(client, conFoto.photo_url)
    if (url) {
      photo = await shrinkToBase64(url)
      if (photo) photoAuthor = conFoto.author.display_name
    }
  }

  return { brand: options.brand, entries, photo, photoAuthor }
}
