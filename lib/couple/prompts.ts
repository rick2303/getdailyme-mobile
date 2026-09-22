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

export const COUPLE_DECKS = ["day", "us", "future", "know", "deep", "fun"] as const;

export type CoupleDeck = (typeof COUPLE_DECKS)[number];

export type CouplePrompt = {
  key: string;
  deck: CoupleDeck;
  text: Record<Locale, string>;
};

export const COUPLE_PROMPTS: readonly CouplePrompt[] = [
  {
    key: "today_high",
    deck: "day",
    text: {
      es: "¿Qué ha sido lo mejor de tu día?",
      en: "What was the best part of your day?",
    },
  },
  {
    key: "grateful_for_you",
    deck: "us",
    text: {
      es: "¿Qué me agradeces de esta semana?",
      en: "What are you grateful to me for this week?",
    },
  },
  {
    key: "first_impression",
    deck: "us",
    text: {
      es: "¿Qué pensaste de mí la primera vez que me viste?",
      en: "What did you think of me the first time you saw me?",
    },
  },
  {
    key: "small_thing",
    deck: "us",
    text: {
      es: "¿Qué cosa pequeña que hago te alegra el día?",
      en: "What small thing I do makes your day better?",
    },
  },
  {
    key: "next_trip",
    deck: "future",
    text: {
      es: "Si pudiéramos irnos mañana, ¿a dónde?",
      en: "If we could leave tomorrow, where would we go?",
    },
  },
  {
    key: "learned_recently",
    deck: "deep",
    text: {
      es: "¿Qué has aprendido sobre ti últimamente?",
      en: "What have you learned about yourself lately?",
    },
  },
  {
    key: "laughed_last",
    deck: "day",
    text: {
      es: "¿Cuándo fue la última vez que te reíste de verdad?",
      en: "When did you last laugh for real?",
    },
  },
  {
    key: "need_more",
    deck: "future",
    text: {
      es: "¿De qué te gustaría que hiciéramos más?",
      en: "What would you like us to do more of?",
    },
  },
  {
    key: "proud_of_you",
    deck: "day",
    text: {
      es: "¿De qué estás orgulloso de ti esta semana?",
      en: "What are you proud of yourself for this week?",
    },
  },
  {
    key: "hard_day_help",
    deck: "deep",
    text: {
      es: "En un día malo, ¿qué te ayuda de verdad?",
      en: "On a bad day, what actually helps you?",
    },
  },
  {
    key: "favourite_ordinary",
    deck: "us",
    text: {
      es: "¿Cuál es tu momento normal favorito conmigo?",
      en: "What's your favourite ordinary moment with me?",
    },
  },
  {
    key: "song_of_us",
    deck: "us",
    text: {
      es: "¿Qué canción te recuerda a nosotros?",
      en: "What song reminds you of us?",
    },
  },
  {
    key: "five_years",
    deck: "future",
    text: {
      es: "¿Dónde te gustaría que estuviéramos en cinco años?",
      en: "Where would you like us to be in five years?",
    },
  },
  {
    key: "never_told",
    deck: "deep",
    text: {
      es: "¿Hay algo que nunca me hayas contado y quieras contarme?",
      en: "Is there something you've never told me and want to?",
    },
  },
  {
    key: "recharge",
    deck: "deep",
    text: {
      es: "¿Qué te recarga cuando estás vacío?",
      en: "What recharges you when you're running on empty?",
    },
  },
  {
    key: "admire",
    deck: "us",
    text: {
      es: "¿Qué admiras de mí que crees que no sé?",
      en: "What do you admire about me that you think I don't know?",
    },
  },
  {
    key: "this_week_worry",
    deck: "day",
    text: {
      es: "¿Qué te preocupa ahora mismo?",
      en: "What's worrying you right now?",
    },
  },
  {
    key: "how_we_met_detail",
    deck: "us",
    text: {
      es: "¿Qué detalle de cómo nos conocimos no se te olvida?",
      en: "What detail of how we met has stayed with you?",
    },
  },
  {
    key: "perfect_saturday",
    deck: "fun",
    text: {
      es: "Describe un sábado perfecto contigo y conmigo.",
      en: "Describe a perfect Saturday with the two of us.",
    },
  },
  {
    key: "ask_for_help",
    deck: "deep",
    text: {
      es: "¿En qué te cuesta pedir ayuda?",
      en: "What's hard for you to ask for help with?",
    },
  },
  {
    key: "change_one_thing",
    deck: "day",
    text: {
      es: "Si pudieras cambiar una cosa de esta semana, ¿cuál?",
      en: "If you could change one thing about this week, what would it be?",
    },
  },
  {
    key: "makes_you_feel_loved",
    deck: "deep",
    text: {
      es: "¿Qué te hace sentir querido?",
      en: "What makes you feel loved?",
    },
  },
  {
    key: "looking_forward",
    deck: "future",
    text: {
      es: "¿Qué es lo próximo que te hace ilusión?",
      en: "What's the next thing you're excited about?",
    },
  },
  {
    key: "tradition_to_start",
    deck: "future",
    text: {
      es: "¿Qué costumbre te gustaría que empezáramos?",
      en: "What tradition would you like us to start?",
    },
  },
  {
    key: "say_more_often",
    deck: "us",
    text: {
      es: "¿Qué te gustaría oírme decir más a menudo?",
      en: "What would you like to hear me say more often?",
    },
  },
  {
    key: "best_advice",
    deck: "deep",
    text: {
      es: "¿Cuál es el mejor consejo que te han dado?",
      en: "What's the best advice you've been given?",
    },
  },
  {
    key: "quiet_together",
    deck: "us",
    text: {
      es: "¿Qué te gusta hacer conmigo sin hablar?",
      en: "What do you like doing with me without talking?",
    },
  },
  {
    key: "younger_you",
    deck: "deep",
    text: {
      es: "¿Qué le dirías a quien eras hace diez años?",
      en: "What would you say to who you were ten years ago?",
    },
  },
  {
    key: "small_win",
    deck: "day",
    text: {
      es: "¿Qué pequeña victoria has tenido hoy?",
      en: "What small win did you have today?",
    },
  },
  {
    key: "today_hardest",
    deck: "day",
    text: {
      es: "¿Qué ha sido lo más difícil de hoy?",
      en: "What was the hardest part of today?",
    },
  },
  {
    key: "on_your_mind",
    deck: "day",
    text: {
      es: "¿Qué tienes en la cabeza ahora mismo?",
      en: "What's on your mind right now?",
    },
  },
  {
    key: "today_kindness",
    deck: "day",
    text: {
      es: "¿Alguien ha sido amable contigo hoy? ¿Quién?",
      en: "Was anyone kind to you today? Who?",
    },
  },
  {
    key: "energy_level",
    deck: "day",
    text: {
      es: "Del uno al diez, ¿cuánta energía te queda hoy, y por qué?",
      en: "From one to ten, how much energy do you have left today, and why?",
    },
  },
  {
    key: "tomorrow_plan",
    deck: "day",
    text: {
      es: "¿Qué es lo único que quieres conseguir mañana?",
      en: "What's the one thing you want to get done tomorrow?",
    },
  },
  {
    key: "today_noticed",
    deck: "day",
    text: {
      es: "¿Qué has visto hoy que te ha llamado la atención?",
      en: "What did you notice today that caught your eye?",
    },
  },
  {
    key: "need_tonight",
    deck: "day",
    text: {
      es: "¿Qué te vendría bien esta noche?",
      en: "What would do you good tonight?",
    },
  },
  {
    key: "week_word",
    deck: "day",
    text: {
      es: "Resume tu semana en una palabra.",
      en: "Sum up your week in one word.",
    },
  },
  {
    key: "today_gratitude",
    deck: "day",
    text: {
      es: "¿Qué tres cosas agradeces de hoy?",
      en: "What three things are you grateful for today?",
    },
  },
  {
    key: "first_date_memory",
    deck: "us",
    text: {
      es: "¿Qué recuerdas de nuestra primera cita?",
      en: "What do you remember about our first date?",
    },
  },
  {
    key: "knew_it",
    deck: "us",
    text: {
      es: "¿Cuándo supiste que esto iba en serio?",
      en: "When did you know this was serious?",
    },
  },
  {
    key: "favourite_photo",
    deck: "us",
    text: {
      es: "¿Cuál es tu foto favorita de los dos, y por qué?",
      en: "What's your favourite photo of us, and why?",
    },
  },
  {
    key: "best_trip_together",
    deck: "us",
    text: {
      es: "¿Cuál ha sido nuestro mejor viaje hasta ahora?",
      en: "What's been our best trip so far?",
    },
  },
  {
    key: "proud_of_us",
    deck: "us",
    text: {
      es: "¿De qué te sientes orgulloso de nosotros?",
      en: "What are you proud of us for?",
    },
  },
  {
    key: "inside_joke",
    deck: "us",
    text: {
      es: "¿Cuál es tu broma nuestra favorita?",
      en: "What's your favourite inside joke of ours?",
    },
  },
  {
    key: "hard_time_together",
    deck: "us",
    text: {
      es: "¿Qué momento difícil superamos juntos que te hizo sentirte más cerca?",
      en: "What hard time did we get through that brought you closer?",
    },
  },
  {
    key: "place_of_us",
    deck: "us",
    text: {
      es: "¿Qué sitio sientes que es nuestro?",
      en: "What place feels like ours?",
    },
  },
  {
    key: "changed_you",
    deck: "us",
    text: {
      es: "¿En qué te he cambiado para bien?",
      en: "How have I changed you for the better?",
    },
  },
  {
    key: "remember_forever",
    deck: "us",
    text: {
      es: "¿Qué momento nuestro quieres recordar siempre?",
      en: "Which moment of ours do you want to remember forever?",
    },
  },
  {
    key: "dream_home",
    deck: "future",
    text: {
      es: "¿Cómo sería nuestra casa ideal?",
      en: "What would our ideal home look like?",
    },
  },
  {
    key: "bucket_list",
    deck: "future",
    text: {
      es: "¿Qué quieres que hagamos juntos antes de que acabe el año?",
      en: "What do you want us to do together before the year is out?",
    },
  },
  {
    key: "learn_together",
    deck: "future",
    text: {
      es: "¿Qué te gustaría que aprendiéramos juntos?",
      en: "What would you like us to learn together?",
    },
  },
  {
    key: "old_us",
    deck: "future",
    text: {
      es: "¿Cómo te imaginas que seremos de mayores?",
      en: "How do you picture us when we're old?",
    },
  },
  {
    key: "next_adventure",
    deck: "future",
    text: {
      es: "¿Cuál debería ser nuestra próxima aventura?",
      en: "What should our next adventure be?",
    },
  },
  {
    key: "this_year_goal",
    deck: "future",
    text: {
      es: "¿Qué te gustaría que consiguiéramos este año?",
      en: "What would you like us to achieve this year?",
    },
  },
  {
    key: "live_anywhere",
    deck: "future",
    text: {
      es: "Si pudiéramos vivir un año en cualquier sitio, ¿dónde?",
      en: "If we could live anywhere for a year, where?",
    },
  },
  {
    key: "future_ritual",
    deck: "future",
    text: {
      es: "¿Qué costumbre te gustaría que tuviéramos dentro de diez años?",
      en: "What ritual would you like us to have ten years from now?",
    },
  },
  {
    key: "celebrate_next",
    deck: "future",
    text: {
      es: "¿Cómo te gustaría celebrar nuestro próximo aniversario?",
      en: "How would you like to celebrate our next anniversary?",
    },
  },
  {
    key: "save_for",
    deck: "future",
    text: {
      es: "Si ahorráramos juntos para algo, ¿para qué?",
      en: "If we saved up for something together, what would it be?",
    },
  },
  {
    key: "comfort_food",
    deck: "know",
    text: {
      es: "¿Cuál es tu comida de consuelo?",
      en: "What's your comfort food?",
    },
  },
  {
    key: "childhood_dream",
    deck: "know",
    text: {
      es: "¿Qué querías ser de pequeño?",
      en: "What did you want to be as a kid?",
    },
  },
  {
    key: "hidden_talent",
    deck: "know",
    text: {
      es: "¿Qué talento tienes que casi nadie conoce?",
      en: "What talent do you have that hardly anyone knows about?",
    },
  },
  {
    key: "biggest_fear",
    deck: "know",
    text: {
      es: "¿Cuál es tu mayor miedo?",
      en: "What's your biggest fear?",
    },
  },
  {
    key: "favourite_smell",
    deck: "know",
    text: {
      es: "¿Qué olor te trae un buen recuerdo?",
      en: "What smell brings back a good memory?",
    },
  },
  {
    key: "guilty_pleasure",
    deck: "know",
    text: {
      es: "¿Cuál es tu placer culpable?",
      en: "What's your guilty pleasure?",
    },
  },
  {
    key: "perfect_gift",
    deck: "know",
    text: {
      es: "¿Qué regalo te haría ilusión de verdad?",
      en: "What gift would genuinely make you happy?",
    },
  },
  {
    key: "extra_hour",
    deck: "know",
    text: {
      es: "Si el día tuviera una hora más solo para ti, ¿en qué la gastarías?",
      en: "If the day had one extra hour just for you, how would you spend it?",
    },
  },
  {
    key: "favourite_movie",
    deck: "know",
    text: {
      es: "¿Qué película podrías ver mil veces?",
      en: "What film could you watch a thousand times?",
    },
  },
  {
    key: "stress_sign",
    deck: "know",
    text: {
      es: "¿Cómo se te nota el estrés?",
      en: "How does stress show on you?",
    },
  },
  {
    key: "happy_place",
    deck: "know",
    text: {
      es: "¿Cuál es tu sitio feliz?",
      en: "What's your happy place?",
    },
  },
  {
    key: "pet_peeve",
    deck: "know",
    text: {
      es: "¿Qué manía ajena no soportas?",
      en: "What habit in other people drives you up the wall?",
    },
  },
  {
    key: "value_most",
    deck: "deep",
    text: {
      es: "¿Qué valoras más en una persona?",
      en: "What do you value most in a person?",
    },
  },
  {
    key: "regret_small",
    deck: "deep",
    text: {
      es: "¿Hay algo pequeño que te arrepientas de no haber hecho?",
      en: "Is there something small you regret not doing?",
    },
  },
  {
    key: "feel_safe",
    deck: "deep",
    text: {
      es: "¿Qué te hace sentir a salvo?",
      en: "What makes you feel safe?",
    },
  },
  {
    key: "childhood_lesson",
    deck: "deep",
    text: {
      es: "¿Qué aprendiste de pequeño que todavía te sirve?",
      en: "What did you learn as a kid that still helps you?",
    },
  },
  {
    key: "love_language",
    deck: "deep",
    text: {
      es: "¿Cómo te gusta que te demuestren cariño?",
      en: "How do you like to be shown love?",
    },
  },
  {
    key: "working_on",
    deck: "deep",
    text: {
      es: "¿Qué estás trabajando en ti ahora mismo?",
      en: "What are you working on in yourself right now?",
    },
  },
  {
    key: "hard_to_say",
    deck: "deep",
    text: {
      es: "¿Qué te cuesta decir en voz alta?",
      en: "What do you find hard to say out loud?",
    },
  },
  {
    key: "moment_changed",
    deck: "deep",
    text: {
      es: "¿Qué momento de tu vida te cambió?",
      en: "What moment in your life changed you?",
    },
  },
  {
    key: "support_better",
    deck: "deep",
    text: {
      es: "¿Cómo puedo apoyarte mejor ahora mismo?",
      en: "How can I support you better right now?",
    },
  },
  {
    key: "enough",
    deck: "deep",
    text: {
      es: "¿Qué significa para ti tener suficiente?",
      en: "What does having enough mean to you?",
    },
  },
  {
    key: "superpower",
    deck: "fun",
    text: {
      es: "Si tuvieras un superpoder solo un día, ¿cuál?",
      en: "If you had a superpower for just one day, which one?",
    },
  },
  {
    key: "desert_island",
    deck: "fun",
    text: {
      es: "Tres cosas para una isla desierta. Yo no cuento.",
      en: "Three things for a desert island. I don't count.",
    },
  },
  {
    key: "our_movie",
    deck: "fun",
    text: {
      es: "Si lo nuestro fuera una película, ¿cómo se llamaría?",
      en: "If our story were a film, what would it be called?",
    },
  },
  {
    key: "time_travel",
    deck: "fun",
    text: {
      es: "¿A qué época viajarías, y a qué?",
      en: "Which era would you travel to, and what for?",
    },
  },
  {
    key: "animal_me",
    deck: "fun",
    text: {
      es: "¿Qué animal sería yo, y por qué?",
      en: "What animal would I be, and why?",
    },
  },
  {
    key: "dinner_guest",
    deck: "fun",
    text: {
      es: "Cena con cualquier persona de la historia: ¿con quién?",
      en: "Dinner with anyone in history: who?",
    },
  },
  {
    key: "useless_skill",
    deck: "fun",
    text: {
      es: "¿Qué habilidad inútil te encantaría tener?",
      en: "What useless skill would you love to have?",
    },
  },
  {
    key: "lottery",
    deck: "fun",
    text: {
      es: "Nos toca la lotería: ¿qué es lo primero que hacemos?",
      en: "We win the lottery: what's the first thing we do?",
    },
  },
  {
    key: "worst_date_idea",
    deck: "fun",
    text: {
      es: "Inventa la peor cita posible.",
      en: "Invent the worst possible date.",
    },
  },
  {
    key: "theme_song",
    deck: "fun",
    text: {
      es: "¿Qué canción sonaría cada vez que entras en una habitación?",
      en: "What song would play every time you walk into a room?",
    },
  },
] as const;

