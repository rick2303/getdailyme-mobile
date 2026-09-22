import { describe, expect, it } from "vitest";

import type { WidgetActivityPayload, WidgetPayload } from "@/lib/widget";
import {
  buildWidgetLog,
  bumpWidgetPayload,
  canLogFromWidget,
  parseWidgetLog,
  planWidgetDrain,
  toCreateLogVariables,
  type WidgetLogEntry,
} from "@/lib/widget-queue";

const agua: WidgetActivityPayload = {
  id: "a1",
  name: "Agua",
  color: "#3D7BE8",
  progress: 0.5,
  step: 1,
  amount: 4,
  target: 8,
  mode: "amount",
};

const meditar: WidgetActivityPayload = {
  id: "a2",
  name: "Meditar",
  color: "#2E9E5B",
  progress: 0,
  step: 1,
  amount: 0,
  target: null,
  mode: "check",
};

const payload: WidgetPayload = {
  done: 1,
  due: 3,
  streak: 5,
  brand: "#007EB6",
  complete: false,
  day: "2026-09-22",
  timeZone: "America/Tegucigalpa",
  userId: "u1",
  activities: [agua, meditar],
};

function entry(overrides: Partial<WidgetLogEntry> = {}): WidgetLogEntry {
  return {
    id: "l1",
    activity_id: "a1",
    user_id: "u1",
    amount: 1,
    logged_at: "2026-09-22T15:00:00.000Z",
    local_date: "2026-09-22",
    sent: false,
    ...overrides,
  };
}

describe("bumpWidgetPayload", () => {
  it("suma el paso y sube la barra", () => {
    const next = bumpWidgetPayload(payload, "a1", "2026-09-22");
    expect(next.activities[0]).toMatchObject({ amount: 5, progress: 5 / 8 });
    expect(next.done).toBe(1);
  });

  it("cuenta la meta cuando se alcanza", () => {
    const casi = { ...payload, activities: [{ ...agua, amount: 7 }, meditar] };
    const next = bumpWidgetPayload(casi, "a1", "2026-09-22");
    expect(next.activities[0]!.progress).toBe(1);
    expect(next.done).toBe(2);
  });

  it("no vuelve a contar una meta ya alcanzada", () => {
    const hecha = { ...payload, activities: [{ ...agua, amount: 8, progress: 1 }, meditar] };
    expect(bumpWidgetPayload(hecha, "a1", "2026-09-22").done).toBe(1);
  });

  it("una de marcar se cumple con un toque y ya no admite otro", () => {
    const next = bumpWidgetPayload(payload, "a2", "2026-09-22");
    expect(next.activities[1]).toMatchObject({ amount: 1, progress: 1 });
    expect(next.done).toBe(2);
    expect(canLogFromWidget(next.activities[1]!)).toBe(false);
    expect(bumpWidgetPayload(next, "a2", "2026-09-22")).toEqual(next);
  });

  it("marca el dia completo con la ultima meta", () => {
    const ultima = { ...payload, done: 2, activities: [{ ...agua, amount: 7 }, meditar] };
    expect(bumpWidgetPayload(ultima, "a1", "2026-09-22").complete).toBe(true);
  });

  it("empieza de cero si el widget se quedo en ayer", () => {
    const next = bumpWidgetPayload(payload, "a1", "2026-09-23");
    expect(next.day).toBe("2026-09-23");
    expect(next.activities[0]).toMatchObject({ amount: 1, progress: 1 / 8 });
    expect(next.done).toBe(0);
  });

  it("ignora una actividad que no esta en el widget", () => {
    expect(bumpWidgetPayload(payload, "otra", "2026-09-22")).toBe(payload);
  });
});

describe("buildWidgetLog", () => {
  it("fecha el registro en el huso de la persona", () => {
    const log = buildWidgetLog({
      id: "l9",
      activity: agua,
      userId: "u1",
      timeZone: "America/Tegucigalpa",
      now: new Date("2026-09-23T03:00:00.000Z"),
    });
    expect(log).toEqual({
      id: "l9",
      activity_id: "a1",
      user_id: "u1",
      amount: 1,
      logged_at: "2026-09-23T03:00:00.000Z",
      local_date: "2026-09-22",
      sent: false,
    });
  });

  it("viaja a la cola offline con el mismo id", () => {
    expect(toCreateLogVariables(entry())).toMatchObject({ id: "l1", note: null, photo_url: null });
  });
});

describe("parseWidgetLog", () => {
  it("lee lo que escribe el widget de iOS", () => {
    expect(parseWidgetLog(JSON.stringify(entry({ sent: true })))).toEqual(entry({ sent: true }));
  });

  it("descarta basura sin romper", () => {
    expect(parseWidgetLog("{")).toBeNull();
    expect(parseWidgetLog(JSON.stringify({ id: "x" }))).toBeNull();
  });
});

describe("planWidgetDrain", () => {
  const base = { userId: "u1", knownIds: new Set<string>(), inFlightIds: new Set<string>() };

  it("manda lo pendiente y retira lo que ya envio el widget", () => {
    const plan = planWidgetDrain([entry(), entry({ id: "l2", sent: true })], base);
    expect(plan.toCreate.map((item) => item.id)).toEqual(["l1"]);
    expect(plan.toRemove).toEqual(["l2"]);
    expect(plan.settled).toBe(true);
  });

  it("no duplica lo que ya esta en vuelo", () => {
    const plan = planWidgetDrain([entry()], { ...base, inFlightIds: new Set(["l1"]) });
    expect(plan.toCreate).toEqual([]);
    expect(plan.toRemove).toEqual([]);
  });

  it("lo que ya aparece en la cache se confirma sin volver a pintarlo", () => {
    const plan = planWidgetDrain([entry()], { ...base, knownIds: new Set(["l1"]) });
    expect(plan.toCreate).toEqual([]);
    expect(plan.toConfirm.map((item) => item.id)).toEqual(["l1"]);
  });

  it("repetir el mismo registro no lo manda dos veces", () => {
    const plan = planWidgetDrain([entry(), entry()], base);
    expect(plan.toCreate).toHaveLength(1);
  });

  it("tira lo de otra cuenta y lo de actividades que ya no existen", () => {
    const plan = planWidgetDrain(
      [entry({ id: "l1", user_id: "otra" }), entry({ id: "l2", activity_id: "borrada" })],
      { ...base, activityIds: new Set(["a1"]) },
    );
    expect(plan.toCreate).toEqual([]);
    expect(plan.toRemove).toEqual(["l1", "l2"]);
    expect(plan.settled).toBe(false);
  });
});
