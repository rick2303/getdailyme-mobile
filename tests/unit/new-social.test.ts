import { describe, expect, it } from "vitest";

import { en } from "@/i18n/dictionaries/en";
import { es } from "@/i18n/dictionaries/es";
import { translate } from "@/i18n/translate";
import { awardsWeekStart, isAwardsDay } from "@/lib/api/awards";
import { daysUntilOpen, shelveLetters, type CoupleLetter } from "@/lib/api/couple-letters";
import { tallyPings } from "@/lib/api/couple-presence";
import { sortWishes, type CoupleWish } from "@/lib/api/couple-wishes";
import { formatCountdown, momentPhase, MOMENT_WINDOW_MS } from "@/lib/moments/phase";
import type { InboxNotification } from "@/lib/api/notifications";
import { COUPLE_MOODS, isCoupleMood, isMoodFresh } from "@/lib/couple/moods";
import { inboxCopy } from "@/lib/feed/inbox-copy";

describe("semana de los premios", () => {
  it("el domingo ensena la semana que se acaba", () => {
    // 2026-10-18 es domingo
    expect(isAwardsDay("2026-10-18")).toBe(true);
    expect(awardsWeekStart("2026-10-18")).toBe("2026-10-12");
  });

  it("de lunes a sabado ensena la ultima semana completa", () => {
    expect(awardsWeekStart("2026-10-19")).toBe("2026-10-12");
    expect(awardsWeekStart("2026-10-17")).toBe("2026-10-05");
    expect(isAwardsDay("2026-10-17")).toBe(false);
  });
});

describe("fases del momento", () => {
  const round = { id: "r", localDate: "2026-10-17", firesAt: "2026-10-17T15:00:00.000Z" };

  it("sin ronda todavia, se espera", () => {
    expect(momentPhase(null, false).kind).toBe("waiting");
  });

  it("antes de la hora, se espera aunque la fila llegara", () => {
    expect(momentPhase(round, false, new Date("2026-10-17T14:59:00Z")).kind).toBe("waiting");
  });

  it("dentro del margen esta abierto y cuenta lo que queda", () => {
    const phase = momentPhase(round, false, new Date("2026-10-17T15:01:00Z"));
    expect(phase).toEqual({ kind: "open", remainingMs: MOMENT_WINDOW_MS - 60_000 });
  });

  it("pasado el margen es tarde, y publicado manda sobre todo", () => {
    expect(momentPhase(round, false, new Date("2026-10-17T15:30:00Z")).kind).toBe("late");
    expect(momentPhase(round, true, new Date("2026-10-17T15:01:00Z")).kind).toBe("posted");
  });

  it("la cuenta atras se lee como reloj", () => {
    expect(formatCountdown(247_000)).toBe("4:07");
    expect(formatCountdown(-5)).toBe("0:00");
  });
});

describe("cartas", () => {
  const letter = (patch: Partial<CoupleLetter>): CoupleLetter => ({
    id: Math.random().toString(36),
    authorId: "me",
    title: "t",
    body: "b",
    opensOn: "2026-10-17",
    createdAt: "2026-10-01T00:00:00Z",
    readAt: null,
    ...patch,
  });

  it("reparte las cartas entre recibidas, en espera y entregadas", () => {
    const shelves = shelveLetters(
      [
        letter({ id: "r1", authorId: "you", opensOn: "2026-10-10", readAt: "2026-10-10T10:00:00Z" }),
        letter({ id: "r2", authorId: "you", opensOn: "2026-10-01" }),
        letter({ id: "w1", opensOn: "2026-12-24" }),
        letter({ id: "w2", opensOn: "2026-11-01" }),
        letter({ id: "d1", opensOn: "2026-10-17" }),
      ],
      "me",
      "2026-10-17",
    );

    // Sin leer primero, aunque sea mas vieja.
    expect(shelves.received.map((item) => item.id)).toEqual(["r2", "r1"]);
    expect(shelves.waiting.map((item) => item.id)).toEqual(["w2", "w1"]);
    expect(shelves.delivered.map((item) => item.id)).toEqual(["d1"]);
  });

  it("cuenta los dias que faltan", () => {
    expect(daysUntilOpen("2026-10-18", "2026-10-17")).toBe(1);
    expect(daysUntilOpen("2026-10-17", "2026-10-17")).toBe(0);
    expect(daysUntilOpen("2026-10-01", "2026-10-17")).toBe(0);
  });
});

