import { resolveActivityColor } from "@/lib/activities/colors";
import { resolveActivityUnit } from "@/lib/activities/units";
import type { TypedSupabaseClient } from "@/lib/supabase/types";

import type { CommentAuthor, FeedComment, FeedEntry, ReactionType } from "./types";

export const FEED_PAGE_SIZE = 20;

const FEED_SELECT = `
  id, user_id, amount, note, photo_url, logged_at,
  author:profiles!activity_logs_user_id_fkey ( username, display_name, avatar_url ),
  activity:activities!inner ( id, name, icon, color, unit ),
  reactions ( id, type, user_id ),
  comments ( count )
`;

type RawFeedRow = {
  id: string;
  user_id: string;
  amount: number;
  note: string | null;
  photo_url: string | null;
  logged_at: string;
  author: { username: string; display_name: string; avatar_url: string | null } | null;
  activity: { id: string; name: string; icon: string; color: string; unit: string } | null;
  reactions: { id: string; type: string; user_id: string }[] | null;
  // `comments ( count )` no trae las filas, trae una sola con el total. Antes se
  // pedia `comments ( id )` y se contaba en el cliente: un registro con
  // doscientos comentarios viajaba entero, y multiplicado por las veinte
  // entradas de cada pagina, solo para pintar un numero.
  comments: { count: number }[] | null;
};

function mapFeedRow(row: RawFeedRow): FeedEntry | null {
  if (!row.author || !row.activity) return null;

  return {
    id: row.id,
    user_id: row.user_id,
    amount: row.amount,
    note: row.note,
    photo_url: row.photo_url,
    logged_at: row.logged_at,
    author: row.author,
    activity: {
      id: row.activity.id,
      name: row.activity.name,
      icon: row.activity.icon,
      color: resolveActivityColor(row.activity.color),
      unit: resolveActivityUnit(row.activity.unit),
    },
    reactions: (row.reactions ?? []).map((reaction) => ({
      id: reaction.id,
      type: reaction.type as ReactionType,
      user_id: reaction.user_id,
    })),
    comment_count: row.comments?.[0]?.count ?? 0,
  };
}

const COMMENT_SELECT = `
  id, log_id, user_id, body, created_at, updated_at, parent_id,
  author:profiles!comments_user_id_fkey ( id, username, display_name, avatar_url ),
  reply_to:profiles!comments_reply_to_user_id_fkey ( username, display_name )
`;

type Embedded<T> = T | T[] | null | undefined;

type RawComment = {
  id: string;
  log_id: string;
  user_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  parent_id: string | null;
  author: Embedded<CommentAuthor>;
  reply_to: Embedded<NonNullable<FeedComment["reply_to"]>>;
};

function first<T>(value: Embedded<T>): T | null {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function mapComment(row: RawComment): FeedComment | null {
  const author = first(row.author);
  if (!author) return null;

  return {
    id: row.id,
    log_id: row.log_id,
    user_id: row.user_id,
    body: row.body,
    created_at: row.created_at,
    updated_at: row.updated_at,
    parent_id: row.parent_id,
    reply_to: first(row.reply_to),
    author,
  };
}

// Un hilo se traia entero, sin tope. Se acota por arriba, pero pidiendo los mas
// recientes y dandoles la vuelta despues: con `ascending` y un limite lo que se
// perderia son los ultimos comentarios, que es justo lo que la gente viene a
// leer.
export const COMMENTS_PAGE_SIZE = 200;

export async function fetchComments(
  client: TypedSupabaseClient,
  logId: string,
): Promise<FeedComment[]> {
  const { data, error } = await client
    .from("comments")
    .select(COMMENT_SELECT)
    .eq("log_id", logId)
    .order("created_at", { ascending: false })
    .limit(COMMENTS_PAGE_SIZE);

  if (error) throw error;

  return ((data ?? []) as unknown as RawComment[])
    .reverse()
    .map(mapComment)
    .filter((comment): comment is FeedComment => comment !== null);
}

export type NewComment = {
  logId: string;
  userId: string;
  body: string;
  parentId?: string | null;
  replyToUserId?: string | null;
};

export async function addComment(
  client: TypedSupabaseClient,
  comment: NewComment,
): Promise<string | null> {
  const { data, error } = await client
    .from("comments")
    .insert({
      log_id: comment.logId,
      user_id: comment.userId,
      body: comment.body.trim(),
      parent_id: comment.parentId ?? null,
      reply_to_user_id: comment.parentId ? (comment.replyToUserId ?? null) : null,
    })
    .select("id")
    .maybeSingle();

  if (error) throw error;
  return data?.id ?? null;
}

export async function updateComment(
  client: TypedSupabaseClient,
  commentId: string,
  body: string,
): Promise<void> {
  const { error } = await client
    .from("comments")
    .update({ body: body.trim() })
    .eq("id", commentId);

  if (error) throw error;
}

export async function deleteComment(
  client: TypedSupabaseClient,
  commentId: string,
): Promise<void> {
  const { error } = await client.from("comments").delete().eq("id", commentId);
  if (error) throw error;
}

export async function fetchFeedPage(
  client: TypedSupabaseClient,
  options: { before?: string | null; limit?: number } = {},
): Promise<FeedEntry[]> {
  const limit = options.limit ?? FEED_PAGE_SIZE;

  let query = client
    .from("activity_logs")
    .select(FEED_SELECT)
    .order("logged_at", { ascending: false })
    .limit(limit);

  if (options.before) query = query.lt("logged_at", options.before);

  const { data, error } = await query;
  if (error) throw error;

  return ((data ?? []) as unknown as RawFeedRow[])
    .map(mapFeedRow)
    .filter((entry): entry is FeedEntry => entry !== null);
}

export async function fetchFeedEntry(
  client: TypedSupabaseClient,
  logId: string,
): Promise<FeedEntry | null> {
  const { data, error } = await client
    .from("activity_logs")
    .select(FEED_SELECT)
    .eq("id", logId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return mapFeedRow(data as unknown as RawFeedRow);
}

export async function addReaction(
  client: TypedSupabaseClient,
  logId: string,
  userId: string,
  type: ReactionType,
): Promise<string | null> {
  const { data, error } = await client
    .from("reactions")
    .insert({ log_id: logId, user_id: userId, type })
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") return null;
    throw error;
  }

  return data?.id ?? null;
}

export async function removeReaction(
  client: TypedSupabaseClient,
  logId: string,
  userId: string,
  type: ReactionType,
): Promise<void> {
  const { error } = await client
    .from("reactions")
    .delete()
    .eq("log_id", logId)
    .eq("user_id", userId)
    .eq("type", type);

  if (error) throw error;
}
