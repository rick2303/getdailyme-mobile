// La logica pura del momento del dia: en que fase esta y cuanto queda.
//
// Vive aparte de lib/api/moments.ts porque aquel importa el almacenamiento, que
// en el movil arrastra modulos nativos; esto se puede probar y usar en
// cualquier sitio, widget incluido.

/** Los minutos para llegar a tiempo. El mismo valor que `moment_window()`. */
export const MOMENT_WINDOW_MS = 5 * 60 * 1000;

export type MomentRound = {
  id: string;
  localDate: string;
  firesAt: string;
};

export type MomentPhase =
  /** Hoy todavia no ha sonado. */
  | { kind: "waiting" }
  /** Ha sonado y se esta a tiempo: quedan `remainingMs`. */
  | { kind: "open"; remainingMs: number }
  /** Ha sonado, se paso el margen y aun no se ha publicado. Se puede, tarde. */
  | { kind: "late" }
  /** Ya publicado. */
  | { kind: "posted" };

export function momentPhase(
  round: MomentRound | null,
  posted: boolean,
  now: Date = new Date(),
): MomentPhase {
  if (posted) return { kind: "posted" };
  if (!round) return { kind: "waiting" };

  const firesAt = Date.parse(round.firesAt);
  if (Number.isNaN(firesAt) || now.getTime() < firesAt) return { kind: "waiting" };

  const remainingMs = firesAt + MOMENT_WINDOW_MS - now.getTime();
  if (remainingMs > 0) return { kind: "open", remainingMs };
  return { kind: "late" };
}

/** "4:07" para la cuenta atras del momento. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
