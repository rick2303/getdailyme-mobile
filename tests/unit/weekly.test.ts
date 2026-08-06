import { describe, expect, it } from "vitest";

import {
  percentChange,
  startOfWeek,
  summarizeDayTotals,
  summarizeRange,
  summarizeWeek,
} from "@/lib/activities/weekly";
import type { ActivityLog } from "@/lib/api/types";

function makeLog(overrides: Partial<ActivityLog> & { id: string }): ActivityLog {
  return {
    activity_id: "agua",
    user_id: "user-1",
    amount: 1,
    note: null,
    photo_url: null,
    logged_at: `${overrides.local_date ?? "2026-07-28"}T10:00:00Z`,
    local_date: "2026-07-28",
    ...overrides,
  };
}

describe("startOfWeek", () => {
  it("retrocede al lunes desde un martes", () => {
    expect(startOfWeek("2026-07-28")).toBe("2026-07-27");
  });

  it("deja el lunes intacto", () => {
    expect(startOfWeek("2026-07-27")).toBe("2026-07-27");
  });

  it("trata el domingo como final de semana, no como principio", () => {
    expect(startOfWeek("2026-08-02")).toBe("2026-07-27");
  });
});

describe("summarizeWeek", () => {
  const logs: ActivityLog[] = [
    makeLog({ id: "1", local_date: "2026-07-27", amount: 2 }),
    makeLog({ id: "2", local_date: "2026-07-27", amount: 3 }),
    makeLog({ id: "3", local_date: "2026-07-28", amount: 1, activity_id: "gym" }),
    makeLog({ id: "4", local_date: "2026-07-26", amount: 9 }),
    makeLog({ id: "5", local_date: "2026-08-03", amount: 9 }),
  ];

  it("solo cuenta los siete días de la semana pedida", () => {
    const summary = summarizeWeek(logs, "2026-07-27");

    expect(summary.totalLogs).toBe(3);
    expect(summary.activeDays).toBe(2);
  });

  it("suma cantidades por actividad y las ordena", () => {
    const summary = summarizeWeek(logs, "2026-07-27");

    expect(summary.byActivity[0]).toEqual({ activityId: "agua", amount: 5, count: 2 });
    expect(summary.byActivity[1]).toEqual({ activityId: "gym", amount: 1, count: 1 });
  });

  it("señala el día con más registros", () => {
    expect(summarizeWeek(logs, "2026-07-27").bestDay).toEqual({
      date: "2026-07-27",
      count: 2,
    });
  });

  it("devuelve una semana vacía sin registros", () => {
    const summary = summarizeWeek([], "2026-07-27");

    expect(summary.totalLogs).toBe(0);
    expect(summary.bestDay).toBeNull();
    expect(summary.byActivity).toEqual([]);
    expect(summary.countsByDay).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });

  it("reparte los registros por día de la semana empezando en lunes", () => {
    expect(summarizeWeek(logs, "2026-07-27").countsByDay).toEqual([2, 1, 0, 0, 0, 0, 0]);
  });
});

describe("summarizeDayTotals", () => {
  const totals = [
    { activityId: "agua", date: "2026-07-27", amount: 5, count: 2 },
    { activityId: "gym", date: "2026-07-28", amount: 1, count: 1 },
    { activityId: "agua", date: "2026-07-29", amount: 12, count: 4 },
    { activityId: "agua", date: "2026-07-20", amount: 9, count: 3 },
  ];

  it("resume una semana ya agregada igual que los registros sueltos", () => {
    const summary = summarizeDayTotals(totals, "2026-07-27");

    expect(summary.totalLogs).toBe(7);
    expect(summary.activeDays).toBe(3);
    expect(summary.byActivity).toEqual([
      { activityId: "agua", amount: 17, count: 6 },
      { activityId: "gym", amount: 1, count: 1 },
    ]);
    expect(summary.bestDay).toEqual({ date: "2026-07-29", count: 4 });
  });

  it("puede resumir una semana anterior sin tocar los datos", () => {
    const summary = summarizeDayTotals(totals, "2026-07-20");

    expect(summary.totalLogs).toBe(3);
    expect(summary.bestDay).toEqual({ date: "2026-07-20", count: 3 });
  });

  it("ignora los días sin registros al elegir el mejor", () => {
    const summary = summarizeDayTotals(
      [{ activityId: "agua", date: "2026-07-27", amount: 0, count: 0 }],
      "2026-07-27",
    );

    expect(summary.bestDay).toBeNull();
    expect(summary.activeDays).toBe(0);
  });
});

describe("percentChange", () => {
  it("calcula subidas y bajadas", () => {
    expect(percentChange(15, 10)).toBe(50);
    expect(percentChange(5, 10)).toBe(-50);
  });

  it("no divide por cero", () => {
    expect(percentChange(5, 0)).toBeNull();
    expect(percentChange(0, 0)).toBe(0);
  });
});

describe("summarizeRange", () => {
  const totals = [
    { activityId: "agua", date: "2026-07-06", amount: 2, count: 2 },
    { activityId: "agua", date: "2026-07-13", amount: 3, count: 3 },
    { activityId: "gym", date: "2026-07-14", amount: 1, count: 1 },
    { activityId: "agua", date: "2026-06-30", amount: 9, count: 9 },
    { activityId: "agua", date: "2026-08-01", amount: 9, count: 9 },
  ];

  it("solo cuenta lo que cae dentro del rango", () => {
    const summary = summarizeRange(totals, "2026-07-01", "2026-07-31");

    expect(summary.totalLogs).toBe(6);
    expect(summary.activeDays).toBe(3);
  });

  it("agrega countsByDay por día de la semana, no por fecha", () => {
    const summary = summarizeRange(totals, "2026-07-01", "2026-07-31");

    // 6 y 13 de julio son lunes; el 14 es martes.
    expect(summary.countsByDay).toEqual([5, 1, 0, 0, 0, 0, 0]);
  });

  it("señala el mejor día por fecha concreta", () => {
    expect(summarizeRange(totals, "2026-07-01", "2026-07-31").bestDay).toEqual({
      date: "2026-07-13",
      count: 3,
    });
  });

  it("ordena las actividades por registros", () => {
    const summary = summarizeRange(totals, "2026-07-01", "2026-07-31");

    expect(summary.byActivity[0].activityId).toBe("agua");
    expect(summary.byActivity[0].count).toBe(5);
    expect(summary.byActivity[1]).toEqual({ activityId: "gym", amount: 1, count: 1 });
  });

  it("devuelve un rango vacío sin datos dentro", () => {
    const summary = summarizeRange(totals, "2026-01-01", "2026-01-31");

    expect(summary.totalLogs).toBe(0);
    expect(summary.bestDay).toBeNull();
    expect(summary.countsByDay).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });
});
