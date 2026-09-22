import { computeStreak } from "@/lib/activities/streaks";
import type { TypedSupabaseClient } from "@/lib/supabase/types";

// El ritual diario. Lo que esta capa NO hace es decidir si se revela o no: eso
// lo resuelve la politica de la base, que sencillamente no devuelve la fila
// ajena mientras falte la propia. Aqui se lee lo que llega y se cuenta.

export type CoupleAnswer = {
  id: string;
  userId: string;
  promptKey: string;
  text: string;
  /** Lo que quien responde creia que iba a contestar la otra persona. */
  guess: string | null;
  answeredOn: string;
  createdAt: string;
};

export type DailyRitual = {
  /** La respuesta propia de hoy, si ya se contesto. */
  mine: CoupleAnswer | null;
  /** La ajena. Nula tambien cuando existe pero todavia no toca verla. */
  theirs: CoupleAnswer | null;
  /**
   * Si la otra persona ya respondio, se vea o no su texto.
   *
   * Hace falta aparte porque `theirs` es nulo en los dos casos que importan
   * —no ha respondido, y ha respondido pero no toca verlo— y la pantalla tiene
   * que distinguirlos: en el segundo hay que decir "te toca".
   */
  theyAnswered: boolean;
};

/**
 * Un dia de gracia al mes, no cero.
 *
 * El plan lo avisaba como riesgo: una racha que se rompe al primer dia flojo
 * convierte la app en una obligacion, y lo que hace abandonar estas apps no es
 * la falta de funciones sino perderlo todo por un despiste. Uno, no dos: si
 * perdona demasiado deja de significar nada.
 */
export const COUPLE_MONTHLY_GRACE = 1;

const ANSWER_SELECT =
  "id, user_id, prompt_key, answer_text, guess_text, answered_on, created_at";

type AnswerRow = {
  id: string;
  user_id: string;
  prompt_key: string;
  answer_text: string;
  guess_text: string | null;
  answered_on: string;
  created_at: string;
};

function toAnswer(row: AnswerRow): CoupleAnswer {
  return {
    id: row.id,
    userId: row.user_id,
    promptKey: row.prompt_key,
    text: row.answer_text,
    guess: row.guess_text,
    answeredOn: row.answered_on,
    createdAt: row.created_at,
  };
}

/** Las dos respuestas de un dia, hasta donde deje verlas la politica. */
export async function fetchRitual(
  client: TypedSupabaseClient,
  coupleId: string,
  userId: string,
  dateKey: string,
): Promise<DailyRitual> {
  const { data, error } = await client
    .from("couple_answers")
    .select(ANSWER_SELECT)
    .eq("couple_id", coupleId)
    .eq("answered_on", dateKey);

  if (error) throw error;

  const answers = (data ?? []).map(toAnswer);
  const theirs = answers.find((answer) => answer.userId !== userId) ?? null;

  // Solo hay que preguntarlo cuando la fila ajena no vino: si vino, es que ya
  // esta destapada y la respuesta es obviamente que si.
  //
  // Y si la consulta falla no se propaga el error: esto es un anadido, no el
  // ritual. Sin ella se pierde el aviso de "te toca" y nada mas; tumbar la
  // tarjeta entera por no poder pintar un empujon seria cambiar un defecto
  // pequeno por uno grande. Cubre tambien la ventana en que la funcion todavia
  // no esta puesta en la base.
  let theyAnswered = Boolean(theirs);
  if (!theyAnswered) {
    const { data: answered } = await client.rpc("couple_partner_answered", {
      p_couple: coupleId,
      p_on: dateKey,
    });
    theyAnswered = Boolean(answered);
  }

  return {
    mine: answers.find((answer) => answer.userId === userId) ?? null,
    theirs,
    theyAnswered,
  };
}

export async function submitAnswer(
  client: TypedSupabaseClient,
  input: {
    coupleId: string;
    userId: string;
    promptKey: string;
    text: string;
    guess?: string;
    dateKey: string;
  },
): Promise<CoupleAnswer> {
  // Un upsert sobre la clave de "una por persona y dia": responder dos veces
  // el mismo dia corrige, no duplica ni revienta.
  const { data, error } = await client
    .from("couple_answers")
    .upsert(
      {
        couple_id: input.coupleId,
        user_id: input.userId,
        prompt_key: input.promptKey,
        answer_text: input.text.trim(),
        guess_text: input.guess?.trim() || null,
        answered_on: input.dateKey,
      },
      { onConflict: "couple_id,user_id,answered_on" },
    )
    .select(ANSWER_SELECT)
    .single();

  if (error) throw error;
  return toAnswer(data as AnswerRow);
}

/**
 * Los dias en que contestaron las dos personas, de lo reciente hacia atras.
 *
 * No hace falta comprobar que son dos personas distintas mirando quien es
 * quien: la politica solo deja ver la fila ajena de un dia en que la propia
 * existe, asi que dos filas el mismo dia ya significa que respondieron ambas.
 */
export async function fetchCompletedDays(
  client: TypedSupabaseClient,
  coupleId: string,
  since: string,
): Promise<string[]> {
  const { data, error } = await client
    .from("couple_answers")
    .select("answered_on, user_id")
    .eq("couple_id", coupleId)
    .gte("answered_on", since)
    .order("answered_on", { ascending: false });

  if (error) throw error;

  const byDay = new Map<string, Set<string>>();
  for (const row of data ?? []) {
    const day = row.answered_on as string;
    const people = byDay.get(day) ?? new Set<string>();
    people.add(row.user_id as string);
    byDay.set(day, people);
  }

  return Array.from(byDay.entries())
    .filter(([, people]) => people.size === 2)
    .map(([day]) => day);
}

/** Dias seguidos en que respondieron los dos, con su dia de gracia al mes. */
export function coupleStreak(completedDays: Iterable<string>, today: string): number {
  return computeStreak(completedDays, today, COUPLE_MONTHLY_GRACE).current;
}

/** Por que no se pudo salvar el dia, cuando no se puede. */
export type SaveOutcome =
  | "saved"
  | "already_done"
  | "already_saved"
  | "month_spent"
  | "too_old"
  | "future"
  | "no_couple"
  | "unauthenticated";

/**
 * Da un dia por cumplido para los dos.
 *
 * Existe porque una racha compartida que se rompe por culpa de una persona
 * concreta es una maquina de reproche: el que si respondio sabe perfectamente
 * quien fallo. Cualquiera de los dos puede taparlo, una vez al mes.
 */
export async function saveCoupleDay(
  client: TypedSupabaseClient,
  dateKey: string,
): Promise<SaveOutcome> {
  const { data, error } = await client.rpc("save_couple_day", { p_on: dateKey });
  if (error) throw error;
  return (data as SaveOutcome) ?? "unauthenticated";
}

export async function fetchSavedDays(
  client: TypedSupabaseClient,
  coupleId: string,
  since: string,
): Promise<string[]> {
  const { data, error } = await client
    .from("couple_streak_saves")
    .select("saved_on")
    .eq("couple_id", coupleId)
    .gte("saved_on", since);

  if (error) throw error;
  return (data ?? []).map((row) => row.saved_on as string);
}

/** Cuantos dias hacia atras se puede rescatar. El mismo numero que la funcion. */
export const SAVE_WINDOW_DAYS = 14;

/** Si ya se gasto el salvado del mes al que pertenece ese dia. */
export function monthAlreadySpent(savedDays: Iterable<string>, dateKey: string): boolean {
  const month = dateKey.slice(0, 7);
  return Array.from(savedDays).some((day) => day.slice(0, 7) === month);
}
