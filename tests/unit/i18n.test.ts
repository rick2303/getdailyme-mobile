import { describe, expect, it } from "vitest";

import { en } from "@/i18n/dictionaries/en";
import { es } from "@/i18n/dictionaries/es";
import { translate } from "@/i18n/translate";

function leafPaths(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) return [prefix];
  if ("other" in (value as Record<string, unknown>)) return [prefix];

  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    leafPaths(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe("diccionarios", () => {
  it("tienen exactamente las mismas claves", () => {
    const spanish = leafPaths(es).sort();
    const english = leafPaths(en).sort();

    expect(english).toEqual(spanish);
  });

  it("no deja ninguna traducción vacía", () => {
    for (const dictionary of [es, en]) {
      const empty = leafPaths(dictionary).filter(
        (path) => translate(dictionary, "es", path, { count: 1 }).trim() === "",
      );
      expect(empty).toEqual([]);
    }
  });
});

describe("translate", () => {
  it("interpola parámetros", () => {
    expect(translate(es, "es", "friends.nudgeSent", { name: "Ana" })).toBe(
      "Le diste un toque a Ana",
    );
  });

  it("elige la forma plural correcta", () => {
    expect(translate(es, "es", "stats.days", { count: 1 })).toBe("1 día");
    expect(translate(es, "es", "stats.days", { count: 3 })).toBe("3 días");
  });

  it("usa la forma cero cuando existe", () => {
    expect(translate(en, "en", "stats.days", { count: 0 })).toContain("0");
  });

  it("devuelve la clave si no existe la traducción", () => {
    expect(translate(es, "es", "no.existe.esta.clave")).toBe("no.existe.esta.clave");
  });
});
