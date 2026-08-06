"use client";

import { useCallback } from "react";

import { useI18n } from "@/i18n/provider";
import type { TranslationKey } from "@/i18n/translate";

import type { ActivityUnit } from "./units";

const SEED_NAME_KEYS: Record<string, string> = {
  agua: "water",
  water: "water",
  comida: "food",
  food: "food",
  ejercicio: "exercise",
  exercise: "exercise",
  lectura: "reading",
  reading: "reading",
  sueño: "sleep",
  sueno: "sleep",
  sleep: "sleep",
};

export function useActivityLabels() {
  const { t } = useI18n();

  const activityName = useCallback(
    (name: string) => {
      const seedKey = SEED_NAME_KEYS[name.trim().toLowerCase()];
      if (!seedKey) return name;
      return t(`seedActivities.${seedKey}` as TranslationKey);
    },
    [t],
  );

  const unitLabel = useCallback(
    (unit: ActivityUnit, count: number) => t(`units.${unit}` as TranslationKey, { count }),
    [t],
  );

  const amountWithUnit = useCallback(
    (amount: number, unit: ActivityUnit) => `${amount} ${unitLabel(unit, amount)}`,
    [unitLabel],
  );

  return { activityName, unitLabel, amountWithUnit };
}
