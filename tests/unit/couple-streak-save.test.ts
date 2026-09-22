import { describe, expect, it } from "vitest";

import { monthAlreadySpent, SAVE_WINDOW_DAYS } from "@/lib/api/couple-answers";
import { coupleStreak } from "@/lib/api/couple-answers";
import { shiftDateKey } from "@/lib/utils/dates";

describe("cupo mensual de salvados", () => {
  it("un dia salvado gasta el mes al que pertenece", () => {
    expect(monthAlreadySpent(["2026-09-03"], "2026-09-28")).toBe(true);
  });

  it("y no gasta los demas meses", () => {
    expect(monthAlreadySpent(["2026-09-03"], "2026-10-01")).toBe(false);
    expect(monthAlreadySpent(["2026-09-03"], "2026-08-31")).toBe(false);
  });

  it("sin salvados no hay nada gastado", () => {
    expect(monthAlreadySpent([], "2026-09-19")).toBe(false);
  });

  // Rescatar un despiste de anteayer tiene sentido; reconstruir un mes entero
  // hacia atras, no. El numero vive en la funcion de la base y aqui solo se
  // afirma para que nadie lo cambie en un sitio y no en el otro.
  it("la ventana son catorce dias", () => {
    expect(SAVE_WINDOW_DAYS).toBe(14);
  });
});

describe("un dia salvado cuenta como respondido", () => {
  const dias = (count: number, from = "2026-09-19") =>
    Array.from({ length: count }, (_, index) => shiftDateKey(from, -index));

  it("tapa el hueco y la racha sigue contando", () => {
    // Tres dias, un hueco el 16, y tres mas. Con el 16 salvado son siete
    // seguidos, no seis: el dia salvado SI se cuenta, al contrario que el de
    // gracia automatico, que solo puentea.
    const respondidos = [...dias(3), ...dias(3, "2026-09-15")];
    const conSalvado = [...respondidos, "2026-09-16"];
    expect(coupleStreak(conSalvado, "2026-09-19")).toBe(7);
  });

  it("sin salvarlo, la gracia lo puentea pero no lo regala", () => {
    const respondidos = [...dias(3), ...dias(3, "2026-09-15")];
    expect(coupleStreak(respondidos, "2026-09-19")).toBe(6);
  });
});
