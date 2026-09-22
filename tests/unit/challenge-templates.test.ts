import { describe, expect, it } from "vitest";

import type { Activity } from "@/lib/api/types";
import { resolveChallengeTemplates } from "@/lib/challenges/templates";

function activity(overrides: Partial<Activity>): Activity {
  return {
    id: overrides.name ?? "id",
    user_id: "u",
    name: "Agua",
    icon: "glass-water",
    color: "cyan",
    unit: "glass",
    step: 1,
    daily_target: 8,
    target_period: "day",
    reminder_at: null,
    position: 0,
    visibility: "friends",
    input_mode: "tap",
    quick_values: [],
    is_archived: false,
    ...overrides,
  } as Activity;
}

describe("resolveChallengeTemplates", () => {
  it("casa las actividades de serie en los dos idiomas y multiplica la meta diaria", () => {
    const resolved = resolveChallengeTemplates([
      activity({ id: "a", name: "Water" }),
      activity({ id: "b", name: "Ejercicio", icon: "dumbbell", unit: "minute", daily_target: 30 }),
      activity({ id: "c", name: "Lectura", icon: "book-open", unit: "page", daily_target: 20 }),
    ]);

    expect(resolved.map((item) => [item.key, item.activity.id, item.days, item.target])).toEqual([
      ["water", "a", 7, 56],
      ["exercise", "b", 7, 210],
      ["reading", "c", 30, 600],
    ]);
  });

  it("oculta la plantilla si no hay actividad o esta archivada", () => {
    const resolved = resolveChallengeTemplates([
      activity({ id: "a", is_archived: true }),
      activity({ id: "s", name: "Sueño", icon: "moon", unit: "hour" }),
    ]);

    expect(resolved).toEqual([]);
  });

  it("reconoce una actividad renombrada por su icono", () => {
    const [water] = resolveChallengeTemplates([activity({ id: "a", name: "Hidratación" })]);
    expect(water?.key).toBe("water");
  });

  it("reparte una meta semanal entre los dias", () => {
    const [water] = resolveChallengeTemplates([
      activity({ id: "a", daily_target: 14, target_period: "week" }),
    ]);
    expect(water?.target).toBe(14);
  });

  it("sin meta, usa la de serie solo si la unidad coincide", () => {
    expect(resolveChallengeTemplates([activity({ daily_target: null })])[0]?.target).toBe(56);
    expect(resolveChallengeTemplates([activity({ daily_target: null, unit: "liter" })])).toEqual([]);
  });

  it("incluye meditar cuando la persona la eligio en la bienvenida", () => {
    const [meditate] = resolveChallengeTemplates([
      activity({ id: "m", name: "Meditate", icon: "brain", unit: "minute", daily_target: 10 }),
    ]);
    expect([meditate?.key, meditate?.target]).toEqual(["meditate", 140]);
  });
});
