import type { TypedSupabaseClient } from "@/lib/supabase/types";

import type { Profile } from "./types";

// Clubes: grupos con ranking semanal agregado y retos propios. La visibilidad
// de los registros no cambia por pertenecer a un club.
export type ClubMember = {
  user_id: string;
  role: string;
  profile: Pick<Profile, "id" | "username" | "display_name" | "avatar_url">;
};

export type Club = {
  id: string;
  name: string;
  icon: string;
  color: string;
  creator_id: string;
  invite_code: string;
  members: ClubMember[];
};

export type ClubRankingRow = { user_id: string; log_count: number };

const MEMBER_COLUMNS =
  "club_id, user_id, role, profile:profiles (id, username, display_name, avatar_url)";

export async function fetchClubs(client: TypedSupabaseClient): Promise<Club[]> {
  const { data: clubs, error } = await client
    .from("clubs")
    .select("id, name, icon, color, creator_id, invite_code")
    .order("created_at", { ascending: true });

  if (error) throw error;
  if (!clubs || clubs.length === 0) return [];

  const { data: members, error: membersError } = await client
    .from("club_members")
    .select(MEMBER_COLUMNS)
    .in(
      "club_id",
      clubs.map((club) => club.id),
    );

  if (membersError) throw membersError;

  const byClub = new Map<string, ClubMember[]>();
  for (const row of (members ?? []) as unknown as (ClubMember & { club_id: string })[]) {
    const list = byClub.get(row.club_id) ?? [];
    list.push(row);
    byClub.set(row.club_id, list);
  }

  return clubs.map((club) => ({ ...club, members: byClub.get(club.id) ?? [] }));
}

export async function createClub(
  client: TypedSupabaseClient,
  userId: string,
  input: { name: string; icon: string; color: string },
): Promise<string> {
  const { data, error } = await client
    .from("clubs")
    .insert({ ...input, creator_id: userId })
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function joinClub(client: TypedSupabaseClient, code: string): Promise<string> {
  const { data, error } = await client.rpc("join_club", { p_code: code.trim().toLowerCase() });
  if (error) throw error;
  return data as string;
}

export async function leaveClub(
  client: TypedSupabaseClient,
  clubId: string,
  userId: string,
): Promise<void> {
  const { error } = await client
    .from("club_members")
    .delete()
    .eq("club_id", clubId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function deleteClub(client: TypedSupabaseClient, clubId: string): Promise<void> {
  const { error } = await client.from("clubs").delete().eq("id", clubId);
  if (error) throw error;
}

export async function fetchClubRanking(
  client: TypedSupabaseClient,
  clubId: string,
): Promise<ClubRankingRow[]> {
  const { data, error } = await client.rpc("club_weekly_ranking", { p_club_id: clubId });
  if (error) throw error;
  return (data ?? []) as ClubRankingRow[];
}
