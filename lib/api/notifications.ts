import type { TypedSupabaseClient } from "@/lib/supabase/types";

import type { CommentAuthor } from "./types";

export type NotificationType =
  | "comment"
  | "reply"
  | "reaction"
  | "friend_request"
  | "friend_accept"
  | "couple_answer"
  | "event_invite"
  | "story_reaction"
  | "challenge_joined"
  | "challenge_ending"
  | "challenge_finished"
  | "friend_streak_risk";

const CHALLENGE_TYPES: NotificationType[] = [
  "challenge_joined",
  "challenge_ending",
  "challenge_finished",
];

export function isChallengeNotification(type: NotificationType): boolean {
  return CHALLENGE_TYPES.includes(type);
}

export type InboxNotification = {
  id: string;
  type: NotificationType;
  log_id: string | null;
  comment_id: string | null;
  event_id: string | null;
  story_id: string | null;
  challenge_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
  actor: CommentAuthor;
  challenge: { title: string } | null;
};

const NOTIFICATION_SELECT = `
  id, type, log_id, comment_id, event_id, story_id, challenge_id, details, created_at,
  actor:profiles!notifications_actor_id_fkey ( id, username, display_name, avatar_url ),
  challenge:challenges ( title )
`;

type RawNotification = Omit<InboxNotification, "actor" | "challenge"> & {
  actor: CommentAuthor | CommentAuthor[] | null;
  challenge: { title: string } | { title: string }[] | null;
};

// Solo las no leidas: la bandeja es un "desde tu ultima visita", no un
// historial. Lo leido desaparece y el feed vuelve a mandar.
export async function fetchUnreadNotifications(
  client: TypedSupabaseClient,
): Promise<InboxNotification[]> {
  const { data, error } = await client
    .from("notifications")
    .select(NOTIFICATION_SELECT)
    .is("read_at", null)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) throw error;

  return ((data ?? []) as unknown as RawNotification[])
    .map((row) => {
      const actor = Array.isArray(row.actor) ? (row.actor[0] ?? null) : row.actor;
      if (!actor) return null;
      const challenge = Array.isArray(row.challenge)
        ? (row.challenge[0] ?? null)
        : row.challenge;
      if (isChallengeNotification(row.type) && !challenge) return null;
      return { ...row, actor, challenge };
    })
    .filter((row): row is InboxNotification => row !== null);
}

export async function markNotificationsRead(
  client: TypedSupabaseClient,
  ids: string[],
): Promise<void> {
  if (ids.length === 0) return;

  const { error } = await client
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .in("id", ids);

  if (error) throw error;
}
