import { isCoupleMood, type CoupleMood } from "@/lib/couple/moods";
import type { TypedSupabaseClient } from "@/lib/supabase/types";

// Estar presente sin escribir: el estado de cada uno y "pienso en ti".
//
// Las dos cosas las lee tambien el widget de pareja. Por eso esta capa no sabe
// nada de pantallas: devuelve datos planos que la app y el widget pintan cada
// uno a su manera.

export type CoupleMoodEntry = {
  userId: string;
  mood: CoupleMood;
  updatedAt: string;
};

export type PingOutcome = "sent" | "too_soon" | "no_couple" | "unauthenticated";

export type PingResult = {
  outcome: PingOutcome;
  pingId: string | null;
};

export type PingTally = {
  /** Cuantas veces te ha pensado la otra persona desde `since`. */
  received: number;
  /** Y cuantas la has pensado tu. */
  sent: number;
  lastReceivedAt: string | null;
};

export async function fetchMoods(
  client: TypedSupabaseClient,
  coupleId: string,
): Promise<CoupleMoodEntry[]> {
  const { data, error } = await client
    .from("couple_moods")
    .select("user_id, mood, updated_at")
    .eq("couple_id", coupleId);

  if (error) throw error;

  return (data ?? [])
    .filter((row) => isCoupleMood(row.mood))
    .map((row) => ({
      userId: row.user_id,
      mood: row.mood as CoupleMood,
      updatedAt: row.updated_at,
    }));
}

export async function setMood(
  client: TypedSupabaseClient,
  coupleId: string,
  userId: string,
  mood: CoupleMood,
): Promise<void> {
  const { error } = await client
    .from("couple_moods")
    .upsert({ couple_id: coupleId, user_id: userId, mood }, { onConflict: "couple_id,user_id" });
  if (error) throw error;
}

export async function clearMood(
  client: TypedSupabaseClient,
  coupleId: string,
  userId: string,
): Promise<void> {
  const { error } = await client
    .from("couple_moods")
    .delete()
    .eq("couple_id", coupleId)
    .eq("user_id", userId);
  if (error) throw error;
}

/** Pienso en ti. El freno de 15 segundos lo pone la base. */
export async function sendPing(client: TypedSupabaseClient): Promise<PingResult> {
  const { data, error } = await client.rpc("send_couple_ping");
  if (error) throw error;

  const row = (data ?? [])[0];
  if (!row) return { outcome: "no_couple", pingId: null };
  return { outcome: row.outcome as PingOutcome, pingId: row.ping_id };
}

export async function fetchPingTally(
  client: TypedSupabaseClient,
  coupleId: string,
  userId: string,
  since: string,
): Promise<PingTally> {
  const { data, error } = await client
    .from("couple_pings")
    .select("sender_id, created_at")
    .eq("couple_id", coupleId)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;
  return tallyPings(data ?? [], userId);
}

export function tallyPings(
  rows: { sender_id: string; created_at: string }[],
  userId: string,
): PingTally {
  let received = 0;
  let sent = 0;
  let lastReceivedAt: string | null = null;

  for (const row of rows) {
    if (row.sender_id === userId) {
      sent += 1;
      continue;
    }
    received += 1;
    if (!lastReceivedAt || row.created_at > lastReceivedAt) lastReceivedAt = row.created_at;
  }

  return { received, sent, lastReceivedAt };
}
