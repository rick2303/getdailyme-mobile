import type { TypedSupabaseClient } from "@/lib/supabase/types";

// Cartas con fecha de apertura.
//
// Lo que esta capa NO hace es decidir que se puede leer: eso lo resuelve la
// politica de la base, que no devuelve el texto de una carta ajena hasta su
// dia. Aqui llegan dos cosas separadas y asi se quedan:
//
//   - las cartas legibles: todas las tuyas y las de tu pareja ya abiertas;
//   - los sobres: las de tu pareja que aun estan cerradas, sin texto.

export type CoupleLetter = {
  id: string;
  authorId: string;
  title: string;
  body: string;
  opensOn: string;
  createdAt: string;
  readAt: string | null;
};

export type SealedLetter = {
  id: string;
  authorId: string;
  title: string;
  opensOn: string;
  createdAt: string;
};

export const LETTER_TITLE_MAX = 80;
export const LETTER_BODY_MAX = 4000;

const LETTER_SELECT = "id, author_id, title, body, opens_on, created_at, read_at";

type LetterRow = {
  id: string;
  author_id: string;
  title: string;
  body: string;
  opens_on: string;
  created_at: string;
  read_at: string | null;
};

function toLetter(row: LetterRow): CoupleLetter {
  return {
    id: row.id,
    authorId: row.author_id,
    title: row.title,
    body: row.body,
    opensOn: row.opens_on,
    createdAt: row.created_at,
    readAt: row.read_at,
  };
}

export async function fetchLetters(
  client: TypedSupabaseClient,
  coupleId: string,
): Promise<CoupleLetter[]> {
  const { data, error } = await client
    .from("couple_letters")
    .select(LETTER_SELECT)
    .eq("couple_id", coupleId)
    .order("opens_on", { ascending: false })
    .limit(200);

  if (error) throw error;
  return (data ?? []).map((row) => toLetter(row as LetterRow));
}

export async function fetchSealedLetters(client: TypedSupabaseClient): Promise<SealedLetter[]> {
  const { data, error } = await client.rpc("couple_sealed_letters");
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: row.id,
    authorId: row.author_id,
    title: row.title,
    opensOn: row.opens_on,
    createdAt: row.created_at,
  }));
}

export type LetterInput = { title: string; body: string; opensOn: string };

function clean(input: LetterInput) {
  return {
    title: input.title.trim().slice(0, LETTER_TITLE_MAX),
    body: input.body.trim().slice(0, LETTER_BODY_MAX),
    opens_on: input.opensOn,
  };
}

export async function writeLetter(
  client: TypedSupabaseClient,
  coupleId: string,
  userId: string,
  input: LetterInput,
): Promise<CoupleLetter> {
  const { data, error } = await client
    .from("couple_letters")
    .insert({ couple_id: coupleId, author_id: userId, ...clean(input) })
    .select(LETTER_SELECT)
    .single();

  if (error) throw error;
  return toLetter(data as LetterRow);
}

/** Solo mientras siga cerrada; abierta, la base ya no deja tocarla. */
export async function updateLetter(
  client: TypedSupabaseClient,
  letterId: string,
  input: LetterInput,
): Promise<void> {
  const { error } = await client.from("couple_letters").update(clean(input)).eq("id", letterId);
  if (error) throw error;
}

export async function deleteLetter(client: TypedSupabaseClient, letterId: string): Promise<void> {
  const { error } = await client.from("couple_letters").delete().eq("id", letterId);
  if (error) throw error;
}

export async function markLetterRead(
  client: TypedSupabaseClient,
  letterId: string,
): Promise<void> {
  const { error } = await client.rpc("mark_letter_read", { p_letter: letterId });
  if (error) throw error;
}

export type LetterShelves = {
  /** De tu pareja y ya abiertas: lo que se puede leer. Sin leer primero. */
  received: CoupleLetter[];
  /** Tuyas, todavia cerradas para tu pareja. La mas cercana primero. */
  waiting: CoupleLetter[];
  /** Tuyas que ya se abrieron. */
  delivered: CoupleLetter[];
};

export function shelveLetters(
  letters: CoupleLetter[],
  userId: string,
  today: string,
): LetterShelves {
  const received = letters
    .filter((letter) => letter.authorId !== userId && letter.opensOn <= today)
    .sort((a, b) => {
      if (Boolean(a.readAt) !== Boolean(b.readAt)) return a.readAt ? 1 : -1;
      return b.opensOn.localeCompare(a.opensOn);
    });

  const mine = letters.filter((letter) => letter.authorId === userId);
  const waiting = mine
    .filter((letter) => letter.opensOn > today)
    .sort((a, b) => a.opensOn.localeCompare(b.opensOn));
  const delivered = mine
    .filter((letter) => letter.opensOn <= today)
    .sort((a, b) => b.opensOn.localeCompare(a.opensOn));

  return { received, waiting, delivered };
}

/** Dias que faltan para abrirla, contando desde hoy. Cero es hoy. */
export function daysUntilOpen(opensOn: string, today: string): number {
  const open = Date.parse(`${opensOn}T00:00:00Z`);
  const now = Date.parse(`${today}T00:00:00Z`);
  if (Number.isNaN(open) || Number.isNaN(now)) return 0;
  return Math.max(0, Math.round((open - now) / 86_400_000));
}
