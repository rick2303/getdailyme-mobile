// Los estados que se pueden poner en el modo pareja.
//
// Son claves y no emojis: la app no pinta emojis. Cada plataforma tiene su
// icono para cada clave (lucide en la app, SF Symbols en el widget de iOS) y la
// palabra vive traducida en el diccionario, en `presence.mood.<clave>`.
//
// La lista es la misma que admite la base (couple_moods_known). Anadir uno es
// una migracion y una linea aqui.

export const COUPLE_MOODS = [
  "happy",
  "loving",
  "excited",
  "calm",
  "tired",
  "busy",
  "stressed",
  "sad",
] as const;

export type CoupleMood = (typeof COUPLE_MOODS)[number];

export function isCoupleMood(value: unknown): value is CoupleMood {
  return typeof value === "string" && (COUPLE_MOODS as readonly string[]).includes(value);
}

/**
 * Un estado de hace mas de doce horas ya no dice como esta nadie: "cansada"
 * de anoche no es "cansada" esta manana. Pasado ese rato se deja de ensenar,
 * sin borrarlo.
 */
export const MOOD_FRESH_HOURS = 12;

export function isMoodFresh(updatedAt: string, now: Date = new Date()): boolean {
  const at = Date.parse(updatedAt);
  if (Number.isNaN(at)) return false;
  return now.getTime() - at < MOOD_FRESH_HOURS * 60 * 60 * 1000;
}
