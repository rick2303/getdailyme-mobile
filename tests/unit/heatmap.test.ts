import { describe, expect, it } from "vitest";

import {
  DAYS_PER_WEEK,
  HEATMAP_DAYS,
  heatmapColumns,
  monthMarkers,
} from "@/lib/activities/heatmap";
import { buildHeatmap } from "@/lib/activities/streaks";
import { dateKeyToDate } from "@/lib/utils/dates";

function cellsEndingOn(today: string) {
  return buildHeatmap(new Map(), today, HEATMAP_DAYS);
}

function leadingBlanksFor(today: string) {
  const mondayIndex = (dateKeyToDate(today).getUTCDay() + 6) % DAYS_PER_WEEK;
  return (mondayIndex + 1) % DAYS_PER_WEEK;
}

describe("heatmapColumns", () => {
  it("deja hoy en la fila de su día de la semana", () => {
    // 2026-08-05 es miércoles: fila 2 contando el lunes como 0.
    const today = "2026-08-05";
    const columns = heatmapColumns(cellsEndingOn(today), leadingBlanksFor(today));
    const last = columns[columns.length - 1];

    expect(last[2]?.date).toBe(today);
    expect(last.slice(3).every((cell) => cell === undefined || cell === null)).toBe(true);
  });

  it("solo pone huecos al principio", () => {
    const today = "2026-08-05";
    const columns = heatmapColumns(cellsEndingOn(today), leadingBlanksFor(today));
    const flat = columns.flat();
    const blanks = flat.filter((cell) => cell === null).length;

    expect(blanks).toBe(leadingBlanksFor(today));
    expect(columns[0].slice(0, blanks).every((cell) => cell === null)).toBe(true);
  });

  it("agrupa de siete en siete", () => {
    const columns = heatmapColumns(cellsEndingOn("2026-08-05"), 0);
    expect(columns[0]).toHaveLength(DAYS_PER_WEEK);
    expect(columns).toHaveLength(HEATMAP_DAYS / DAYS_PER_WEEK);
  });
});

describe("monthMarkers", () => {
  const today = "2026-08-05";
  const columns = heatmapColumns(cellsEndingOn(today), leadingBlanksFor(today));
  const markers = monthMarkers(columns);

  it("marca una columna por cada mes que entra", () => {
    const months = markers.filter(Boolean).map((date) => date!.slice(0, 7));

    expect(months).toEqual([...new Set(months)]);
    expect(months.length).toBeGreaterThanOrEqual(3);
  });

  it("no marca dos columnas seguidas ni casi seguidas", () => {
    const marked = markers.flatMap((date, index) => (date ? [index] : []));

    for (let index = 1; index < marked.length; index += 1) {
      expect(marked[index] - marked[index - 1]).toBeGreaterThanOrEqual(3);
    }
  });

  it("devuelve una etiqueta por columna", () => {
    expect(markers).toHaveLength(columns.length);
  });

  it("no marca las columnas que solo tienen huecos", () => {
    const onlyBlanks = monthMarkers([[null, null, null, null, null, null, null]]);
    expect(onlyBlanks).toEqual([null]);
  });
});
