import type { TypedSupabaseClient } from "@/lib/supabase/types";

export type RedeemOutcome =
  | "accepted"
  | "already_friends"
  | "self"
  | "invalid"
  | "blocked"
  | "unauthenticated";

export type RedeemResult = {
  outcome: RedeemOutcome;
  inviter: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  } | null;
};

export async function fetchInviteToken(client: TypedSupabaseClient): Promise<string> {
  const { data, error } = await client.rpc("current_invite");
  if (error) throw error;
  return data as string;
}

export async function rotateInviteToken(client: TypedSupabaseClient): Promise<string> {
  const { data, error } = await client.rpc("rotate_invite");
  if (error) throw error;
  return data as string;
}

export async function redeemInvite(
  client: TypedSupabaseClient,
  token: string,
): Promise<RedeemResult> {
  const { data, error } = await client.rpc("redeem_invite", { p_token: token });
  if (error) throw error;

  const row = (data ?? [])[0];
  if (!row) return { outcome: "invalid", inviter: null };

  return {
    outcome: row.outcome as RedeemOutcome,
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

export type InvitePreview = {
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

// Quien invita, sin necesidad de sesion. `redeem_invite` tambien responde a
// anonimos, pero devuelve outcome 'unauthenticated' y el invitador en null: dice
// que no has entrado, no de quien es el enlace.
export async function fetchInvitePreview(
  client: TypedSupabaseClient,
  token: string,
): Promise<InvitePreview | null> {
  const { data, error } = await client.rpc("invite_preview", { p_token: token });
  if (error) throw error;

  const row = (data ?? [])[0];
  if (!row) return null;

  return {
    username: row.username ?? "",
    displayName: row.display_name ?? "",
    avatarUrl: row.avatar_url,
  };
}

export function inviteUrl(origin: string, token: string): string {
  return `${origin}/invite/${token}`;
}
