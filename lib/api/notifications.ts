import type { TypedSupabaseClient } from "@/lib/supabase/types";

import type { CommentAuthor } from "./types";

export type NotificationType =
  | "comment"
  | "reply"
  | "reaction"
  | "friend_request"
  | "friend_accept"
  | "event_invite";

export type InboxNotification = {
  id: string;
  type: NotificationType;
  log_id: string | null;
  comment_id: string | null;
  event_id: string | null;
  created_at: string;
  actor: CommentAuthor;
};

const NOTIFICATION_SELECT = `
  id, type, log_id, comment_id, event_id, created_at,
  actor:profiles!notifications_actor_id_fkey ( id, username, display_name, avatar_url )
`;

type RawNotification = Omit<InboxNotification, "actor"> & {
  actor: CommentAuthor | CommentAuthor[] | null;
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
      return { ...row, actor };
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
