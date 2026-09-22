import { describe, expect, it } from "vitest";

import { coupleStreak } from "@/lib/api/couple-answers";
import {
  COUPLE_DECKS,
  COUPLE_PROMPTS,
  customPromptKey,
  isCustomPromptKey,
  pickPrompt,
  promptPool,
  promptText,
  type CoupleDeck,
  type PromptState,
} from "@/lib/couple/prompts";
import { shiftDateKey } from "@/lib/utils/dates";

const COUPLE = "8f14e45f-ceea-467a-9575-7a8b9c0d1e2f";
const OTHER = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";

describe("catalogo de preguntas", () => {
  it("no repite claves, que son lo que se guarda en la base", () => {
    const keys = COUPLE_PROMPTS.map((prompt) => prompt.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("tiene las dos lenguas en todas", () => {
    for (const prompt of COUPLE_PROMPTS) {
      expect(prompt.text.es.trim().length).toBeGreaterThan(0);
      expect(prompt.text.en.trim().length).toBeGreaterThan(0);
    }
  });

  it("no lleva emojis: la regla de la casa no tiene excepciones", () => {
    const emoji = /\p{Extended_Pictographic}/u;
    for (const prompt of COUPLE_PROMPTS) {
      expect(emoji.test(prompt.text.es)).toBe(false);
      expect(emoji.test(prompt.text.en)).toBe(false);
    }
  });
});

const FRESH: PromptState = { todayKey: null, used: {}, custom: null, pendingFromPartner: 0 };

function playDays(coupleId: string, from: string, count: number, decks: CoupleDeck[] | null = null) {
  const used: Record<string, number> = {};
  const keys: string[] = [];
  let day = from;
  for (let index = 0; index < count; index += 1) {
    const prompt = pickPrompt(coupleId, day, { ...FRESH, used }, decks);
    keys.push(prompt.key);
    used[prompt.key] = (used[prompt.key] ?? 0) + 1;
    day = shiftDateKey(day, 1);
  }
  return keys;
}

describe("la pregunta del dia", () => {
  it("es la misma para una pareja y un dia", () => {
    const once = pickPrompt(COUPLE, "2026-09-19", FRESH, null);
    const again = pickPrompt(COUPLE, "2026-09-19", FRESH, null);
    expect(again.key).toBe(once.key);
  });

  it("no le toca a todo el mundo la misma", () => {
    const mine = pickPrompt(COUPLE, "2026-09-19", FRESH, null);
    const theirs = pickPrompt(OTHER, "2026-09-19", FRESH, null);
    expect(mine.key).not.toBe(theirs.key);
  });

  it("no repite ninguna hasta haber pasado por todo el catalogo", () => {
    const keys = playDays(COUPLE, "2026-09-19", COUPLE_PROMPTS.length);
    expect(new Set(keys).size).toBe(COUPLE_PROMPTS.length);
  });

  it("con temas elegidos solo saca de esos temas, y tampoco repite", () => {
    const decks: CoupleDeck[] = ["fun", "know"];
    const size = promptPool(decks).length;
    const keys = playDays(COUPLE, "2026-09-19", size, decks);
    expect(new Set(keys).size).toBe(size);
    for (const key of keys) {
      expect(decks).toContain(COUPLE_PROMPTS.find((prompt) => prompt.key === key)?.deck);
    }
  });

  it("la que ya se esta respondiendo hoy manda aunque cambien los temas", () => {
    const started = COUPLE_PROMPTS.find((prompt) => prompt.deck === "deep")!;
    const prompt = pickPrompt(COUPLE, "2026-09-19", { ...FRESH, todayKey: started.key }, ["fun"]);
    expect(prompt.key).toBe(started.key);
  });

  it("la pregunta propia va por delante del catalogo", () => {
    const prompt = pickPrompt(
      COUPLE,
      "2026-09-19",
      { ...FRESH, custom: { id: "abc", body: "¿Bailamos?", authorId: "u1" } },
      null,
    );
    expect(prompt).toEqual({ kind: "custom", key: customPromptKey("abc"), authorId: "u1", body: "¿Bailamos?" });
    expect(isCustomPromptKey(prompt.key)).toBe(true);
  });

  it("aguanta fechas anteriores al dia cero", () => {
    const old = pickPrompt(COUPLE, "2020-01-01", FRESH, null);
    expect(COUPLE_PROMPTS.some((prompt) => prompt.key === old.key)).toBe(true);
  });

  it("todos los temas tienen preguntas", () => {
    for (const deck of COUPLE_DECKS) {
      expect(COUPLE_PROMPTS.filter((prompt) => prompt.deck === deck).length).toBeGreaterThanOrEqual(8);
    }
  });
});

describe("enunciado por clave", () => {
  it("traduce una clave viva", () => {
    expect(promptText(COUPLE_PROMPTS[0].key, "es")).toBe(COUPLE_PROMPTS[0].text.es);
  });

  it("devuelve nulo si la pregunta ya no esta", () => {
    expect(promptText("una_que_se_retiro", "es")).toBeNull();
  });
});

describe("racha de la pareja", () => {
  const days = (count: number, from = "2026-09-19") =>
    Array.from({ length: count }, (_, index) => shiftDateKey(from, -index));

  it("cuenta los dias seguidos en que respondieron los dos", () => {
    expect(coupleStreak(days(5), "2026-09-19")).toBe(5);
  });

  it("hoy sin responder no la rompe: el dia no ha terminado", () => {
    expect(coupleStreak(days(4, "2026-09-18"), "2026-09-19")).toBe(4);
  });

  // El riesgo que el plan avisaba: si se rompe al primer despiste, la app pasa
  // a ser una obligacion.
  //
  // El dia perdonado PUENTEA el hueco pero no se cuenta: tres dias, un
  // despiste y otros tres siguen siendo seis, no siete. Perdonar no es regalar
  // un dia que nadie respondio.
  it("perdona un despiste al mes sin regalar el dia", () => {
    const withGap = [...days(3), ...days(3, "2026-09-15")];
    expect(coupleStreak(withGap, "2026-09-19")).toBe(6);
  });

  it("pero solo uno: el segundo hueco la corta", () => {
    const twoGaps = [...days(3), ...days(2, "2026-09-15"), ...days(2, "2026-09-12")];
    expect(coupleStreak(twoGaps, "2026-09-19")).toBe(5);
  });

  it("sin dias no hay racha", () => {
    expect(coupleStreak([], "2026-09-19")).toBe(0);
  });
});
