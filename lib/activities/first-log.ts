export function isFirstLog(firstLoggedAt: string | null, loggedAt: string): boolean {
  if (!firstLoggedAt) return false;
  const first = Date.parse(firstLoggedAt);
  return !Number.isNaN(first) && first === Date.parse(loggedAt);
}
