import type { Locale } from "./config";
import type { Dictionary } from "./dictionaries/es";

type PluralLeaf = {
  zero?: string;
  one: string;
  two?: string;
  few?: string;
  many?: string;
  other: string;
};

type LeafPaths<T> = T extends string
  ? never
  : T extends { other: string }
    ? never
    : {
        [K in keyof T & string]: T[K] extends string
          ? K
          : T[K] extends { other: string }
            ? K
            : `${K}.${LeafPaths<T[K]>}`;
      }[keyof T & string];

export type TranslationKey = LeafPaths<Dictionary>;

export type TranslationParams = Record<string, string | number>;

export type Translator = (key: TranslationKey, params?: TranslationParams) => string;

const numberFormatCache = new Map<Locale, Intl.NumberFormat>();

function numberFormatFor(locale: Locale) {
  const cached = numberFormatCache.get(locale);
  if (cached) return cached;
  const created = new Intl.NumberFormat(locale);
  numberFormatCache.set(locale, created);
  return created;
}

function isPluralLeaf(value: unknown): value is PluralLeaf {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as PluralLeaf).other === "string"
  );
}

function resolvePath(dictionary: Dictionary, key: string): unknown {
  let current: unknown = dictionary;
  for (const segment of key.split(".")) {
    if (typeof current !== "object" || current === null) return undefined;
    current = (current as Record<string, unknown>)[segment];
  }
  return current;
}

// A mano y no con Intl.PluralRules: Hermes (el motor de la app movil) no lo
// implementa y reventaba la app al arrancar. Para es y en la regla es trivial
// (1 es "one", el resto "other") y asi la web y el movil comparten el archivo.
function selectPluralForm(leaf: PluralLeaf, locale: Locale, count: number): string {
  void locale;
  const category: keyof PluralLeaf = count === 1 ? "one" : "other";
  if (count === 0 && leaf.zero) return leaf.zero;
  return leaf[category] ?? leaf.other;
}

function interpolate(template: string, locale: Locale, params?: TranslationParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, token: string) => {
    const value = params[token];
    if (value === undefined) return match;
    return typeof value === "number" ? numberFormatFor(locale).format(value) : value;
  });
}

export function translate(
  dictionary: Dictionary,
  locale: Locale,
  key: string,
  params?: TranslationParams,
): string {
  const value = resolvePath(dictionary, key);

  if (typeof value === "string") return interpolate(value, locale, params);

  if (isPluralLeaf(value)) {
    const count = typeof params?.count === "number" ? params.count : 0;
    return interpolate(selectPluralForm(value, locale, count), locale, params);
  }

  return key;
}
