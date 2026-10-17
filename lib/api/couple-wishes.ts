import type { EventInput } from "@/lib/api/events";
import type { TypedSupabaseClient } from "@/lib/supabase/types";
import { dateKeyToDate, shiftDateKey, zonedDateTimeToIso } from "@/lib/utils/dates";

// La lista de cosas por hacer juntos. Es de los dos por igual: cualquiera
// anade, tacha o quita, y lo que se convierte en plan apunta a su evento.

export type CoupleWish = {
  id: string;
  title: string;
  note: string | null;
  createdBy: string;
  createdAt: string;
  doneAt: string | null;
  doneBy: string | null;
  eventId: string | null;
};

export const WISH_TITLE_MAX = 120;
export const WISH_NOTE_MAX = 500;

const WISH_SELECT = "id, title, note, created_by, created_at, done_at, done_by, event_id";

type WishRow = {
  id: string;
  title: string;
  note: string | null;
  created_by: string;
  created_at: string;
  done_at: string | null;
  done_by: string | null;
  event_id: string | null;
};

function toWish(row: WishRow): CoupleWish {
  return {
    id: row.id,
    title: row.title,
    note: row.note,
    createdBy: row.created_by,
    createdAt: row.created_at,
    doneAt: row.done_at,
    doneBy: row.done_by,
    eventId: row.event_id,
  };
}

export async function fetchWishes(
  client: TypedSupabaseClient,
  coupleId: string,
): Promise<CoupleWish[]> {
  const { data, error } = await client
    .from("couple_wishes")
    .select(WISH_SELECT)
    .eq("couple_id", coupleId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;
  return sortWishes((data ?? []).map(toWish));
}

/**
 * Lo pendiente arriba, de lo nuevo a lo viejo; lo hecho abajo, de lo ultimo
 * que se hizo hacia atras. Es una lista de cosas por hacer, no un archivo.
 */
export function sortWishes(wishes: CoupleWish[]): CoupleWish[] {
  return [...wishes].sort((a, b) => {
    if (Boolean(a.doneAt) !== Boolean(b.doneAt)) return a.doneAt ? 1 : -1;
    if (a.doneAt && b.doneAt) return b.doneAt.localeCompare(a.doneAt);
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export async function addWish(
  client: TypedSupabaseClient,
  coupleId: string,
  userId: string,
  input: { title: string; note?: string | null },
): Promise<CoupleWish> {
  const { data, error } = await client
    .from("couple_wishes")
    .insert({
      couple_id: coupleId,
      created_by: userId,
      title: input.title.trim().slice(0, WISH_TITLE_MAX),
      note: input.note?.trim() ? input.note.trim().slice(0, WISH_NOTE_MAX) : null,
    })
    .select(WISH_SELECT)
    .single();

  if (error) throw error;
  return toWish(data as WishRow);
}

export async function updateWish(
  client: TypedSupabaseClient,
  wishId: string,
  patch: { title?: string; note?: string | null },
): Promise<void> {
  const update: { title?: string; note?: string | null } = {};
  if (patch.title !== undefined) update.title = patch.title.trim().slice(0, WISH_TITLE_MAX);
  if (patch.note !== undefined) {
    update.note = patch.note?.trim() ? patch.note.trim().slice(0, WISH_NOTE_MAX) : null;
  }
  const { error } = await client.from("couple_wishes").update(update).eq("id", wishId);
  if (error) throw error;
}

/** Tachar o destachar. `userId` nulo devuelve el deseo a pendiente. */
export async function setWishDone(
  client: TypedSupabaseClient,
  wishId: string,
  userId: string | null,
): Promise<void> {
  const { error } = await client
    .from("couple_wishes")
    .update(
      userId
        ? { done_at: new Date().toISOString(), done_by: userId }
        : { done_at: null, done_by: null },
    )
    .eq("id", wishId);
  if (error) throw error;
}

export async function linkWishToEvent(
  client: TypedSupabaseClient,
  wishId: string,
  eventId: string | null,
): Promise<void> {
  const { error } = await client
    .from("couple_wishes")
    .update({ event_id: eventId })
    .eq("id", wishId);
  if (error) throw error;
}

export async function deleteWish(client: TypedSupabaseClient, wishId: string): Promise<void> {
  const { error } = await client.from("couple_wishes").delete().eq("id", wishId);
  if (error) throw error;
}

/** El sabado que viene (o el de hoy, si hoy es sabado): el dia por defecto de un plan. */
export function nextSaturdayKey(today: string): string {
  const weekday = dateKeyToDate(today).getUTCDay();
  return shiftDateKey(today, (6 - weekday + 7) % 7);
}

/**
 * El evento que nace de un deseo: de todo el dia, con el corazon de la pareja.
 * Se crea con lo minimo para que convertir sea un toque; los detalles se
 * cambian despues desde el evento, como cualquier otro.
 */
export function wishEventInput(
  wish: Pick<CoupleWish, "title" | "note">,
  dateKey: string,
  timeZone: string,
): EventInput {
  return {
    title: wish.title,
    description: wish.note,
    icon: "heart-handshake",
    color: "pink",
    starts_at: zonedDateTimeToIso(dateKey, "00:00", timeZone),
    ends_at: null,
    all_day: true,
  };
}
