import type { ActivityLog } from "@/lib/api/types";
import { dateKeyToDate, daysBetweenKeys, shiftDateKey } from "@/lib/utils/dates";

export const DAYS_PER_WEEK = 7;

export type ActivityTotal = { activityId: string; amount: number; count: number };

// Un dia ya agregado: sirve igual para un registro suelto (count 1) que para la
// fila de daily_totals de un dia entero. Asi el resumen de una semana de hace
// tres meses sale de los mismos datos que el de esta, sin traerse los registros
// uno a uno.
export type DayTotal = {
  activityId: string;
  date: string;
  amount: number;
  count: number;
};

export type WeekSummary = {
  weekStart: string;
  totalLogs: number;
  activeDays: number;
  byActivity: ActivityTotal[];
  bestDay: { date: string; count: number } | null;
  countsByDay: number[];
};

export function startOfWeek(dateKey: string): string {
  const mondayOffset = (dateKeyToDate(dateKey).getUTCDay() + 6) % DAYS_PER_WEEK;
  return shiftDateKey(dateKey, -mondayOffset);
}

export function summarizeDayTotals(entries: DayTotal[], weekStart: string): WeekSummary {
  const totals = new Map<string, ActivityTotal>();
  const countsByDay = new Array<number>(DAYS_PER_WEEK).fill(0);

  for (const entry of entries) {
    const offset = daysBetweenKeys(weekStart, entry.date);
    if (offset < 0 || offset >= DAYS_PER_WEEK) continue;
    if (entry.count <= 0) continue;

    const total = totals.get(entry.activityId) ?? {
      activityId: entry.activityId,
      amount: 0,
      count: 0,
    };
    total.amount += entry.amount;
    total.count += entry.count;
    totals.set(entry.activityId, total);

    countsByDay[offset] += entry.count;
  }

  let bestDay: WeekSummary["bestDay"] = null;
  countsByDay.forEach((count, offset) => {
    if (count > 0 && (!bestDay || count > bestDay.count)) {
      bestDay = { date: shiftDateKey(weekStart, offset), count };
    }
  });

  return {
    weekStart,
    totalLogs: countsByDay.reduce((sum, count) => sum + count, 0),
    activeDays: countsByDay.filter((count) => count > 0).length,
    byActivity: [...totals.values()].sort((a, b) => b.count - a.count),
    bestDay,
    countsByDay,
  };
}

export function summarizeWeek(logs: ActivityLog[], weekStart: string): WeekSummary {
  return summarizeDayTotals(
    logs.map((log) => ({
      activityId: log.activity_id,
      date: log.local_date,
      amount: log.amount,
      count: 1,
    })),
    weekStart,
  );
}

export function percentChange(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return Math.round(((current - previous) / previous) * 100);
}

// Resumen de un rango largo (mes, año) con la misma forma que el semanal para
// que la tarjeta compartible sirva tal cual: countsByDay pasa de "un valor por
// fecha" a "un valor por dia de la semana", que es la unica lectura que siete
// barras pueden dar de doscientos dias.
export function summarizeRange(
  entries: DayTotal[],
  fromKey: string,
  toKey: string,
): WeekSummary {
  const totals = new Map<string, ActivityTotal>();
  const countsByWeekday = new Array<number>(DAYS_PER_WEEK).fill(0);
  const countsByDate = new Map<string, number>();

  for (const entry of entries) {
    if (entry.date < fromKey || entry.date > toKey) continue;
    if (entry.count <= 0) continue;

    const total = totals.get(entry.activityId) ?? {
      activityId: entry.activityId,
      amount: 0,
      count: 0,
    };
    total.amount += entry.amount;
    total.count += entry.count;
    totals.set(entry.activityId, total);

    const mondayIndex = (dateKeyToDate(entry.date).getUTCDay() + 6) % DAYS_PER_WEEK;
    countsByWeekday[mondayIndex] += entry.count;
    countsByDate.set(entry.date, (countsByDate.get(entry.date) ?? 0) + entry.count);
  }

  let bestDay: WeekSummary["bestDay"] = null;
  for (const [date, count] of countsByDate) {
    if (!bestDay || count > bestDay.count) bestDay = { date, count };
  }

  return {
    weekStart: fromKey,
    totalLogs: [...countsByDate.values()].reduce((sum, count) => sum + count, 0),
    activeDays: countsByDate.size,
    byActivity: [...totals.values()].sort((a, b) => b.count - a.count),
    bestDay,
    countsByDay: countsByWeekday,
  };
}
