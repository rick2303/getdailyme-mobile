import { describe, expect, it } from "vitest";

import {
  buildHeatmap,
  computeSharedStreak,
  computeStreak,
  freezesLeftThisMonth,
} from "@/lib/activities/streaks";

describe("computeStreak", () => {
  it("devuelve todo a cero sin fechas", () => {
    expect(computeStreak([], "2026-07-28")).toEqual({
      current: 0,
      longest: 0,
      lastDate: null,
      activeDays: 0,
      frozenDays: [],
    });
  });

  it("cuenta la racha en curso cuando hoy está registrado", () => {
    const summary = computeStreak(
      ["2026-07-26", "2026-07-27", "2026-07-28"],
      "2026-07-28",
    );

    expect(summary.current).toBe(3);
    expect(summary.longest).toBe(3);
    expect(summary.activeDays).toBe(3);
    expect(summary.lastDate).toBe("2026-07-28");
  });

  it("mantiene la racha viva si el último registro fue ayer", () => {
    expect(computeStreak(["2026-07-26", "2026-07-27"], "2026-07-28").current).toBe(2);
  });

  it("cubre con un comodín que el último registro fuera anteayer", () => {
    const summary = computeStreak(["2026-07-25", "2026-07-26"], "2026-07-28");
    expect(summary.current).toBe(2);
    expect(summary.frozenDays).toEqual(["2026-07-27"]);
  });

  it("recuerda la racha más larga aunque la actual sea menor", () => {
    const summary = computeStreak(
      ["2026-07-01", "2026-07-02", "2026-07-03", "2026-07-04", "2026-07-28"],
      "2026-07-28",
    );

    expect(summary.current).toBe(1);
    expect(summary.longest).toBe(4);
  });

  it("ignora fechas duplicadas", () => {
    const summary = computeStreak(
      ["2026-07-28", "2026-07-28", "2026-07-27"],
      "2026-07-28",
    );

    expect(summary.current).toBe(2);
    expect(summary.activeDays).toBe(2);
  });

  it("cruza el cambio de mes sin romperse", () => {
    expect(computeStreak(["2026-06-30", "2026-07-01"], "2026-07-01").current).toBe(2);
  });
});

describe("comodines de racha", () => {
  it("un día fallado no rompe la racha", () => {
    const summary = computeStreak(
      ["2026-07-24", "2026-07-25", "2026-07-26", "2026-07-28"],
      "2026-07-28",
    );
    expect(summary.current).toBe(4);
    expect(summary.frozenDays).toEqual(["2026-07-27"]);
  });

  it("el tercer fallo del mes sí la rompe", () => {
    const summary = computeStreak(
      ["2026-07-20", "2026-07-22", "2026-07-24", "2026-07-26", "2026-07-28"],
      "2026-07-28",
    );
    expect(summary.current).toBe(3);
    expect(freezesLeftThisMonth(summary, "2026-07-28")).toBe(0);
  });

  it("los comodines se renuevan al cambiar de mes", () => {
    // Dos huecos, uno en junio y otro en julio: cada mes gasta del suyo, así que
    // en julio todavía queda uno.
    const summary = computeStreak(
      ["2026-06-28", "2026-06-30", "2026-07-02", "2026-07-03", "2026-07-04"],
      "2026-07-04",
    );
    expect(summary.current).toBe(5);
    expect(summary.frozenDays).toEqual(["2026-07-01", "2026-06-29"]);
    expect(freezesLeftThisMonth(summary, "2026-07-04")).toBe(1);
  });

  it("no gasta comodín por el día de hoy, que aún no ha terminado", () => {
    const summary = computeStreak(["2026-07-26", "2026-07-27"], "2026-07-28");
    expect(summary.current).toBe(2);
    expect(freezesLeftThisMonth(summary, "2026-07-28")).toBe(2);
  });

  it("una ausencia larga sigue dejando la racha a cero", () => {
    const summary = computeStreak(["2026-07-01", "2026-07-02"], "2026-07-28");
    expect(summary.current).toBe(0);
    expect(summary.frozenDays).toEqual([]);
  });

  it("no inventa racha antes del primer registro", () => {
    const summary = computeStreak(["2026-07-28"], "2026-07-28");
    expect(summary.current).toBe(1);
    expect(summary.frozenDays).toEqual([]);
  });
});

describe("computeSharedStreak", () => {
  it("cuenta solo los días en que registraron ambos", () => {
    expect(
      computeSharedStreak(
        ["2026-07-26", "2026-07-27", "2026-07-28"],
        ["2026-07-27", "2026-07-28"],
        "2026-07-28",
      ),
    ).toBe(2);
  });

  it("tolera que el último día común sea ayer", () => {
    expect(
      computeSharedStreak(["2026-07-26", "2026-07-27"], ["2026-07-27"], "2026-07-28"),
    ).toBe(1);
  });

  it("se rompe si uno de los dos falló un día", () => {
    expect(
      computeSharedStreak(
        ["2026-07-26", "2026-07-27", "2026-07-28"],
        ["2026-07-26", "2026-07-28"],
        "2026-07-28",
      ),
    ).toBe(1);
  });

  it("es cero sin días en común recientes", () => {
    expect(computeSharedStreak(["2026-07-28"], ["2026-07-20"], "2026-07-28")).toBe(0);
  });
});

describe("buildHeatmap", () => {
  it("devuelve una celda por día terminando en hoy", () => {
    const cells = buildHeatmap(new Map([["2026-07-28", 4]]), "2026-07-28", 3);

    expect(cells).toHaveLength(3);
    expect(cells[0].date).toBe("2026-07-26");
    expect(cells[2]).toEqual({ date: "2026-07-28", total: 4 });
  });

  it("rellena con cero los días sin registros", () => {
    const cells = buildHeatmap(new Map(), "2026-07-28", 2);
    expect(cells.every((cell) => cell.total === 0)).toBe(true);
  });
});
