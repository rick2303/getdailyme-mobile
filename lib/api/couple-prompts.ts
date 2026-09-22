import type { PromptState } from "@/lib/couple/prompts";
import type { TypedSupabaseClient } from "@/lib/supabase/types";

export const CUSTOM_PROMPT_MAX = 200;
export const CUSTOM_PROMPT_PENDING_LIMIT = 5;

export type CustomPrompt = {
  id: string;
  body: string;
  createdAt: string;
};

type RawState = {
  today_key: string | null;
  used: Record<string, number> | null;
  custom: { id: string; body: string; author_id: string } | null;
  pending_from_partner: number | null;
};

const EMPTY_STATE: PromptState = { todayKey: null, used: {}, custom: null, pendingFromPartner: 0 };

export async function fetchPromptState(
  client: TypedSupabaseClient,
  coupleId: string,
  dateKey: string,
): Promise<PromptState> {
  const { data, error } = await client.rpc("couple_prompt_state", {
    p_couple: coupleId,
    p_on: dateKey,
  });

  if (error) throw error;
  const raw = data as RawState | null;
  if (!raw) return EMPTY_STATE;

  return {
    todayKey: raw.today_key,
    used: raw.used ?? {},
    custom: raw.custom
      ? { id: raw.custom.id, body: raw.custom.body, authorId: raw.custom.author_id }
      : null,
    pendingFromPartner: raw.pending_from_partner ?? 0,
  };
}

export async function fetchMyPendingPrompts(
  client: TypedSupabaseClient,
  coupleId: string,
  userId: string,
  usedKeys: Record<string, number>,
  todayKey: string | null,
): Promise<CustomPrompt[]> {
  const { data, error } = await client
    .from("couple_custom_prompts")
    .select("id, body, created_at")
    .eq("couple_id", coupleId)
    .eq("author_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? [])
    .filter((row) => {
      const key = `custom:${row.id}`;
      return !usedKeys[key] && todayKey !== key;
    })
    .map((row) => ({ id: row.id, body: row.body, createdAt: row.created_at }));
}

export async function addCustomPrompt(
  client: TypedSupabaseClient,
  coupleId: string,
  userId: string,
  body: string,
): Promise<void> {
  const { error } = await client
    .from("couple_custom_prompts")
    .insert({ couple_id: coupleId, author_id: userId, body: body.trim() });

  if (error) throw error;
}

export async function deleteCustomPrompt(client: TypedSupabaseClient, id: string): Promise<void> {
  const { error } = await client.from("couple_custom_prompts").delete().eq("id", id);
  if (error) throw error;
}

export function isPromptLimitError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    String((error as { message: unknown }).message).includes("custom_prompt_limit")
  );
}
