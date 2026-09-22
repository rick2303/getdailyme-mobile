import { describe, expect, it } from "vitest";

import { isFirstLog } from "@/lib/activities/first-log";

describe("isFirstLog", () => {
  it("es el primero cuando el servidor guardo la misma marca de tiempo", () => {
    expect(isFirstLog("2026-09-22T09:14:03.120+00:00", "2026-09-22T09:14:03.120Z")).toBe(true);
  });

  it("compara instantes, no texto, aunque el huso venga escrito distinto", () => {
    expect(isFirstLog("2026-09-22T11:14:03.120+02:00", "2026-09-22T09:14:03.120Z")).toBe(true);
  });

  it("no lo es si la cuenta ya tenia un primer registro anterior", () => {
    expect(isFirstLog("2026-06-01T08:00:00+00:00", "2026-09-22T09:14:03.120Z")).toBe(false);
  });

  it("no lo es si el servidor aun no tiene nada", () => {
    expect(isFirstLog(null, "2026-09-22T09:14:03.120Z")).toBe(false);
  });

  it("no lo es con una fecha ilegible", () => {
    expect(isFirstLog("ayer", "2026-09-22T09:14:03.120Z")).toBe(false);
  });
});
