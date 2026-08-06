import type { TypedSupabaseClient } from "@/lib/supabase/types";

import type { Activity, ActivityVisibility } from "./types";

const ACTIVITY_COLUMNS =
  "id, user_id, name, icon, color, unit, step, daily_target, target_period, reminder_at, position, visibility, input_mode, quick_values, is_archived";

const UNIQUE_VIOLATION = "23505";

export type ActivityInput = {
  name: string;
  icon: string;
  color: Activity["color"];
  unit: Activity["unit"];
  step: number;
  daily_target: number | null;
  target_period: Activity["target_period"];
  reminder_at: string | null;
  visibility: ActivityVisibility;
  input_mode: Activity["input_mode"];
  quick_values: number[];
};

export async function fetchActivities(
  client: TypedSupabaseClient,
  userId: string,
): Promise<Activity[]> {
  const { data, error } = await client
    .from("activities")
    .select(ACTIVITY_COLUMNS)
    .eq("user_id", userId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as Activity[];
}

export async function createActivity(
  client: TypedSupabaseClient,
  userId: string,
  input: ActivityInput,
  position: number,
  id: string,
): Promise<Activity | null> {
  const { data, error } = await client
    .from("activities")
    .insert({ ...input, id, user_id: userId, position })
    .select(ACTIVITY_COLUMNS)
    .maybeSingle();

  if (error) {
    if (error.code === UNIQUE_VIOLATION) return null;
    throw error;
  }

  return (data as Activity | null) ?? null;
}

export async function updateActivity(
  client: TypedSupabaseClient,
  activityId: string,
  patch: Partial<ActivityInput & { is_archived: boolean; position: number }>,
): Promise<Activity> {
  const { data, error } = await client
    .from("activities")
    .update(patch)
    .eq("id", activityId)
    .select(ACTIVITY_COLUMNS)
    .single();

  if (error) throw error;
  return data as Activity;
}

// Sin .select() un borrado que RLS rechaza no devuelve error ni filas, asi que
// la pantalla lo daria por bueno y el elemento reaparecería al refrescar. Pedir
// las filas borradas convierte ese silencio en un fallo visible.
export async function deleteActivity(client: TypedSupabaseClient, activityId: string) {
  const { data, error } = await client
    .from("activities")
    .delete()
    .eq("id", activityId)
    .select("id");

  if (error) throw error;
  if ((data ?? []).length > 0) return;

  // Cero filas puede ser un rechazo o un reintento de algo ya borrado, y la cola
  // offline reintenta. Se distingue mirando si la fila sigue ahi.
  const { data: remaining } = await client
    .from("activities")
    .select("id")
    .eq("id", activityId)
    .maybeSingle();

  if (remaining) throw new Error(`No se pudo eliminar la actividad ${activityId}`);
}

export async function reorderActivities(
  client: TypedSupabaseClient,
  orderedIds: string[],
): Promise<void> {
  await Promise.all(
    orderedIds.map((id, position) =>
      client.from("activities").update({ position }).eq("id", id),
    ),
  );
}

export async function fetchActivityShares(
  client: TypedSupabaseClient,
  activityId: string,
): Promise<string[]> {
  const { data, error } = await client
    .from("activity_shares")
    .select("friend_id")
    .eq("activity_id", activityId);

  if (error) throw error;
  return (data ?? []).map((row) => row.friend_id);
}

export async function replaceActivityShares(
  client: TypedSupabaseClient,
  activityId: string,
  friendIds: string[],
): Promise<void> {
  const { error: deleteError } = await client
    .from("activity_shares")
    .delete()
    .eq("activity_id", activityId);
  if (deleteError) throw deleteError;

  if (friendIds.length === 0) return;

  const { error: insertError } = await client
    .from("activity_shares")
    .insert(friendIds.map((friendId) => ({ activity_id: activityId, friend_id: friendId })));
  if (insertError) throw insertError;
}
