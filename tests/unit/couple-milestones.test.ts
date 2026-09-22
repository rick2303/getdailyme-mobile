import { describe, expect, it } from "vitest";

import { nextMilestone } from "@/lib/couple/milestones";

describe("hitos de la pareja", () => {
  // El contador de dias juntos cuenta de forma inclusiva: el dia que empiezas
  // ya es el dia 1. Si el hito no restara ese uno, la tarjeta diria "faltan 0"
  // el dia 99 y el contador diria 100 al siguiente.
  it("el dia 100 cae 99 dias despues del aniversario", () => {
    const milestone = nextMilestone("2026-01-01", "2026-01-01");
    expect(milestone).toMatchObject({ kind: "days", value: 100, in: 99 });
    expect(milestone?.on).toBe("2026-04-10");
  });

  it("cuenta atras segun avanza", () => {
    expect(nextMilestone("2026-01-01", "2026-04-09")?.in).toBe(1);
    expect(nextMilestone("2026-01-01", "2026-04-10")?.in).toBe(0);
  });

  it("pasados los 100 dias, el siguiente es el primer ano", () => {
    const milestone = nextMilestone("2026-01-01", "2026-04-11");
    expect(milestone).toMatchObject({ kind: "years", value: 1 });
  });

  // Nada de D+200, D+300 y D+400: si salta un hito cada dos semanas deja de
  // ser un hito.
  it("no inventa hitos entre los 100 dias y el ano", () => {
    const milestone = nextMilestone("2026-01-01", "2026-07-01");
    expect(milestone?.kind).toBe("years");
  });

  it("despues del primer ano toca el segundo", () => {
    const milestone = nextMilestone("2025-01-01", "2026-06-01");
    expect(milestone).toMatchObject({ kind: "years", value: 2 });
  });

  it("una pareja recien hecha va primero a por los 100", () => {
    expect(nextMilestone("2026-09-19", "2026-09-19")?.value).toBe(100);
  });
});