// El dia cero de la rotacion. Cualquier fecha fija sirve; esta es el dia en que
// se escribio el catalogo.
const ROTATION_EPOCH = "2026-09-19";

const CUSTOM_PREFIX = "custom:";

function seedFrom(coupleId: string, size: number): number {
  let seed = 0;
  for (let index = 0; index < coupleId.length; index += 1) {
    seed = (seed + coupleId.charCodeAt(index) * (index + 1)) % size;
  }
  return seed;
}

export type PromptState = {
  todayKey: string | null;
  used: Record<string, number>;
  custom: { id: string; body: string; authorId: string } | null;
  pendingFromPartner: number;
};

export type DailyPrompt =
  | { kind: "catalog"; key: string; deck: CoupleDeck; text: Record<Locale, string> }
  | { kind: "custom"; key: string; authorId: string; body: string };

export function customPromptKey(id: string): string {
  return CUSTOM_PREFIX + id;
}

export function isCustomPromptKey(key: string): boolean {
  return key.startsWith(CUSTOM_PREFIX);
}

export function promptPool(decks: readonly CoupleDeck[] | null): readonly CouplePrompt[] {
  if (!decks || decks.length === 0) return COUPLE_PROMPTS;
  const pool = COUPLE_PROMPTS.filter((prompt) => decks.includes(prompt.deck));
  return pool.length > 0 ? pool : COUPLE_PROMPTS;
}

