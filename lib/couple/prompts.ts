import type { Locale } from "@/i18n/config";

import { daysBetweenKeys } from "@/lib/utils/dates";

// El catalogo de preguntas vive aqui y no en la base, igual que las
// actividades de serie: asi se traduce con el resto de la interfaz, entra en
// el mismo repaso que cualquier otra cadena y no hace falta un panel de
// administracion para escribir una pregunta.
//
// La clave es lo que se guarda en `couple_answers.prompt_key`. Nunca se
// reaprovecha una clave para otra pregunta: el historial se quedaria con la
// respuesta de una y el enunciado de otra.

export type CouplePrompt = {
  key: string;
  text: Record<Locale, string>;
};

export const COUPLE_PROMPTS: readonly CouplePrompt[] = [
  {
    key: "today_high",
    text: {
      es: "¿Qué ha sido lo mejor de tu día?",
      en: "What was the best part of your day?",
    },
  },
  {
    key: "grateful_for_you",
    text: {
      es: "¿Qué me agradeces de esta semana?",
      en: "What are you grateful to me for this week?",
    },
  },
  {
    key: "first_impression",
    text: {
      es: "¿Qué pensaste de mí la primera vez que me viste?",
      en: "What did you think of me the first time you saw me?",
    },
  },
  {
    key: "small_thing",
    text: {
      es: "¿Qué cosa pequeña que hago te alegra el día?",
      en: "What small thing I do makes your day better?",
    },
  },
  {
    key: "next_trip",
    text: {
      es: "Si pudiéramos irnos mañana, ¿a dónde?",
      en: "If we could leave tomorrow, where would we go?",
    },
  },
  {
    key: "learned_recently",
    text: {
      es: "¿Qué has aprendido sobre ti últimamente?",
      en: "What have you learned about yourself lately?",
    },
  },
  {
    key: "laughed_last",
    text: {
      es: "¿Cuándo fue la última vez que te reíste de verdad?",
      en: "When did you last laugh for real?",
    },
  },
  {
    key: "need_more",
    text: {
      es: "¿De qué te gustaría que hiciéramos más?",
      en: "What would you like us to do more of?",
    },
  },
  {
    key: "proud_of_you",
    text: {
      es: "¿De qué estás orgulloso de ti esta semana?",
      en: "What are you proud of yourself for this week?",
    },
  },
  {
    key: "hard_day_help",
    text: {
      es: "En un día malo, ¿qué te ayuda de verdad?",
      en: "On a bad day, what actually helps you?",
    },
  },
  {
    key: "favourite_ordinary",
    text: {
      es: "¿Cuál es tu momento normal favorito conmigo?",
      en: "What's your favourite ordinary moment with me?",
    },
  },
  {
    key: "song_of_us",
    text: {
      es: "¿Qué canción te recuerda a nosotros?",
      en: "What song reminds you of us?",
    },
  },
  {
    key: "five_years",
    text: {
      es: "¿Dónde te gustaría que estuviéramos en cinco años?",
      en: "Where would you like us to be in five years?",
    },
  },
  {
    key: "never_told",
    text: {
      es: "¿Hay algo que nunca me hayas contado y quieras contarme?",
      en: "Is there something you've never told me and want to?",
    },
  },
  {
    key: "recharge",
    text: {
      es: "¿Qué te recarga cuando estás vacío?",
      en: "What recharges you when you're running on empty?",
    },
  },
  {
    key: "admire",
    text: {
      es: "¿Qué admiras de mí que crees que no sé?",
      en: "What do you admire about me that you think I don't know?",
    },
  },
  {
    key: "this_week_worry",
    text: {
      es: "¿Qué te preocupa ahora mismo?",
      en: "What's worrying you right now?",
    },
  },
  {
    key: "how_we_met_detail",
    text: {
      es: "¿Qué detalle de cómo nos conocimos no se te olvida?",
      en: "What detail of how we met has stayed with you?",
    },
  },
  {
    key: "perfect_saturday",
    text: {
      es: "Describe un sábado perfecto contigo y conmigo.",
      en: "Describe a perfect Saturday with the two of us.",
    },
  },
  {
    key: "ask_for_help",
    text: {
      es: "¿En qué te cuesta pedir ayuda?",
      en: "What's hard for you to ask for help with?",
    },
  },
  {
    key: "change_one_thing",
    text: {
      es: "Si pudieras cambiar una cosa de esta semana, ¿cuál?",
      en: "If you could change one thing about this week, what would it be?",
    },
  },
  {
    key: "makes_you_feel_loved",
    text: {
      es: "¿Qué te hace sentir querido?",
      en: "What makes you feel loved?",
    },
  },
  {
    key: "looking_forward",
    text: {
      es: "¿Qué es lo próximo que te hace ilusión?",
      en: "What's the next thing you're excited about?",
    },
  },
  {
    key: "tradition_to_start",
    text: {
      es: "¿Qué costumbre te gustaría que empezáramos?",
      en: "What tradition would you like us to start?",
    },
  },
  {
    key: "say_more_often",
    text: {
      es: "¿Qué te gustaría oírme decir más a menudo?",
      en: "What would you like to hear me say more often?",
    },
  },
  {
    key: "best_advice",
    text: {
      es: "¿Cuál es el mejor consejo que te han dado?",
      en: "What's the best advice you've been given?",
    },
  },
  {
    key: "quiet_together",
    text: {
      es: "¿Qué te gusta hacer conmigo sin hablar?",
      en: "What do you like doing with me without talking?",
    },
  },
  {
    key: "younger_you",
    text: {
      es: "¿Qué le dirías a quien eras hace diez años?",
      en: "What would you say to who you were ten years ago?",
    },
  },
] as const;

// El dia cero de la rotacion. Cualquier fecha fija sirve; esta es el dia en que
// se escribio el catalogo.
const ROTATION_EPOCH = "2026-09-19";

// Una suma sobre los caracteres del identificador de la pareja. No pretende ser
// un hash criptografico: lo unico que hace falta es que dos parejas distintas
// empiecen el catalogo por sitios distintos, para que la pregunta del dia no
// sea la misma para todo el mundo.
function seedFrom(coupleId: string): number {
  let seed = 0;
  for (let index = 0; index < coupleId.length; index += 1) {
    seed = (seed + coupleId.charCodeAt(index) * (index + 1)) % COUPLE_PROMPTS.length;
  }
  return seed;
}

/**
 * La pregunta de un dia para una pareja.
 *
 * Deterministica a proposito: las dos personas tienen que ver exactamente la
 * misma pregunta sin coordinarse, y quien abra la app dos veces el mismo dia
 * tiene que encontrarse la misma. Por eso sale de la fecha y del identificador
 * de la pareja, y no de un sorteo ni de una columna en la base.
 */
export function promptForDay(coupleId: string, dateKey: string): CouplePrompt {
  const elapsed = daysBetweenKeys(ROTATION_EPOCH, dateKey);
  const offset = seedFrom(coupleId);
  // El modulo de un negativo es negativo en JavaScript, y una fecha anterior al
  // dia cero lo es. La suma extra lo devuelve al rango.
  const index =
    (((elapsed + offset) % COUPLE_PROMPTS.length) + COUPLE_PROMPTS.length) % COUPLE_PROMPTS.length;
  return COUPLE_PROMPTS[index];
}

/** El enunciado traducido, o la clave si la pregunta ya no esta en el catalogo. */
export function promptText(key: string, locale: Locale): string | null {
  return COUPLE_PROMPTS.find((prompt) => prompt.key === key)?.text[locale] ?? null;
}
