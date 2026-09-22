import { resolveStoryUrls } from "@/lib/api/storage";
import type { ReactionType } from "@/lib/api/types";
import type { TypedSupabaseClient } from "@/lib/supabase/types";

// Historias de 24 h. Lo unico que hay que tener presente al leer esto: caducar
// y archivar son la misma fila. Aqui no se borra ni se mueve nada; lo que
// cambia es si la consulta filtra por `expires_at` o no.

export type StoryRingEntry = {
  authorId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  isCouple: boolean;
  total: number;
  unseen: number;
  latestAt: string;
};

export type Story = {
  id: string;
  authorId: string;
  coupleId: string | null;
  mediaPath: string;
  caption: string | null;
  placeLabel: string | null;
  lat: number | null;
  lon: number | null;
  createdAt: string;
  expiresAt: string;
  /** Firmada al vuelo: las URL de un bucket privado caducan, no se guardan. */
  url: string | null;
  seen: boolean;
  myReaction: ReactionType | null;
};

export type NewStory = {
  mediaPath: string;
  caption?: string;
  /** Con valor, la historia es solo para la pareja. */
  coupleId?: string | null;
  place?: { label: string | null; lat: number | null; lon: number | null } | null;
};

export type StoryViewer = {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  seenAt: string;
  reaction: ReactionType | null;
};

const STORY_COLUMNS =
  "id, author_id, couple_id, media_path, caption, place_label, lat, lon, created_at, expires_at";

const STORY_SELECT = `${STORY_COLUMNS}, story_views(viewer_id), story_reactions(user_id, kind)`;

type StoryRow = {
  id: string;
  author_id: string;
  couple_id: string | null;
  media_path: string;
  caption: string | null;
  place_label: string | null;
  lat: number | null;
  lon: number | null;
  created_at: string;
  expires_at: string;
  story_views?: { viewer_id: string }[] | null;
  story_reactions?: { user_id: string; kind: ReactionType }[] | null;
};

async function toStories(
  client: TypedSupabaseClient,
  rows: StoryRow[],
  viewerId: string | null,
): Promise<Story[]> {
  const urls = await resolveStoryUrls(
    client,
    rows.map((row) => row.media_path),
  );

  return rows.map((row) => ({
    id: row.id,
    authorId: row.author_id,
    coupleId: row.couple_id,
    mediaPath: row.media_path,
    caption: row.caption,
    placeLabel: row.place_label,
    lat: row.lat,
    lon: row.lon,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    url: urls.get(row.media_path) ?? null,
    seen:
      row.author_id === viewerId ||
      (row.story_views ?? []).some((view) => view.viewer_id === viewerId),
    myReaction:
      (row.story_reactions ?? []).find((reaction) => reaction.user_id === viewerId)?.kind ?? null,
  }));
}

/** Quien tiene historias vivas ahora mismo, y cuantas quedan sin ver. */
export async function fetchRing(client: TypedSupabaseClient): Promise<StoryRingEntry[]> {
  const { data, error } = await client.rpc("story_ring");
  if (error) throw error;

  return (data ?? []).map((row) => ({
    authorId: row.author_id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    isCouple: row.is_couple,
    total: row.total,
    unseen: row.unseen,
    latestAt: row.latest_at,
  }));
}

function liveStoriesQuery(client: TypedSupabaseClient, viewerId: string) {
  return client
    .from("stories")
    .select(STORY_SELECT)
    .eq("story_views.viewer_id", viewerId)
    .eq("story_reactions.user_id", viewerId)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: true });
}

/** Las historias vivas de una persona, de la mas antigua a la mas nueva. */
export async function fetchLiveStories(
  client: TypedSupabaseClient,
  authorId: string,
  viewerId: string,
): Promise<Story[]> {
  const { data, error } = await liveStoriesQuery(client, viewerId).eq("author_id", authorId);

  if (error) throw error;
  return toStories(client, (data ?? []) as unknown as StoryRow[], viewerId);
}

export async function fetchLiveStoriesByAuthor(
  client: TypedSupabaseClient,
  authorIds: string[],
  viewerId: string,
): Promise<Map<string, Story[]>> {
  const byAuthor = new Map<string, Story[]>(authorIds.map((id) => [id, []]));
  if (authorIds.length === 0) return byAuthor;

  const { data, error } = await liveStoriesQuery(client, viewerId).in("author_id", authorIds);
  if (error) throw error;

  const stories = await toStories(client, (data ?? []) as unknown as StoryRow[], viewerId);
  for (const story of stories) byAuthor.get(story.authorId)?.push(story);
  return byAuthor;
}

