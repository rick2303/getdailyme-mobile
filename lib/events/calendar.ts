import type { EventSummary } from "@/lib/api/types";
import { DAY_MS, isoToZonedDateKey, shiftDateKey } from "@/lib/utils/dates";

const MAX_EVENT_SPAN_DAYS = 366;
const KNOWN_MONDAY = Date.UTC(2024, 0, 1);

export type CalendarDay = {
  key: string;
  dayOfMonth: number;
  inMonth: boolean;
  isToday: boolean;
};

export type CalendarMonth = { year: number; month: number };

export function monthOf(dateKey: string): CalendarMonth {
  const [year, month] = dateKey.split("-").map(Number);
  return { year, month: month - 1 };
}

export function shiftMonth({ year, month }: CalendarMonth, delta: number): CalendarMonth {
  const shifted = new Date(Date.UTC(year, month + delta, 1));
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() };
}

export function monthLabelDate({ year, month }: CalendarMonth): Date {
  return new Date(Date.UTC(year, month, 1));
}

export function buildMonthGrid({ year, month }: CalendarMonth, today: string): CalendarDay[] {
  const firstOfMonth = new Date(Date.UTC(year, month, 1));
  const leadingBlanks = (firstOfMonth.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cellCount = Math.ceil((leadingBlanks + daysInMonth) / 7) * 7;
  const gridStart = Date.UTC(year, month, 1 - leadingBlanks);

  return Array.from({ length: cellCount }, (_, index) => {
    const date = new Date(gridStart + index * DAY_MS);
    const key = date.toISOString().slice(0, 10);
    return {
      key,
      dayOfMonth: date.getUTCDate(),
      inMonth: date.getUTCMonth() === month,
      isToday: key === today,
    };
  });
}

export function weekdayLabels(locale: string): string[] {
  const formatter = new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" });
  return Array.from({ length: 7 }, (_, index) =>
    formatter.format(new Date(KNOWN_MONDAY + index * DAY_MS)),
  );
}

export function eventsByDateKey(
  events: EventSummary[],
  timeZone: string,
): Map<string, EventSummary[]> {
  const byDate = new Map<string, EventSummary[]>();

  for (const event of events) {
    const firstDay = isoToZonedDateKey(event.starts_at, timeZone);
    const lastDay = event.ends_at ? isoToZonedDateKey(event.ends_at, timeZone) : firstDay;

    let cursor = firstDay;
    for (let span = 0; span < MAX_EVENT_SPAN_DAYS; span += 1) {
      const sameDay = byDate.get(cursor) ?? [];
      sameDay.push(event);
      byDate.set(cursor, sameDay);

      if (cursor >= lastDay) break;
      cursor = shiftDateKey(cursor, 1);
    }
  }

  return byDate;
}
