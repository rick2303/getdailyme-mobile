import { describe, expect, it } from "vitest";

import { coupleStreak } from "@/lib/api/couple-answers";
import { COUPLE_PROMPTS, promptForDay, promptText } from "@/lib/couple/prompts";
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

describe("la pregunta del dia", () => {
  // Lo que sostiene el ritual: las dos personas tienen que ver la misma
  // pregunta sin hablarlo, y tiene que seguir siendo la misma al recargar.
  it("es la misma para una pareja y un dia", () => {
    const once = promptForDay(COUPLE, "2026-09-19");
    const again = promptForDay(COUPLE, "2026-09-19");
    expect(again.key).toBe(once.key);
  });

  it("cambia al dia siguiente", () => {
    const today = promptForDay(COUPLE, "2026-09-19");
    const tomorrow = promptForDay(COUPLE, "2026-09-20");
    expect(tomorrow.key).not.toBe(today.key);
  });

  it("no le toca a todo el mundo la misma", () => {
    const mine = promptForDay(COUPLE, "2026-09-19");
    const theirs = promptForDay(OTHER, "2026-09-19");
    expect(mine.key).not.toBe(theirs.key);
  });

  it("recorre el catalogo entero antes de repetir", () => {
    const seen = new Set<string>();
    let day = "2026-09-19";
    for (let index = 0; index < COUPLE_PROMPTS.length; index += 1) {
      seen.add(promptForDay(COUPLE, day).key);
      day = shiftDateKey(day, 1);
    }
    expect(seen.size).toBe(COUPLE_PROMPTS.length);
  });

  // Una pareja que se emparejo antes del dia cero de la rotacion tiene fechas
  // por detras, y el modulo de un negativo es negativo en JavaScript.
  it("aguanta fechas anteriores al dia cero", () => {
    const old = promptForDay(COUPLE, "2020-01-01");
    expect(COUPLE_PROMPTS.some((prompt) => prompt.key === old.key)).toBe(true);
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