/**
 * El archivo: todo lo publicado, caducado o no.
 *
 * La politica ya decide que se puede traer —lo propio siempre, lo de pareja
 * siempre para los dos, lo de amistades solo mientras vive—, asi que esto no
 * filtra nada por su cuenta.
 */
export async function fetchArchive(
  client: TypedSupabaseClient,
  authorId: string,
  limit = 60,
): Promise<Story[]> {
  const { data, error } = await client
    .from("stories")
    .select(STORY_COLUMNS)
    .eq("author_id", authorId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return toStories(client, (data ?? []) as StoryRow[], authorId);
}

export async function publishStory(
  client: TypedSupabaseClient,
  userId: string,
  input: NewStory,
): Promise<Story> {
  const { data, error } = await client
    .from("stories")
    .insert({
      author_id: userId,
      couple_id: input.coupleId ?? null,
      media_path: input.mediaPath,
      caption: input.caption?.trim() || null,
      place_label: input.place?.label ?? null,
      lat: input.place?.lat ?? null,
      lon: input.place?.lon ?? null,
    })
    .select(STORY_COLUMNS)
    .single();

  if (error) throw error;
  const [story] = await toStories(client, [data as StoryRow], userId);
  return story;
}

export async function deleteStory(client: TypedSupabaseClient, id: string): Promise<void> {
  const { error } = await client.from("stories").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Deja constancia de que se vio. Silencioso: fallar aqui no rompe la vista.
 *
 * `ignoreDuplicates` y no un upsert normal, por dos razones que apuntan al
 * mismo sitio. La primera vez que la viste es la que cuenta, asi que volver a
 * abrirla no deberia mover `seen_at`. Y ademas un upsert de verdad es un
 * `on conflict do update`, que exige politica de update; `story_views` no la
 * tiene a proposito, y el intento moria con un 403 que nadie veia porque esto
 * se dispara y se olvida.
 */
export async function markSeen(client: TypedSupabaseClient, storyId: string, viewerId: string) {
  await client
    .from("story_views")
    .upsert(
      { story_id: storyId, viewer_id: viewerId },
      { onConflict: "story_id,viewer_id", ignoreDuplicates: true },
    );
}

export async function reactToStory(
  client: TypedSupabaseClient,
  storyId: string,
  userId: string,
  kind: ReactionType,
): Promise<void> {
  const { error } = await client
    .from("story_reactions")
    .upsert({ story_id: storyId, user_id: userId, kind }, { onConflict: "story_id,user_id" });

  if (error) throw error;
}

export async function clearStoryReaction(
  client: TypedSupabaseClient,
  storyId: string,
  userId: string,
): Promise<void> {
  const { error } = await client
    .from("story_reactions")
    .delete()
    .eq("story_id", storyId)
    .eq("user_id", userId);

  if (error) throw error;
}

export async function fetchStoryActivity(
  client: TypedSupabaseClient,
  storyId: string,
): Promise<StoryViewer[]> {
  const { data, error } = await client.rpc("story_activity", { p_story_id: storyId });
  if (error) throw error;

  return (data ?? []).map((row) => ({
    userId: row.user_id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    seenAt: row.seen_at,
    reaction: row.kind,
  }));
}

/** Cuanto le queda de vida, en horas, para el pie de la historia. */
export function hoursLeft(expiresAt: string, now: Date = new Date()): number {
  const ms = new Date(expiresAt).getTime() - now.getTime();
  return Math.max(0, Math.ceil(ms / 3_600_000));
}

export function firstUnseenIndex(stories: Pick<Story, "seen">[]): number {
  const index = stories.findIndex((story) => !story.seen);
  return index === -1 ? 0 : index;
}

export function storyQueue(
  ring: Pick<StoryRingEntry, "authorId">[],
  viewerId: string,
  startAuthorId: string,
): string[] {
  const order = [
    ...ring.filter((entry) => entry.authorId === viewerId),
    ...ring.filter((entry) => entry.authorId !== viewerId),
  ].map((entry) => entry.authorId);

  const start = order.indexOf(startAuthorId);
  return start === -1 ? [startAuthorId] : order.slice(start);
}
