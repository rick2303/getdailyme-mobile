import type { ActivityInputMode } from "@/lib/api/types";

import type { ActivityUnit } from "./units";

export const ACTIVITY_INPUT_MODES: ActivityInputMode[] = [
  "counter",
  "duration",
  "check",
  "amount",
];

export const MAX_QUICK_VALUES = 6;

const FALLBACK_QUICK_VALUES: Partial<Record<ActivityUnit, number[]>> = {
  minute: [15, 30, 45, 60],
  hour: [6, 7, 8, 9],
  page: [10, 20, 30, 50],
  step: [1000, 3000, 5000, 10000],
  km: [1, 3, 5, 10],
  liter: [1, 2, 3],
  serving: [1, 2, 3],
  glass: [1, 2, 3],
  bottle: [1, 2],
  count: [1, 2, 5, 10],
};

export function defaultModeForUnit(unit: ActivityUnit): ActivityInputMode {
  if (unit === "minute" || unit === "hour") return "duration";
  if (unit === "page" || unit === "step" || unit === "km") return "amount";
  return "counter";
}

export function defaultQuickValues(unit: ActivityUnit): number[] {
  return FALLBACK_QUICK_VALUES[unit] ?? [1, 2, 5, 10];
}

export function resolveQuickValues(quickValues: number[], unit: ActivityUnit): number[] {
  const cleaned = quickValues.filter((value) => Number.isFinite(value) && value > 0);
  return cleaned.length > 0 ? cleaned.slice(0, MAX_QUICK_VALUES) : defaultQuickValues(unit);
}

export function parseQuickValues(input: string): number[] {
  return input
    .split(/[,\s]+/)
    .map((part) => Number(part.trim()))
    .filter((value) => Number.isFinite(value) && value > 0 && Number.isInteger(value))
    .slice(0, MAX_QUICK_VALUES);
}

export function formatQuickValues(values: number[]): string {
  return values.join(", ");
}

export function usesQuickLogSheet(mode: ActivityInputMode): boolean {
  return mode === "duration" || mode === "amount";
}

export function supportsTimer(mode: ActivityInputMode): boolean {
  return mode === "duration";
}

export function elapsedToAmount(elapsedMinutes: number, unit: ActivityUnit): number {
  if (unit === "hour") return Math.max(1, Math.round(elapsedMinutes / 60));
  return Math.max(1, elapsedMinutes);
}

export function stepperIncrement(unit: ActivityUnit, mode: ActivityInputMode, step: number): number {
  if (mode === "counter") return Math.max(1, step);
  if (unit === "minute") return 5;
  if (unit === "step") return 500;
  return 1;
}
