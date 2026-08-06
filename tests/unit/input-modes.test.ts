import { describe, expect, it } from "vitest";

import {
  defaultModeForUnit,
  elapsedToAmount,
  parseQuickValues,
  resolveQuickValues,
  stepperIncrement,
} from "@/lib/activities/input-modes";

describe("defaultModeForUnit", () => {
  it("elige duración para unidades de tiempo", () => {
    expect(defaultModeForUnit("minute")).toBe("duration");
    expect(defaultModeForUnit("hour")).toBe("duration");
  });

  it("elige cantidad para unidades acumulables", () => {
    expect(defaultModeForUnit("page")).toBe("amount");
    expect(defaultModeForUnit("km")).toBe("amount");
  });

  it("deja contador para el resto", () => {
    expect(defaultModeForUnit("glass")).toBe("counter");
  });
});

describe("resolveQuickValues", () => {
  it("respeta los valores guardados", () => {
    expect(resolveQuickValues([10, 20], "minute")).toEqual([10, 20]);
  });

  it("cae a los de la unidad cuando están vacíos", () => {
    expect(resolveQuickValues([], "minute")).toEqual([15, 30, 45, 60]);
  });

  it("descarta valores no positivos", () => {
    expect(resolveQuickValues([0, -3, 5], "count")).toEqual([5]);
  });

  it("recorta a un máximo de seis", () => {
    expect(resolveQuickValues([1, 2, 3, 4, 5, 6, 7, 8], "count")).toHaveLength(6);
  });
});

describe("parseQuickValues", () => {
  it("acepta comas y espacios", () => {
    expect(parseQuickValues("15, 30 45")).toEqual([15, 30, 45]);
  });

  it("ignora lo que no sea entero positivo", () => {
    expect(parseQuickValues("15, abc, -2, 0, 2.5, 30")).toEqual([15, 30]);
  });
});

describe("elapsedToAmount", () => {
  it("convierte minutos a horas redondeando", () => {
    expect(elapsedToAmount(90, "hour")).toBe(2);
    expect(elapsedToAmount(30, "hour")).toBe(1);
  });

  it("deja los minutos tal cual", () => {
    expect(elapsedToAmount(45, "minute")).toBe(45);
  });

  it("nunca registra cero", () => {
    expect(elapsedToAmount(0, "minute")).toBe(1);
  });
});

describe("stepperIncrement", () => {
  it("usa el paso de la actividad en modo contador", () => {
    expect(stepperIncrement("glass", "counter", 3)).toBe(3);
  });

  it("salta de cinco en cinco en minutos", () => {
    expect(stepperIncrement("minute", "duration", 1)).toBe(5);
  });

  it("salta de 500 en pasos", () => {
    expect(stepperIncrement("step", "amount", 1)).toBe(500);
  });
});
