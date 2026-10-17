import type { TypedSupabaseClient } from "@/lib/supabase/types";

// Los premios de la semana del circulo. El calculo vive en `circle_awards`, que
// cuenta solo lo que quien pregunta puede ver y devuelve solo totales. Aqui se
// junta con los perfiles y se decide que semana toca ensenar.

export const AWARD_KINDS = [
  "consistent",
  "early_bird",
  "photographer",
  "comeback",
  "cheerleader",
  "unstoppable",
] as const;

export type AwardKind = (typeof AWARD_KINDS)[number];

export type AwardPerson = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

export type Award = {
  kind: AwardKind;
  value: number;
  winner: AwardPerson;
};

export type WeekStanding = {
  rank: number;
  days: number;
  person: AwardPerson;
};

export type CircleAwards = {
  weekStart: string;
  awards: Award[];
  /** Dias activos de cada quien, de mas a menos. Es el podio. */
  standings: WeekStanding[];
};

function isAwardKind(value: string): value is AwardKind {
  return (AWARD_KINDS as readonly string[]).includes(value);
}

export async function fetchCircleAwards(
  client: TypedSupabaseClient,
  weekStart: string,
): Promise<CircleAwards> {
  const { data, error } = await client.rpc("circle_awards", { p_week_start: weekStart });
  if (error) throw error;

  const rows = data ?? [];
  const ids = Array.from(new Set(rows.map((row) => row.user_id)));

  const people = new Map<string, AwardPerson>();
  if (ids.length > 0) {
    const { data: profiles, error: profileError } = await client
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .in("id", ids);
    if (profileError) throw profileError;
    for (const profile of profiles ?? []) {
      people.set(profile.id, {
        id: profile.id,
        username: profile.username,
        displayName: profile.display_name,
        avatarUrl: profile.avatar_url,
      });
    }
  }

  const awards: Award[] = [];
  const standings: WeekStanding[] = [];

  for (const row of rows) {
    const person = people.get(row.user_id);
    if (!person) continue;
    if (row.award === "days") {
      standings.push({ rank: row.rank, days: row.value, person });
    } else if (isAwardKind(row.award)) {
      awards.push({ kind: row.award, value: row.value, winner: person });
    }
  }

  awards.sort((a, b) => AWARD_KINDS.indexOf(a.kind) - AWARD_KINDS.indexOf(b.kind));
  standings.sort((a, b) => a.rank - b.rank);

  return { weekStart, awards, standings };
}

/**
 * La semana que toca ensenar. El domingo, la que se esta acabando: es el dia
 * de los premios. De lunes a sabado, la ultima completa.
 *
 * Las semanas empiezan en lunes, como en el resto de la app.
 */
export function awardsWeekStart(today: string): string {
  const date = new Date(`${today}T00:00:00Z`);
  const weekday = date.getUTCDay(); // 0 domingo
  const sinceMonday = (weekday + 6) % 7;
  date.setUTCDate(date.getUTCDate() - sinceMonday - (weekday === 0 ? 0 : 7));
  return date.toISOString().slice(0, 10);
}

export function isAwardsDay(today: string): boolean {
  return new Date(`${today}T00:00:00Z`).getUTCDay() === 0;
}
