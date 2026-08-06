export const ACTIVITY_COLORS = [
  "blue",
  "cyan",
  "teal",
  "green",
  "lime",
  "amber",
  "orange",
  "red",
  "pink",
  "purple",
  "indigo",
  "slate",
] as const;

export type ActivityColor = (typeof ACTIVITY_COLORS)[number];

export const DEFAULT_ACTIVITY_COLOR: ActivityColor = "blue";

export function isActivityColor(value: unknown): value is ActivityColor {
  return (
    typeof value === "string" &&
    (ACTIVITY_COLORS as readonly string[]).includes(value)
  );
}

export function resolveActivityColor(value: unknown): ActivityColor {
  return isActivityColor(value) ? value : DEFAULT_ACTIVITY_COLOR;
}
