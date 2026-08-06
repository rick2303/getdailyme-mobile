import type { TypedSupabaseClient } from "@/lib/supabase/types";

import type { ActiveSession } from "./types";

const SESSION_COLUMNS = "id, user_id, activity_id, started_at";

export async function fetchActiveSessions(
  client: TypedSupabaseClient,
  userId: string,
): Promise<ActiveSession[]> {
  const { data, error } = await client
    .from("active_sessions")
    .select(SESSION_COLUMNS)
    .eq("user_id", userId);

  if (error) throw error;
  return (data ?? []) as ActiveSession[];
}

export async function startSession(
  client: TypedSupabaseClient,
  userId: string,
  activityId: string,
): Promise<ActiveSession> {
  const { data, error } = await client
    .from("active_sessions")
    .upsert(
      { user_id: userId, activity_id: activityId, started_at: new Date().toISOString() },
      { onConflict: "user_id,activity_id" },
    )
    .select(SESSION_COLUMNS)
    .single();

  if (error) throw error;
  return data as ActiveSession;
}

export async function clearSession(
  client: TypedSupabaseClient,
  userId: string,
  activityId: string,
): Promise<void> {
  const { error } = await client
    .from("active_sessions")
    .delete()
    .eq("user_id", userId)
    .eq("activity_id", activityId);

  if (error) throw error;
}
