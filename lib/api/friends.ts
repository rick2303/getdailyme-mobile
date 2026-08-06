import type { TypedSupabaseClient } from "@/lib/supabase/types";

import type {
  FriendEdge,
  FriendshipStatus,
  Profile,
  ReceivedNudge,
  SearchResult,
} from "./types";

const PROFILE_COLUMNS = "id, username, display_name, avatar_url, timezone, locale, created_at";

const FRIENDSHIP_SELECT = `
  id, status, requester_id, addressee_id,
  requester:profiles!friendships_requester_id_fkey ( ${PROFILE_COLUMNS} ),
  addressee:profiles!friendships_addressee_id_fkey ( ${PROFILE_COLUMNS} )
`;

type RawFriendship = {
  id: string;
  status: FriendshipStatus;
  requester_id: string;
  addressee_id: string;
  requester: Profile | null;
  addressee: Profile | null;
};

function toEdge(row: RawFriendship, userId: string): FriendEdge | null {
  const outgoing = row.requester_id === userId;
  const profile = outgoing ? row.addressee : row.requester;
  if (!profile) return null;

  return {
    friendshipId: row.id,
    status: row.status,
    direction: outgoing ? "outgoing" : "incoming",
    profile,
  };
}

export async function fetchFriendEdges(
  client: TypedSupabaseClient,
  userId: string,
): Promise<FriendEdge[]> {
  const { data, error } = await client
    .from("friendships")
    .select(FRIENDSHIP_SELECT)
    .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return ((data ?? []) as unknown as RawFriendship[])
    .map((row) => toEdge(row, userId))
    .filter((edge): edge is FriendEdge => edge !== null);
}

export function selectAcceptedFriends(edges: FriendEdge[]): FriendEdge[] {
  return edges.filter((edge) => edge.status === "accepted");
}

export function selectIncomingRequests(edges: FriendEdge[]): FriendEdge[] {
  return edges.filter((edge) => edge.status === "pending" && edge.direction === "incoming");
}

export function selectOutgoingRequests(edges: FriendEdge[]): FriendEdge[] {
  return edges.filter((edge) => edge.status === "pending" && edge.direction === "outgoing");
}

// Solo los bloqueos puestos por mi: tras block_user quien bloquea queda como
// requester. Los que me pusieron a mi ni siquiera llegan con perfil (la
// visibilidad se corta en la base) y se filtran solos.
export function selectBlocked(edges: FriendEdge[]): FriendEdge[] {
  return edges.filter((edge) => edge.status === "blocked" && edge.direction === "outgoing");
}

export async function blockUser(client: TypedSupabaseClient, userId: string): Promise<void> {
  const { error } = await client.rpc("block_user", { p_user_id: userId });
  if (error) throw error;
}

export function normalizeUsernameQuery(query: string): string {
  return query.trim().replace(/^@+/, "").toLowerCase();
}

export async function searchProfiles(
  client: TypedSupabaseClient,
  query: string,
  userId: string,
  edges: FriendEdge[],
): Promise<SearchResult[]> {
  // Coincidencia exacta de usuario, nunca por nombre real: buscar por trozos
  // dejaba recorrer el directorio entero letra a letra. Quien no sabe el
  // usuario exacto tiene el enlace de invitacion, que es el camino previsto.
  const term = normalizeUsernameQuery(query);
  if (term.length === 0) return [];

  const { data, error } = await client.rpc("find_profile_by_username", {
    p_username: term,
  });

  if (error) throw error;

  const relationByProfile = new Map<string, SearchResult["relation"]>();
  for (const edge of edges) {
    if (edge.status === "accepted") relationByProfile.set(edge.profile.id, "accepted");
    else if (edge.status === "blocked") relationByProfile.set(edge.profile.id, "blocked");
    else if (edge.status === "pending")
      relationByProfile.set(
        edge.profile.id,
        edge.direction === "outgoing" ? "pending_out" : "pending_in",
      );
  }

  return ((data ?? []) as Profile[]).map((profile) => ({
    profile,
    relation: relationByProfile.get(profile.id) ?? "none",
  }));
}

export async function sendFriendRequest(
  client: TypedSupabaseClient,
  userId: string,
  addresseeId: string,
): Promise<void> {
  const { error } = await client
    .from("friendships")
    .insert({ requester_id: userId, addressee_id: addresseeId, status: "pending" });

  if (error && error.code !== "23505") throw error;
}

