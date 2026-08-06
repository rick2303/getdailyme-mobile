import { daysBetweenKeys, shiftDateKey, weekStartKey } from "@/lib/utils/dates";

// Comodines: dias que puedes fallar al mes sin que la racha vuelva a cero. Lo
// que mas hace abandonar estas apps no es la falta de funciones, es perderlo
// todo por un dia. Se gastan solos, sin que haya que pulsar nada.
export const MONTHLY_FREEZES = 2;

export type StreakSummary = {
  current: number;
  longest: number;
  lastDate: string | null;
  activeDays: number;
  frozenDays: string[];
};

function monthOf(dateKey: string): string {
  return dateKey.slice(0, 7);
}

export function computeStreak(
  dateKeys: Iterable<string>,
  today: string,
  monthlyFreezes: number = MONTHLY_FREEZES,
): StreakSummary {
  const unique = Array.from(new Set(dateKeys)).sort();

  if (unique.length === 0) {
    return { current: 0, longest: 0, lastDate: null, activeDays: 0, frozenDays: [] };
  }

  let longest = 1;
  let run = 1;
  for (let index = 1; index < unique.length; index += 1) {
    if (daysBetweenKeys(unique[index - 1], unique[index]) === 1) {
      run += 1;
      longest = Math.max(longest, run);
    } else {
      run = 1;
    }
  }

  const present = new Set(unique);
  const yesterday = shiftDateKey(today, -1);

  // Hoy sin registrar no gasta comodin: el dia no ha terminado.
  let cursor = present.has(today) ? today : yesterday;

  let current = 0;
  const frozenDays: string[] = [];
  const spentByMonth = new Map<string, number>();

  while (true) {
    if (present.has(cursor)) {
      current += 1;
      cursor = shiftDateKey(cursor, -1);
      continue;
    }

    // Un hueco anterior al primer registro es el final de la racha, no un fallo.
    if (cursor < unique[0]) break;

    const month = monthOf(cursor);
    const spent = spentByMonth.get(month) ?? 0;
    if (spent >= monthlyFreezes) break;

    spentByMonth.set(month, spent + 1);
    frozenDays.push(cursor);
    cursor = shiftDateKey(cursor, -1);
  }

  // Una racha que solo se sostiene con comodines no es una racha.
  if (current === 0) frozenDays.length = 0;

  return {
    current,
    longest: Math.max(longest, current),
    lastDate: unique[unique.length - 1],
    activeDays: unique.length,
    frozenDays,
  };
}

// Comodines que quedan este mes segun los dias que la racha viva ya absorbio.
export function freezesLeftThisMonth(summary: StreakSummary, today: string): number {
  const month = monthOf(today);
  const used = summary.frozenDays.filter((date) => monthOf(date) === month).length;
  return Math.max(0, MONTHLY_FREEZES - used);
}

// Dias consecutivos en que las dos personas registraron algo, con la misma
// tolerancia a "ayer" que la racha individual. Sin comodines: perdonar un dia
// aqui seria inventar uno que no registro ninguna de las dos.
export function computeSharedStreak(
  mine: Iterable<string>,
  theirs: Iterable<string>,
  today: string,
): number {
  const other = new Set(theirs);
  const both = Array.from(new Set(mine)).filter((date) => other.has(date));
  return computeStreak(both, today, 0).current;
}

// Racha en semanas para las actividades con meta semanal: semanas seguidas en
// que se alcanzo el objetivo. La semana en curso no cuenta como fallada hasta
// que termina, igual que el dia de hoy en la racha diaria.
export function computeWeeklyStreak(
  totalsByDate: Map<string, number>,
  target: number,
  today: string,
): number {
  if (target <= 0) return 0;

  const perWeek = new Map<string, number>();
  for (const [date, total] of totalsByDate) {
    const week = weekStartKey(date);
    perWeek.set(week, (perWeek.get(week) ?? 0) + total);
  }

  const thisWeek = weekStartKey(today);
  const reached = (week: string) => (perWeek.get(week) ?? 0) >= target;

  let cursor = reached(thisWeek) ? thisWeek : shiftDateKey(thisWeek, -7);
  let streak = 0;

  while (reached(cursor)) {
    streak += 1;
    cursor = shiftDateKey(cursor, -7);
  }

  return streak;
}

export function totalInCurrentWeek(totalsByDate: Map<string, number>, today: string): number {
  const week = weekStartKey(today);
  let total = 0;
  for (const [date, value] of totalsByDate) {
    if (weekStartKey(date) === week) total += value;
  }
  return total;
}

export function buildHeatmap(
  totalsByDate: Map<string, number>,
  today: string,
  days: number,
): { date: string; total: number }[] {
  const cells: { date: string; total: number }[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = shiftDateKey(today, -offset);
    cells.push({ date, total: totalsByDate.get(date) ?? 0 });
  }
  return cells;
}
