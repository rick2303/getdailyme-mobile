export const USERNAME_COOLDOWN_DAYS = 14;

// El mismo texto que lanza el trigger de la base. Se compara con esto para
// distinguir "aun no toca" de un fallo cualquiera al guardar.
export const USERNAME_COOLDOWN_ERROR = "username_cooldown";

const DAY_MS = 86_400_000;

// Dias que faltan para poder volver a cambiar de usuario. 0 significa que ya se
// puede. La cuenta la manda el servidor: esto es solo para avisar antes de que
// alguien escriba un usuario nuevo y se lleve el rechazo al guardar.
export function daysUntilUsernameChange(
  changedAt: string | null | undefined,
  now: Date = new Date(),
): number {
  if (!changedAt) return 0;

  const elapsed = now.getTime() - new Date(changedAt).getTime();
  if (Number.isNaN(elapsed)) return 0;

  return Math.max(0, USERNAME_COOLDOWN_DAYS - Math.floor(elapsed / DAY_MS));
}

export function isUsernameCooldownError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const message = (error as { message?: unknown }).message;
  return typeof message === "string" && message.includes(USERNAME_COOLDOWN_ERROR);
}
