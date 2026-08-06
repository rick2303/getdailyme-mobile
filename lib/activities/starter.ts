import type { Locale } from "@/i18n/config";

import type { ActivityColor } from "./colors";
import { defaultModeForUnit, defaultQuickValues } from "./input-modes";
import type { ActivityUnit } from "./units";

// Sugerencias extra para la bienvenida, ademas de las cinco que siembra la
// base. Mismos criterios que las sembradas: nombre corto, unidad natural y una
// meta diaria razonable como punto de partida.
export type StarterActivity = {
  key: string;
  names: Record<Locale, string>;
  icon: string;
  color: ActivityColor;
  unit: ActivityUnit;
  daily_target: number | null;
};

export const STARTER_SUGGESTIONS: readonly StarterActivity[] = [
  {
    key: "meditate",
    names: { es: "Meditar", en: "Meditate" },
    icon: "brain",
    color: "teal",
    unit: "minute",
    daily_target: 10,
  },
  {
    key: "steps",
    names: { es: "Pasos", en: "Steps" },
    icon: "footprints",
    color: "green",
    unit: "step",
    daily_target: 8000,
  },
  {
    key: "study",
    names: { es: "Estudiar", en: "Study" },
    icon: "graduation-cap",
    color: "blue",
    unit: "minute",
    daily_target: 45,
  },
  {
    key: "coffee",
    names: { es: "Café", en: "Coffee" },
    icon: "coffee",
    color: "amber",
    unit: "count",
    daily_target: null,
  },
  {
    key: "savings",
    names: { es: "Ahorrar", en: "Save money" },
    icon: "coins",
    color: "lime",
    unit: "count",
    daily_target: null,
  },
];

export function starterActivityInput(suggestion: StarterActivity, locale: Locale) {
  return {
    name: suggestion.names[locale] ?? suggestion.names.es,
    icon: suggestion.icon,
    color: suggestion.color,
    unit: suggestion.unit,
    step: 1,
    daily_target: suggestion.daily_target,
    target_period: "day" as const,
    reminder_at: null,
    visibility: "friends" as const,
    input_mode: defaultModeForUnit(suggestion.unit),
    quick_values: defaultQuickValues(suggestion.unit),
  };
}