export async function respondToFriendRequest(
  client: TypedSupabaseClient,
  friendshipId: string,
  status: Extract<FriendshipStatus, "accepted" | "declined">,
): Promise<void> {
  const { error } = await client
    .from("friendships")
    .update({ status, responded_at: new Date().toISOString() })
    .eq("id", friendshipId);

  if (error) throw error;
}

export async function removeFriendship(
  client: TypedSupabaseClient,
  friendshipId: string,
): Promise<void> {
  const { error } = await client.from("friendships").delete().eq("id", friendshipId);
  if (error) throw error;
}

export type NudgeOutcome = { status: "sent"; nudgeId: string } | { status: "already_sent" };

export async function sendNudge(
  client: TypedSupabaseClient,
  userId: string,
  receiverId: string,
): Promise<NudgeOutcome> {
  const { data, error } = await client
    .from("nudges")
    .insert({ sender_id: userId, receiver_id: receiverId })
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") return { status: "already_sent" };
    throw error;
  }

  return data ? { status: "sent", nudgeId: data.id } : { status: "already_sent" };
}

export async function fetchNudgesSentToday(
  client: TypedSupabaseClient,
  userId: string,
  today: string,
): Promise<string[]> {
  const { data, error } = await client
    .from("nudges")
    .select("receiver_id")
    .eq("sender_id", userId)
    .eq("sent_on", today);

  if (error) throw error;
  return (data ?? []).map((row) => row.receiver_id);
}

const NUDGE_SELECT = `
  id, sent_on, created_at,
  sender:profiles!nudges_sender_id_fkey ( ${PROFILE_COLUMNS} )
`;

type RawNudge = {
  id: string;
  sent_on: string;
  created_at: string;
  // PostgREST devuelve un objeto, pero si el embed no resuelve llega ausente o
  // como lista. Se normaliza aqui para que la pantalla nunca reciba un sender
  // a medias.
  sender: Profile | Profile[] | null | undefined;
};

function firstProfile(value: RawNudge["sender"]): Profile | null {
  if (!value) return null;
  const profile = Array.isArray(value) ? value[0] : value;
  return profile && typeof profile.id === "string" ? profile : null;
}

export async function fetchUnreadNudges(
  client: TypedSupabaseClient,
  userId: string,
): Promise<ReceivedNudge[]> {
  const { data, error } = await client
    .from("nudges")
    .select(NUDGE_SELECT)
    .eq("receiver_id", userId)
    .is("read_at", null)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw error;

  return ((data ?? []) as unknown as RawNudge[])
    .map((row) => ({
      id: row.id,
      sentOn: row.sent_on,
      createdAt: row.created_at,
      sender: firstProfile(row.sender),
    }))
    .filter((nudge): nudge is ReceivedNudge => nudge.sender !== null);
}

export async function markNudgesRead(
  client: TypedSupabaseClient,
  nudgeIds: string[],
): Promise<void> {
  if (nudgeIds.length === 0) return;

  const { error } = await client
    .from("nudges")
    .update({ read_at: new Date().toISOString() })
    .in("id", nudgeIds);

  if (error) throw error;
}

// La caché de consultas se persiste con JSON.stringify, donde un Map se
// convierte en {} y pierde .get al recargar. Todo lo que devuelva un queryFn
// tiene que sobrevivir a un ida y vuelta por JSON.
export function countLogsByUser(rows: { user_id: string }[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    counts[row.user_id] = (counts[row.user_id] ?? 0) + 1;
  }
  return counts;
}

// Dias con al menos un registro visible del amigo: RLS ya filtra lo que no
// esta compartido, asi que la racha compartida solo cuenta lo que se puede ver.
export async function fetchFriendActiveDates(
  client: TypedSupabaseClient,
  friendId: string,
  sinceDate: string,
): Promise<string[]> {
  const { data, error } = await client
    .from("activity_logs")
    .select("local_date")
    .eq("user_id", friendId)
    .gte("local_date", sinceDate);

  if (error) throw error;
  return Array.from(new Set((data ?? []).map((row) => row.local_date)));
}

export async function fetchFriendsActivityToday(
  client: TypedSupabaseClient,
  friendIds: string[],
  sinceDate: string,
): Promise<Record<string, number>> {
  if (friendIds.length === 0) return {};

  const { data, error } = await client
    .from("activity_logs")
    .select("user_id")
    .in("user_id", friendIds)
    .gte("local_date", sinceDate);

  if (error) throw error;

  return countLogsByUser(data ?? []);
}
