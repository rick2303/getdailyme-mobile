import { COUPLE_DECKS, type CoupleDeck } from "@/lib/couple/prompts";
import type { TypedSupabaseClient } from "@/lib/supabase/types";

// La pareja: una fila, dos personas, y nada que se parezca a un historial.
// Romper borra la fila, asi que aqui no hay estados intermedios que atender.

export type CoupleMember = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

export type Couple = {
  id: string;
  startedOn: string;
  promptDecks: CoupleDeck[] | null;
  createdAt: string;
  partner: CoupleMember;
};

export type PairOutcome =
  | "paired"
  | "already_us"
  | "already_paired"
  | "partner_taken"
  | "self"
  | "invalid"
  | "blocked"
  | "unauthenticated";

export type PairResult = {
  outcome: PairOutcome;
  inviter: CoupleMember | null;
};

const MEMBER_SELECT = "id, username, display_name, avatar_url";

type ProfileRow = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
};

function toMember(row: ProfileRow): CoupleMember {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
  };
}

// La RLS ya deja ver solo la propia, asi que no hace falta filtrar por usuario:
// o hay una fila o no la hay. Se piden los dos perfiles y se descarta el propio,
// que es mas simple que adivinar en que columna cayo cada quien.
export async function fetchCouple(
  client: TypedSupabaseClient,
  userId: string,
): Promise<Couple | null> {
  const { data, error } = await client
    .from("couples")
    .select(
      `id, started_on, prompt_decks, created_at, requester_id, addressee_id,
       requester:profiles!couples_requester_id_fkey ( ${MEMBER_SELECT} ),
       addressee:profiles!couples_addressee_id_fkey ( ${MEMBER_SELECT} )`,
    )
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const requester = (Array.isArray(data.requester) ? data.requester[0] : data.requester) as
    | ProfileRow
    | null;
  const addressee = (Array.isArray(data.addressee) ? data.addressee[0] : data.addressee) as
    | ProfileRow
    | null;

  const partnerRow = data.requester_id === userId ? addressee : requester;
  if (!partnerRow) return null;

  return {
    id: data.id,
    startedOn: data.started_on,
    promptDecks: toDecks(data.prompt_decks),
    createdAt: data.created_at,
    partner: toMember(partnerRow),
  };
}

export async function redeemCoupleInvite(
  client: TypedSupabaseClient,
  token: string,
): Promise<PairResult> {
  const { data, error } = await client.rpc("redeem_couple_invite", { p_token: token });
  if (error) throw error;

  const row = (data ?? [])[0];
  if (!row) return { outcome: "invalid", inviter: null };

  return {
    outcome: row.outcome as PairOutcome,
    inviter: row.inviter_id
      ? {
          id: row.inviter_id,
          username: row.username ?? "",
          displayName: row.display_name ?? "",
          avatarUrl: row.avatar_url,
        }
      : null,
  };
}

/** Corregir el aniversario: la fecha por defecto es el dia en que os emparejasteis. */
export async function updateStartedOn(
  client: TypedSupabaseClient,
  coupleId: string,
  startedOn: string,
): Promise<void> {
  const { error } = await client
    .from("couples")
    .update({ started_on: startedOn })
    .eq("id", coupleId);
  if (error) throw error;
}

export async function updatePromptDecks(
  client: TypedSupabaseClient,
  coupleId: string,
  decks: CoupleDeck[] | null,
): Promise<void> {
  const { error } = await client
    .from("couples")
    .update({ prompt_decks: decks && decks.length > 0 ? decks : null })
    .eq("id", coupleId);
  if (error) throw error;
}

function toDecks(value: string[] | null): CoupleDeck[] | null {
  if (!value) return null;
  const known = value.filter((deck): deck is CoupleDeck =>
    (COUPLE_DECKS as readonly string[]).includes(deck),
  );
  return known.length > 0 ? known : null;
}

/**
 * Romper. Se lleva por delante la fila y, con ella, todo lo que cuelgue de la
 * pareja. La amistad no se toca: emparejarse la crea, romper no la deshace.
 */
export async function breakUp(client: TypedSupabaseClient, coupleId: string): Promise<void> {
  const { error } = await client.from("couples").delete().eq("id", coupleId);
  if (error) throw error;
}

/** Los dias juntos, contando el primero. */
export function daysTogether(startedOn: string, today: string): number {
  const start = Date.parse(`${startedOn}T00:00:00Z`);
  const now = Date.parse(`${today}T00:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(now)) return 0;
  return Math.max(0, Math.round((now - start) / 86_400_000) + 1);
}

/** El enlace de siempre, con el destino de pareja. */
export function coupleInviteUrl(origin: string, token: string): string {
  return `${origin}/invite/${token}?pareja=1`;
}
