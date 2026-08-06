import type { TypedSupabaseClient } from "@/lib/supabase/types";

import type { ActivityLog } from "./types";

const LOG_COLUMNS = "id, activity_id, user_id, amount, note, photo_url, logged_at, local_date";

const UNIQUE_VIOLATION = "23505";

export type CreateLogInput = {
  id: string;
  activity_id: string;
  user_id: string;
  amount: number;
  note?: string | null;
  photo_url?: string | null;
  logged_at: string;
  local_date: string;
};

export async function fetchLogsSince(
  client: TypedSupabaseClient,
  userId: string,
  sinceDate: string,
): Promise<ActivityLog[]> {
  const { data, error } = await client
    .from("activity_logs")
    .select(LOG_COLUMNS)
    .eq("user_id", userId)
    .gte("local_date", sinceDate)
    .order("logged_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as ActivityLog[];
}

export type DailyTotal = {
  activity_id: string;
  day: string;
  total: number;
  log_count: number;
};

export async function fetchDailyTotals(
  client: TypedSupabaseClient,
  days: number,
): Promise<DailyTotal[]> {
  const { data, error } = await client.rpc("daily_totals", { p_days: days });

  if (error) throw error;
  return (data ?? []) as DailyTotal[];
}

export async function createLog(
  client: TypedSupabaseClient,
  input: CreateLogInput,
): Promise<ActivityLog | null> {
  const { data, error } = await client
    .from("activity_logs")
    .insert(input)
    .select(LOG_COLUMNS)
    .maybeSingle();

  if (error) {
    if (error.code === UNIQUE_VIOLATION) return null;
    throw error;
  }

  return (data as ActivityLog | null) ?? null;
}

export async function updateLog(
  client: TypedSupabaseClient,
  logId: string,
  patch: Partial<Pick<ActivityLog, "amount" | "note" | "photo_url" | "logged_at">>,
): Promise<ActivityLog> {
  const { data, error } = await client
    .from("activity_logs")
    .update(patch)
    .eq("id", logId)
    .select(LOG_COLUMNS)
    .single();

  if (error) throw error;
  return data as ActivityLog;
}

export async function deleteLog(client: TypedSupabaseClient, logId: string): Promise<void> {
  const { error } = await client.from("activity_logs").delete().eq("id", logId);
  if (error) throw error;
}
