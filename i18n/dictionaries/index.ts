import type { Locale } from "../config";
import { en } from "./en";
import { es, type Dictionary } from "./es";

export const DICTIONARIES: Record<Locale, Dictionary> = { es, en };

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale];
}

export type { Dictionary };
