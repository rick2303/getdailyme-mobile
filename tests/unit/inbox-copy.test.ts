import { describe, expect, it } from "vitest";

import { en } from "@/i18n/dictionaries/en";
import { es } from "@/i18n/dictionaries/es";
import { translate } from "@/i18n/translate";
import { computeSharedStreak } from "@/lib/activities/streaks";
import type { InboxNotification } from "@/lib/api/notifications";
import { inboxCopy } from "@/lib/feed/inbox-copy";
import { shiftDateKey } from "@/lib/utils/dates";

const actor = { id: "a", username: "ana", display_name: "Ana", avatar_url: null };

function item(
  type: InboxNotification["type"],
  details: Record<string, unknown> | null = null,
  title: string | null = "Gimnasio",
) {
  return { type, details, actor, challenge: title === null ? null : { title } };
}

function spanish(source: ReturnType<typeof item>) {
  const copy = inboxCopy(source);
  return translate(es, "es", copy.key, copy.params);
}

function english(source: ReturnType<typeof item>) {
  const copy = inboxCopy(source);
  return translate(en, "en", copy.key, copy.params);
}

describe("textos de la bandeja para retos", () => {
  it("dice quien se unio y a que reto", () => {
    expect(spanish(item("challenge_joined"))).toBe("Ana se unió a tu reto «Gimnasio»");
    expect(english(item("challenge_joined"))).toBe("Ana joined your challenge “Gimnasio”");
  });

  it("avisa de que termina manana", () => {
    expect(spanish(item("challenge_ending"))).toBe("Tu reto «Gimnasio» termina mañana");
  });

  it("da el puesto cuando no se gano", () => {
    const source = item("challenge_finished", { rank: 2, members: 3, total: 4, target: 5 });
    expect(spanish(source)).toBe("Reto «Gimnasio» terminado: quedaste 2.º de 3");
    expect(english(source)).toBe("“Gimnasio” is over: you placed #2 of 3");
  });

  it("celebra el primer puesto", () => {
    const source = item("challenge_finished", { rank: 1, members: 3, total: 9, target: 5 });
    expect(spanish(source)).toBe("Reto «Gimnasio» terminado: ¡ganaste entre 3!");
  });

  it("en un reto de una sola persona no habla de puestos", () => {
    const source = item("challenge_finished", { rank: 1, members: 1, total: 4, target: 5 });
    expect(spanish(source)).toBe("Reto «Gimnasio» terminado: 4 de 5");
  });
});

describe("textos de la bandeja para la racha de amistad", () => {
  it("nombra a la amistad y los dias", () => {
    const source = item("friend_streak_risk", { streak_days: 12, others: 0 }, null);
    expect(spanish(source)).toBe("Tu racha con Ana (12 días) se rompe hoy si no registras");
    expect(english(source)).toBe("Your 12-day streak with Ana breaks today unless you log");
  });

  it("junta el resto en un y N mas", () => {
    const source = item("friend_streak_risk", { streak_days: 12, others: 2 }, null);
    expect(spanish(source)).toBe(
      "Tu racha con Ana (12 días) y 2 más se rompen hoy si no registras",
    );
  });

  it("los demas tipos siguen con su texto de siempre", () => {
    expect(spanish(item("friend_request", null, null))).toBe(
      "Ana te envió una solicitud de amistad",
    );
  });
});

describe("la racha compartida que calcula la base", () => {
  const today = "2026-09-22";
  const ago = (days: number) => shiftDateKey(today, -days);

  it("no cuenta el dia que la otra persona solo registro en privado", () => {
    const mine = [1, 2, 3, 4].map(ago);
    const visibleTheirs = [1, 2, 3].map(ago);
    expect(computeSharedStreak(mine, visibleTheirs, today)).toBe(3);
  });

  it("desde el otro lado los dias propios cuentan todos", () => {
    const mine = [1, 2, 3, 4].map(ago);
    const visibleTheirs = [1, 2, 3, 4].map(ago);
    expect(computeSharedStreak(mine, visibleTheirs, today)).toBe(4);
  });

  it("un dia sin registro comun la rompe", () => {
    const mine = [1, 2, 3, 4].map(ago);
    const visibleTheirs = [1, 2, 3].map(ago);
    expect(computeSharedStreak(mine, visibleTheirs, shiftDateKey(today, 2))).toBe(0);
  });
});
