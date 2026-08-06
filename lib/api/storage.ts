import type { TypedSupabaseClient } from "@/lib/supabase/types";
import { AVATAR_PRESET, compressImage } from "@/lib/utils/images";

export const AVATARS_BUCKET = "avatars";
export const ACTIVITY_PHOTOS_BUCKET = "activity-photos";
export const EVENT_PHOTOS_BUCKET = "event-photos";

const SIGNED_URL_TTL_SECONDS = 60 * 60;

function uniqueSegment(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
}

function extensionFor(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{2,5}$/.test(fromName)) return fromName;
  return file.type.split("/").pop() ?? "jpg";
}

export async function uploadAvatar(
  client: TypedSupabaseClient,
  userId: string,
  original: File,
): Promise<string> {
  const file = await compressImage(original, AVATAR_PRESET);
  const path = `${userId}/avatar.${extensionFor(file)}`;
  const { error } = await client.storage
    .from(AVATARS_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) throw error;

  const { data } = client.storage.from(AVATARS_BUCKET).getPublicUrl(path);
  return `${data.publicUrl}?v=${Date.now()}`;
}

export async function uploadActivityPhoto(
  client: TypedSupabaseClient,
  userId: string,
  activityId: string,
  original: File,
): Promise<string> {
  const file = await compressImage(original);
  const path = `${userId}/${activityId}/${uniqueSegment()}.${extensionFor(file)}`;
  const { error } = await client.storage
    .from(ACTIVITY_PHOTOS_BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type });

  if (error) throw error;
  return path;
}

export async function removeActivityPhoto(
  client: TypedSupabaseClient,
  path: string,
): Promise<void> {
  if (path.startsWith("http")) return;
  await client.storage.from(ACTIVITY_PHOTOS_BUCKET).remove([path]);
}

export async function resolveActivityPhotoUrl(
  client: TypedSupabaseClient,
  path: string,
): Promise<string | null> {
  if (path.startsWith("http")) return path;

  const { data, error } = await client.storage
    .from(ACTIVITY_PHOTOS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  if (error) return null;
  return data.signedUrl;
}

export function eventPhotoPath(eventId: string, userId: string, file: File): string {
  return `${eventId}/${userId}/${uniqueSegment()}.${extensionFor(file)}`;
}

export async function uploadEventPhotoFile(
  client: TypedSupabaseClient,
  eventId: string,
  userId: string,
  original: File,
): Promise<string> {
  const file = await compressImage(original);
  const path = eventPhotoPath(eventId, userId, file);
  const { error } = await client.storage
    .from(EVENT_PHOTOS_BUCKET)
    .upload(path, file, { upsert: false, contentType: file.type });

  if (error) throw error;
  return path;
}

export async function removeEventPhotoFile(
  client: TypedSupabaseClient,
  path: string,
): Promise<void> {
  if (path.startsWith("http")) return;
  await client.storage.from(EVENT_PHOTOS_BUCKET).remove([path]);
}

export async function resolveEventPhotoUrl(
  client: TypedSupabaseClient,
  path: string,
): Promise<string | null> {
  if (path.startsWith("http")) return path;

  const { data, error } = await client.storage
    .from(EVENT_PHOTOS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  if (error) return null;
  return data.signedUrl;
}