describe("pienso en ti y estado", () => {
  it("separa los toques recibidos de los mandados", () => {
    const tally = tallyPings(
      [
        { sender_id: "you", created_at: "2026-10-17T10:00:00Z" },
        { sender_id: "you", created_at: "2026-10-17T12:00:00Z" },
        { sender_id: "me", created_at: "2026-10-17T11:00:00Z" },
      ],
      "me",
    );
    expect(tally).toEqual({ received: 2, sent: 1, lastReceivedAt: "2026-10-17T12:00:00Z" });
  });

  it("un estado viejo deja de contar", () => {
    const now = new Date("2026-10-17T20:00:00Z");
    expect(isMoodFresh("2026-10-17T10:00:00Z", now)).toBe(true);
    expect(isMoodFresh("2026-10-16T19:00:00Z", now)).toBe(false);
    expect(isCoupleMood("tired")).toBe(true);
    expect(isCoupleMood("grumpy")).toBe(false);
  });

  it("cada estado tiene su palabra en los dos idiomas", () => {
    for (const mood of COUPLE_MOODS) {
      expect(translate(es, "es", `presence.mood.${mood}`)).not.toContain("presence.");
      expect(translate(en, "en", `presence.mood.${mood}`)).not.toContain("presence.");
    }
  });
});

describe("lista de cosas por hacer", () => {
  const wish = (patch: Partial<CoupleWish>): CoupleWish => ({
    id: "w",
    title: "t",
    note: null,
    createdBy: "me",
    createdAt: "2026-10-01T00:00:00Z",
    doneAt: null,
    doneBy: null,
    eventId: null,
    ...patch,
  });

  it("lo pendiente va arriba y lo hecho abajo", () => {
    const sorted = sortWishes([
      wish({ id: "done-old", doneAt: "2026-10-02T00:00:00Z", doneBy: "me" }),
      wish({ id: "pending-old", createdAt: "2026-09-01T00:00:00Z" }),
      wish({ id: "done-new", doneAt: "2026-10-10T00:00:00Z", doneBy: "you" }),
      wish({ id: "pending-new", createdAt: "2026-10-05T00:00:00Z" }),
    ]);
    expect(sorted.map((item) => item.id)).toEqual([
      "pending-new",
      "pending-old",
      "done-new",
      "done-old",
    ]);
  });
});

describe("bandeja de pareja", () => {
  const actor = { id: "a", username: "ana", display_name: "Ana", avatar_url: null };
  const item = (type: InboxNotification["type"], details: Record<string, unknown> | null) => ({
    type,
    details,
    actor,
    challenge: null,
  });
  const spanish = (source: ReturnType<typeof item>) => {
    const copy = inboxCopy(source);
    return translate(es, "es", copy.key, copy.params);
  };

  it("acumula los toques en una frase", () => {
    expect(spanish(item("couple_ping", { count: 1 }))).toBe("Ana pensó en ti");
    expect(spanish(item("couple_ping", { count: 3 }))).toBe("Ana pensó en ti 3 veces");
  });

  it("dice el estado con palabras, y aguanta uno desconocido", () => {
    expect(spanish(item("couple_mood", { mood: "tired" }))).toBe("Ana tiene sueño");
    expect(spanish(item("couple_mood", { mood: "nope" }))).toBe("Ana actualizó cómo está");
  });

  it("nombra la carta por su sobre", () => {
    expect(spanish(item("couple_letter", { title: "Para hoy" }))).toBe(
      "Ana te escribió una carta: «Para hoy»",
    );
    expect(spanish(item("couple_letter_open", { title: "Para hoy" }))).toBe(
      "Ya puedes abrir la carta de Ana: «Para hoy»",
    );
  });
});
