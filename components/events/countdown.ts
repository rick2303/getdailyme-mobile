

import { useI18n } from "@/i18n/provider";
import type { EventSummary } from "@/lib/api/types";
import { useTimeZone } from "@/lib/auth/provider";
import { eventEndsAtMs } from "@/lib/hooks/use-events";
import { useNowMs } from "@/lib/hooks/use-now";
import { calendarDaysUntil } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";

const HOUR_MS = 3_600_000;
const SAME_DAY_HOURS_THRESHOLD = 6;

export type CountdownState =
  | { kind: "ongoing" }
  | { kind: "today" }
  | { kind: "tomorrow" }
  | { kind: "soon" }
  | { kind: "ended" }
  | { kind: "days"; count: number }
  | { kind: "hours"; count: number }
  | { kind: "daysAgo"; count: number };

export function computeCountdown(
  event: EventSummary,
  timeZone: string,
  nowMs: number,
): CountdownState {
  const startMs = new Date(event.starts_at).getTime();
  const endMs = eventEndsAtMs(event);

  if (nowMs >= startMs) {
    if (nowMs <= endMs) return { kind: "ongoing" };
    const elapsedDays = -calendarDaysUntil(event.ends_at ?? event.starts_at, timeZone);
    return elapsedDays > 0 ? { kind: "daysAgo", count: elapsedDays } : { kind: "ended" };
  }

  const days = calendarDaysUntil(event.starts_at, timeZone);
  if (days >= 2) return { kind: "days", count: days };
  if (days === 1) return { kind: "tomorrow" };

  const hours = Math.floor((startMs - nowMs) / HOUR_MS);
  if (event.all_day || hours >= SAME_DAY_HOURS_THRESHOLD) return { kind: "today" };
  if (hours >= 1) return { kind: "hours", count: hours };
  return { kind: "soon" };
}

export function useCountdownLabel(): (event: EventSummary) => string {
  const { t } = useI18n();
  const timeZone = useTimeZone();
  const now = useNowMs();

  return (event: EventSummary) => {
    const state = computeCountdown(event, timeZone, now);
    switch (state.kind) {
      case "days":
        return t("events.countdown.days", { count: state.count });
      case "hours":
        return t("events.countdown.hours", { count: state.count });
      case "daysAgo":
        return t("events.countdown.daysAgo", { count: state.count });
      case "ongoing":
        return t("events.countdown.ongoing");
      case "today":
        return t("events.countdown.today");
      case "tomorrow":
        return t("events.countdown.tomorrow");
      case "soon":
        return t("events.countdown.soon");
      default:
        return t("events.countdown.ended");
    }
  };
}

