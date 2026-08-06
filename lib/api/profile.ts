import type { TypedSupabaseClient } from "@/lib/supabase/types";

import type { Profile } from "./types";

const PROFILE_COLUMNS =
  "id, username, display_name, avatar_url, timezone, locale, created_at, username_changed_at";

export const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

export async function fetchProfile(
  client: TypedSupabaseClient,
  userId: string,
): Promise<Profile | null> {
  const { data, error } = await client
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", userId)
    .maybeSingle();

  if (error) throw error;
  return (data as Profile | null) ?? null;
}

export async function updateProfile(
  client: TypedSupabaseClient,
  userId: string,
  patch: Partial<
    Pick<Profile, "username" | "display_name" | "avatar_url" | "timezone" | "locale">
  > & {
    onboarded_at?: string;
    notify_nudges?: boolean;
    notify_reactions?: boolean;
    notify_comments?: boolean;
    daily_reminder_at?: string | null;
  },
): Promise<Profile> {
  const { data, error } = await client
    .from("profiles")
    .update(patch)
    .eq("id", userId)
    .select(PROFILE_COLUMNS)
    .single();

  if (error) throw error;
  return data as Profile;
}

export type ProfileCard = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
  current_streak: number;
  longest_streak: number;
  active_days: number;
  total_logs: number;
};

// La racha de otra persona no sale del cliente: sus registros solo se ven en
// parte, segun que actividades comparta contigo, asi que contarlos aqui daria un
// numero mas bajo que el que ella ve. La funcion los suma todos en el servidor y
// solo devuelve el resultado.
export async function fetchProfileCard(
  client: TypedSupabaseClient,
  userId: string,
): Promise<ProfileCard | null> {
  const { data, error } = await client.rpc("profile_card", { p_user_id: userId });

  if (error) throw error;

  const row = (data ?? [])[0];
  return row ? (row as ProfileCard) : null;
}

export async function isUsernameAvailable(
  client: TypedSupabaseClient,
  username: string,
  currentUserId?: string,
): Promise<boolean> {
  // Por RPC porque un perfil ajeno ya no se puede leer desde la tabla: mirarla
  // daria por libre lo que esta cogido y el alta fallaria contra el indice
  // unico. La funcion excluye por su cuenta el usuario propio.
  void currentUserId;

  const { data, error } = await client.rpc("username_available", {
    p_username: username,
  });

  if (error) throw error;
  return data === true;
}
