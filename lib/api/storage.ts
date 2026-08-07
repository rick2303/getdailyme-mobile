import { Buffer } from 'buffer'
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import { Image } from 'react-native'

import type { TypedSupabaseClient } from '@/lib/supabase/types'

// Version nativa del storage de la web: mismos buckets, mismas rutas y la misma
// politica de compresion (lado mayor 1600px / avatar 512px, jpeg), pero
// trabajando con URIs locales del picker en vez de objetos File del navegador.

export const AVATARS_BUCKET = 'avatars'
export const ACTIVITY_PHOTOS_BUCKET = 'activity-photos'
export const EVENT_PHOTOS_BUCKET = 'event-photos'

const SIGNED_URL_TTL_SECONDS = 60 * 60

function uniqueSegment(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.round(Math.random() * 1e9)}`
}

function imageSize(uri: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      (error) => reject(error),
    )
  })
}

// Redimensiona al lado mayor pedido y devuelve el jpeg como ArrayBuffer listo
// para subir. La conversion pasa por base64 porque es lo que expone el
// manipulador; el Buffer global viene del polyfill de metro.
async function compressToBuffer(uri: string, maxEdgePx: number, quality: number) {
  const { width, height } = await imageSize(uri)
  const longest = Math.max(width, height)
  const scale = Math.min(1, maxEdgePx / longest)

  const context = ImageManipulator.manipulate(uri)
  if (scale < 1) {
    context.resize(
      width >= height
        ? { width: Math.round(width * scale) }
        : { height: Math.round(height * scale) },
    )
  }

  const rendered = await context.renderAsync()
  const result = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: quality, base64: true })
  if (!result.base64) throw new Error('sin base64 al comprimir la imagen')

  const bytes = Buffer.from(result.base64, 'base64')
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
}

export async function uploadAvatar(
  client: TypedSupabaseClient,
  userId: string,
  uri: string,
): Promise<string> {
  const body = await compressToBuffer(uri, 512, 0.85)
  const path = `${userId}/avatar.jpg`
  const { error } = await client.storage
    .from(AVATARS_BUCKET)
    .upload(path, body, { upsert: true, contentType: 'image/jpeg' })

  if (error) throw error

  const { data } = client.storage.from(AVATARS_BUCKET).getPublicUrl(path)
  return `${data.publicUrl}?v=${Date.now()}`
}

export async function uploadActivityPhoto(
  client: TypedSupabaseClient,
  userId: string,
  activityId: string,
  uri: string,
): Promise<string> {
  const body = await compressToBuffer(uri, 1600, 0.82)
  const path = `${userId}/${activityId}/${uniqueSegment()}.jpg`
  const { error } = await client.storage
    .from(ACTIVITY_PHOTOS_BUCKET)
    .upload(path, body, { upsert: false, contentType: 'image/jpeg' })

  if (error) throw error
  return path
}

export async function removeActivityPhoto(
  client: TypedSupabaseClient,
  path: string,
): Promise<void> {
  if (path.startsWith('http')) return
  await client.storage.from(ACTIVITY_PHOTOS_BUCKET).remove([path])
}

export async function resolveActivityPhotoUrl(
  client: TypedSupabaseClient,
  path: string,
): Promise<string | null> {
  if (path.startsWith('http')) return path

  const { data, error } = await client.storage
    .from(ACTIVITY_PHOTOS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)

  if (error) return null
  return data.signedUrl
}

export async function uploadEventPhotoFile(
  client: TypedSupabaseClient,
  eventId: string,
  userId: string,
  uri: string,
): Promise<string> {
  const body = await compressToBuffer(uri, 1600, 0.82)
  const path = `${eventId}/${userId}/${uniqueSegment()}.jpg`
  const { error } = await client.storage
    .from(EVENT_PHOTOS_BUCKET)
    .upload(path, body, { upsert: false, contentType: 'image/jpeg' })

  if (error) throw error
  return path
}

export async function removeEventPhotoFile(
  client: TypedSupabaseClient,
  path: string,
): Promise<void> {
  if (path.startsWith('http')) return
  await client.storage.from(EVENT_PHOTOS_BUCKET).remove([path])
}

export async function resolveEventPhotoUrl(
  client: TypedSupabaseClient,
  path: string,
): Promise<string | null> {
  if (path.startsWith('http')) return path

  const { data, error } = await client.storage
    .from(EVENT_PHOTOS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)

  if (error) return null
  return data.signedUrl
}