export function pickPrompt(
  coupleId: string,
  dateKey: string,
  state: PromptState,
  decks: readonly CoupleDeck[] | null,
): DailyPrompt {
  if (state.custom) {
    return {
      kind: "custom",
      key: customPromptKey(state.custom.id),
      authorId: state.custom.authorId,
      body: state.custom.body,
    };
  }

  const started = state.todayKey
    ? COUPLE_PROMPTS.find((prompt) => prompt.key === state.todayKey)
    : undefined;
  if (started) return { kind: "catalog", key: started.key, deck: started.deck, text: started.text };

  const pool = promptPool(decks);
  const size = pool.length;
  const elapsed = daysBetweenKeys(ROTATION_EPOCH, dateKey);
  const start = (((elapsed + seedFrom(coupleId, size)) % size) + size) % size;

  let chosen = pool[start];
  let fewest = Number.POSITIVE_INFINITY;
  for (let step = 0; step < size; step += 1) {
    const candidate = pool[(start + step) % size];
    const times = state.used[candidate.key] ?? 0;
    if (times < fewest) {
      fewest = times;
      chosen = candidate;
    }
  }

  return { kind: "catalog", key: chosen.key, deck: chosen.deck, text: chosen.text };
}

/** El enunciado traducido, o la clave si la pregunta ya no esta en el catalogo. */
export function promptText(key: string, locale: Locale): string | null {
  return COUPLE_PROMPTS.find((prompt) => prompt.key === key)?.text[locale] ?? null;
}
