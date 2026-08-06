export const ACTIVITY_UNITS = [
  "count",
  "glass",
  "bottle",
  "liter",
  "minute",
  "hour",
  "serving",
  "page",
  "step",
  "km",
] as const;

export type ActivityUnit = (typeof ACTIVITY_UNITS)[number];

export const DEFAULT_ACTIVITY_UNIT: ActivityUnit = "count";

export function isActivityUnit(value: unknown): value is ActivityUnit {
  return (
    typeof value === "string" &&
    (ACTIVITY_UNITS as readonly string[]).includes(value)
  );
}

export function resolveActivityUnit(value: unknown): ActivityUnit {
  return isActivityUnit(value) ? value : DEFAULT_ACTIVITY_UNIT;
}
