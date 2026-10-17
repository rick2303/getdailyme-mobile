import { resolveMomentUrls } from "@/lib/api/storage";
import type { ReactionType } from "@/lib/api/types";
import type { MomentRound } from "@/lib/moments/phase";
import type { TypedSupabaseClient } from "@/lib/supabase/types";

export {
  formatCountdown,
  MOMENT_WINDOW_MS,
  momentPhase,
  type MomentPhase,
  type MomentRound,
} from "@/lib/moments/phase";

// El momento del dia. Las dos reglas que importan las pone la base y aqui solo
// se leen sus efectos:
//
//   - la ronda de hoy no existe para el cliente hasta que suena;
//   - los momentos ajenos no llegan hasta que se ha publicado el propio.
//
// Por eso "no hay ronda" y "no hay momentos de nadie" no son errores: son el
// estado normal de antes de la hora y de antes de publicar.

export const MOMENT_CAPTION_MAX = 150;

export type MomentAuthor = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

export type Moment = {
  id: string;
  userId: string;
  localDate: string;
  mediaPath: string;
  caption: string | null;
  late: boolean;
  createdAt: string;
  author: MomentAuthor | null;
  /** Firmada al vuelo, como las de las historias. */
  url: string | null;
  reactions: { userId: string; kind: ReactionType }[];
  myReaction: ReactionType | null;
};

/** El error que da la base al publicar antes de que suene el momento. */
export class MomentNotOpenError extends Error {
  constructor() {
    super("moment_not_open");
    this.name = "MomentNotOpenError";
  }
}

export async function fetchTodayRound(
  client: TypedSupabaseClient,
  timeZone: string,
  today: string,
): Promise<MomentRound | null> {
  const { data, error } = await client
    .from("moment_rounds")
    .select("id, local_date, fires_at")
    .eq("timezone", timeZone)
    .eq("local_date", today)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return { id: data.id, localDate: data.local_date, firesAt: data.fires_at };
}

const MOMENT_SELECT = `
  id, user_id, local_date, media_path, caption, late, created_at,
  author:profiles!moments_user_id_fkey ( id, username, display_name, avatar_url ),
  moment_reactions ( user_id, kind )
`;

type ProfileRow = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
};

type MomentRow = {
  id: string;
  user_id: string;
  local_date: string;
  media_path: string;
  caption: string | null;
  late: boolean;
  created_at: string;
  author: ProfileRow | ProfileRow[] | null;
  moment_reactions: { user_id: string; kind: ReactionType }[] | null;
};

/**
 * Los momentos de un dia que se pueden ver: el propio y, si ya se publico, los
 * de las amistades. El propio va primero; los demas, por orden de llegada.
 */
export async function fetchMoments(
  client: TypedSupabaseClient,
  viewerId: string,
  dateKey: string,
): Promise<Moment[]> {
  const { data, error } = await client
    .from("moments")
    .select(MOMENT_SELECT)
    .eq("local_date", dateKey)
    .order("created_at", { ascending: true })
    .limit(50);

  if (error) throw error;

  const rows = (data ?? []) as unknown as MomentRow[];
  const urls = await resolveMomentUrls(
    client,
    rows.map((row) => row.media_path),
  );

  const moments = rows.map((row): Moment => {
    const author = Array.isArray(row.author) ? (row.author[0] ?? null) : row.author;
    const reactions = (row.moment_reactions ?? []).map((reaction) => ({
      userId: reaction.user_id,
      kind: reaction.kind,
    }));
    return {
      id: row.id,
      userId: row.user_id,
      localDate: row.local_date,
      mediaPath: row.media_path,
      caption: row.caption,
      late: row.late,
      createdAt: row.created_at,
      author: author
        ? {
            id: author.id,
            username: author.username,
            displayName: author.display_name,
            avatarUrl: author.avatar_url,
          }
        : null,
      url: urls.get(row.media_path) ?? null,
      reactions,
      myReaction: reactions.find((reaction) => reaction.userId === viewerId)?.kind ?? null,
    };
  });

  return [
    ...moments.filter((moment) => moment.userId === viewerId),
    ...moments.filter((moment) => moment.userId !== viewerId),
  ];
}

/** Cuantas amistades lo han publicado ya hoy, sin decir quienes. */
export async function fetchFriendsPosted(
  client: TypedSupabaseClient,
  dateKey: string,
): Promise<number> {
  const { data, error } = await client.rpc("moment_friends_posted", { p_on: dateKey });
  if (error) throw error;
  return data ?? 0;
}

export async function publishMoment(
  client: TypedSupabaseClient,
  userId: string,
  input: { mediaPath: string; caption?: string | null },
): Promise<void> {
  // La fecha local y el "tarde" los pone la base: no se mandan.
  const { error } = await client.from("moments").insert({
    user_id: userId,
    media_path: input.mediaPath,
    caption: input.caption?.trim() ? input.caption.trim().slice(0, MOMENT_CAPTION_MAX) : null,
    local_date: "1970-01-01",
  });

  if (error) {
    if (error.message?.includes("moment_not_open")) throw new MomentNotOpenError();
    throw error;
  }
}

export async function deleteMoment(client: TypedSupabaseClient, momentId: string): Promise<void> {
  const { error } = await client.from("moments").delete().eq("id", momentId);
  if (error) throw error;
}

export async function reactToMoment(
  client: TypedSupabaseClient,
  momentId: string,
  userId: string,
  kind: ReactionType,
): Promise<void> {
  const { error } = await client
    .from("moment_reactions")
    .upsert({ moment_id: momentId, user_id: userId, kind }, { onConflict: "moment_id,user_id" });
  if (error) throw error;
}

export async function clearMomentReaction(
  client: TypedSupabaseClient,
  momentId: string,
  userId: string,
): Promise<void> {
  const { error } = await client
    .from("moment_reactions")
    .delete()
    .eq("moment_id", momentId)
    .eq("user_id", userId);
  if (error) throw error;
}
