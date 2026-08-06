const DATE_KEY_FORMATTERS = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string) {
  const cached = DATE_KEY_FORMATTERS.get(timeZone);
  if (cached) return cached;
  const created = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  DATE_KEY_FORMATTERS.set(timeZone, created);
  return created;
}

export function getBrowserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function toLocalDateKey(date: Date, timeZone: string): string {
  try {
    return formatterFor(timeZone).format(date);
  } catch {
    return formatterFor("UTC").format(date);
  }
}

export function todayKey(timeZone: string): string {
  return toLocalDateKey(new Date(), timeZone);
}

export function shiftDateKey(key: string, days: number): string {
  const [year, month, day] = key.split("-").map(Number);
  const base = Date.UTC(year, month - 1, day);
  const shifted = new Date(base + days * 86_400_000);
  return shifted.toISOString().slice(0, 10);
}

export function dateKeyToDate(key: string): Date {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

// Lunes de la semana a la que pertenece el dia. La semana empieza en lunes
// porque es la convencion de es-ES y la que ya usa el resumen semanal.
export function weekStartKey(key: string): string {
  const weekday = dateKeyToDate(key).getUTCDay();
  return shiftDateKey(key, -((weekday + 6) % 7));
}

export function weeksBetweenKeys(from: string, to: string): number {
  return Math.round(daysBetweenKeys(weekStartKey(from), weekStartKey(to)) / 7);
}

export function daysBetweenKeys(from: string, to: string): number {
  return Math.round((dateKeyToDate(to).getTime() - dateKeyToDate(from).getTime()) / 86_400_000);
}

export function localHourIn(timeZone: string): number {
  try {
    const hour = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      hour12: false,
    }).format(new Date());
    return Number(hour);
  } catch {
    return new Date().getHours();
  }
}

export function formatTime(date: Date, locale: string, timeZone: string): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatMonthYear(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(date);
}

export function formatDayMonth(date: Date, locale: string, timeZone: string): string {
  return new Intl.DateTimeFormat(locale, { timeZone, day: "numeric", month: "short" }).format(date);
}

export const DAY_MS = 86_400_000;

function timeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);

  const values: Record<string, number> = {};
  for (const part of parts) {
    if (part.type !== "literal") values[part.type] = Number(part.value);
  }

  const asUtc = Date.UTC(
    values.year,
    values.month - 1,
    values.day,
    values.hour % 24,
    values.minute,
    values.second,
  );
  return asUtc - date.getTime();
}

export function zonedDateTimeToIso(
  dateKey: string,
  timeOfDay: string,
  timeZone: string,
): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const [hour, minute] = timeOfDay.split(":").map(Number);
  const naive = Date.UTC(year, month - 1, day, hour || 0, minute || 0, 0);

  try {
    const firstGuess = naive - timeZoneOffsetMs(new Date(naive), timeZone);
    const settled = naive - timeZoneOffsetMs(new Date(firstGuess), timeZone);
    return new Date(settled).toISOString();
  } catch {
    return new Date(naive).toISOString();
  }
}

export function isoToZonedTime(iso: string, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(iso));
  } catch {
    return "00:00";
  }
}

export function isoToZonedDateKey(iso: string, timeZone: string): string {
  return toLocalDateKey(new Date(iso), timeZone);
}

export function calendarDaysUntil(iso: string, timeZone: string): number {
  return daysBetweenKeys(todayKey(timeZone), isoToZonedDateKey(iso, timeZone));
}

function sameZonedDay(start: string, end: string, timeZone: string): boolean {
  return isoToZonedDateKey(start, timeZone) === isoToZonedDateKey(end, timeZone);
}

function formatFullDay(iso: string, locale: string, timeZone: string): string {
  const date = new Date(iso);
  const includeYear = date.getUTCFullYear() !== new Date().getUTCFullYear();
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: includeYear ? "numeric" : undefined,
  }).format(date);
}

export function formatDateRange(
  startIso: string,
  endIso: string | null,
  allDay: boolean,
  locale: string,
  timeZone: string,
): string {
  const startDay = formatFullDay(startIso, locale, timeZone);

  if (allDay) {
    if (!endIso || sameZonedDay(startIso, endIso, timeZone)) return startDay;
    return `${startDay} – ${formatFullDay(endIso, locale, timeZone)}`;
  }

  const startTime = formatTime(new Date(startIso), locale, timeZone);

  if (!endIso) return `${startDay} · ${startTime}`;

  const endTime = formatTime(new Date(endIso), locale, timeZone);
  if (sameZonedDay(startIso, endIso, timeZone)) {
    return `${startDay} · ${startTime} – ${endTime}`;
  }

  return `${startDay} ${startTime} – ${formatFullDay(endIso, locale, timeZone)} ${endTime}`;
}
