import { describe, expect, it } from "vitest";

import {
  daysBetweenKeys,
  isoToZonedDateKey,
  shiftDateKey,
  toLocalDateKey,
  zonedDateTimeToIso,
} from "@/lib/utils/dates";

describe("shiftDateKey", () => {
  it("suma y resta días cruzando meses", () => {
    expect(shiftDateKey("2026-07-31", 1)).toBe("2026-08-01");
    expect(shiftDateKey("2026-08-01", -1)).toBe("2026-07-31");
  });

  it("cruza el cambio de año", () => {
    expect(shiftDateKey("2025-12-31", 1)).toBe("2026-01-01");
  });

  it("respeta los años bisiestos", () => {
    expect(shiftDateKey("2028-02-28", 1)).toBe("2028-02-29");
  });
});

describe("daysBetweenKeys", () => {
  it("cuenta días con signo", () => {
    expect(daysBetweenKeys("2026-07-26", "2026-07-28")).toBe(2);
    expect(daysBetweenKeys("2026-07-28", "2026-07-26")).toBe(-2);
    expect(daysBetweenKeys("2026-07-28", "2026-07-28")).toBe(0);
  });

  it("no se descuadra al cruzar un cambio de hora", () => {
    expect(daysBetweenKeys("2026-03-28", "2026-03-30")).toBe(2);
  });
});

describe("toLocalDateKey", () => {
  it("usa el día de la zona horaria pedida, no el de UTC", () => {
    const lateNightInMadrid = new Date("2026-07-27T22:30:00Z");

    expect(toLocalDateKey(lateNightInMadrid, "Europe/Madrid")).toBe("2026-07-28");
    expect(toLocalDateKey(lateNightInMadrid, "UTC")).toBe("2026-07-27");
  });

  it("cae a UTC si la zona no es válida", () => {
    const date = new Date("2026-07-27T22:30:00Z");
    expect(toLocalDateKey(date, "Marte/Olimpo")).toBe("2026-07-27");
  });
});

describe("zonedDateTimeToIso", () => {
  it("interpreta la hora en la zona del usuario", () => {
    expect(zonedDateTimeToIso("2026-07-28", "09:00", "Europe/Madrid")).toBe(
      "2026-07-28T07:00:00.000Z",
    );
  });

  it("es reversible con isoToZonedDateKey", () => {
    const iso = zonedDateTimeToIso("2026-01-15", "23:45", "America/Mexico_City");
    expect(isoToZonedDateKey(iso, "America/Mexico_City")).toBe("2026-01-15");
  });
});
