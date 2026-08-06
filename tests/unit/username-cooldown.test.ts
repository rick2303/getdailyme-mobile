import { describe, expect, it } from "vitest";

import {
  USERNAME_COOLDOWN_DAYS,
  daysUntilUsernameChange,
  isUsernameCooldownError,
} from "@/lib/api/username-cooldown";

const NOW = new Date("2026-08-05T12:00:00Z");

function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * 86_400_000).toISOString();
}

describe("daysUntilUsernameChange", () => {
  it("deja cambiar a quien nunca lo cambió", () => {
    expect(daysUntilUsernameChange(null, NOW)).toBe(0);
  });

  it("bloquea los catorce días completos justo después del cambio", () => {
    expect(daysUntilUsernameChange(daysAgo(0), NOW)).toBe(USERNAME_COOLDOWN_DAYS);
  });

  it("descuenta los días ya pasados", () => {
    expect(daysUntilUsernameChange(daysAgo(1), NOW)).toBe(13);
    expect(daysUntilUsernameChange(daysAgo(13), NOW)).toBe(1);
  });

  it("abre el cambio al cumplirse el plazo y no lo reabre antes", () => {
    expect(daysUntilUsernameChange(daysAgo(13.5), NOW)).toBe(1);
    expect(daysUntilUsernameChange(daysAgo(14), NOW)).toBe(0);
    expect(daysUntilUsernameChange(daysAgo(90), NOW)).toBe(0);
  });

  it("no se atasca con una fecha ilegible", () => {
    expect(daysUntilUsernameChange("no es una fecha", NOW)).toBe(0);
  });
});

describe("isUsernameCooldownError", () => {
  it("reconoce el error que lanza el trigger", () => {
    expect(isUsernameCooldownError({ message: "username_cooldown" })).toBe(true);
  });

  it("no confunde cualquier otro fallo al guardar", () => {
    expect(isUsernameCooldownError({ message: "duplicate key value" })).toBe(false);
    expect(isUsernameCooldownError(null)).toBe(false);
    expect(isUsernameCooldownError("username_cooldown")).toBe(false);
  });
});
