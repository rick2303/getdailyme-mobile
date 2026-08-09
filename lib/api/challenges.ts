import type { TypedSupabaseClient } from "@/lib/supabase/types";

export type ChallengeMemberStatus = "invited" | "joined" | "declined";

export type Challenge = {
  id: string;
  creator_id: string;
  title: string;
  target: number;
  starts_on: string;
  ends_on: string;
};

export type ChallengeMembership = Challenge & {
  status: ChallengeMemberStatus;
  activity_id: string | null;
};

export type ChallengeStanding = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  total: number;
};

export type NewChallenge = {
  clubId?: string | null;
  title: string;
  target: number;
  endsOn: string;
  activityId: string;
  friendIds: string[];
};

const CHALLENGE_COLUMNS = "id, creator_id, title, target, starts_on, ends_on";

export async function fetchChallenges(
  client: TypedSupabaseClient,
  userId: string,
): Promise<ChallengeMembership[]> {
  const { data, error } = await client
    .from("challenge_members")
    .select(`status, activity_id, challenge:challenges!inner ( ${CHALLENGE_COLUMNS} )`)
    .eq("user_id", userId)
    .neq("status", "declined")
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? [])
    .map((row) => {
      const challenge = row.challenge as Challenge | null;
      if (!challenge) return null;
      return { ...challenge, status: row.status, activity_id: row.activity_id };
    })
    .filter((row): row is ChallengeMembership => row !== null);
}

export async function fetchChallengeStandings(
  client: TypedSupabaseClient,
  challengeId: string,
): Promise<ChallengeStanding[]> {
  const { data, error } = await client.rpc("challenge_progress", {
    p_challenge_id: challengeId,
  });

  if (error) throw error;
  return (data ?? []) as ChallengeStanding[];
}

export async function createChallenge(
  client: TypedSupabaseClient,
  userId: string,
  input: NewChallenge,
): Promise<string> {
  const { data, error } = await client
    .from("challenges")
    .insert({
      creator_id: userId,
      title: input.title,
      target: input.target,
      ends_on: input.endsOn,
      club_id: input.clubId ?? null,
    })
    .select("id")
    .single();

  if (error) throw error;

  const challengeId = data.id;

  // Quien lo crea entra ya dentro; el resto queda invitado y elige su propia
  // actividad al aceptar.
  const rows = [
    {
      challenge_id: challengeId,
      user_id: userId,
      activity_id: input.activityId,
      status: "joined" as const,
    },
    ...input.friendIds.map((friendId) => ({
      challenge_id: challengeId,
      user_id: friendId,
      activity_id: null,
      status: "invited" as const,
    })),
  ];

  const { error: membersError } = await client.from("challenge_members").insert(rows);
  if (membersError) throw membersError;

  return challengeId;
}

export async function joinChallenge(
  client: TypedSupabaseClient,
  challengeId: string,
  userId: string,
  activityId: string,
): Promise<void> {
  const { error } = await client
    .from("challenge_members")
    .update({ status: "joined", activity_id: activityId })
    .eq("challenge_id", challengeId)
    .eq("user_id", userId);

  if (error) throw error;
}

export async function updateChallenge(
  client: TypedSupabaseClient,
  challengeId: string,
  patch: { title?: string; target?: number; ends_on?: string },
): Promise<void> {
  const { error } = await client.from("challenges").update(patch).eq("id", challengeId);
  if (error) throw error;
}

export async function leaveChallenge(
  client: TypedSupabaseClient,
  challengeId: string,
  userId: string,
): Promise<void> {
  const { error } = await client
    .from("challenge_members")
    .delete()
    .eq("challenge_id", challengeId)
    .eq("user_id", userId);

  if (error) throw error;
}

export function challengeDaysLeft(endsOn: string, today: string): number {
  const end = Date.parse(`${endsOn}T00:00:00Z`);
  const now = Date.parse(`${today}T00:00:00Z`);
  return Math.round((end - now) / 86_400_000);
}
