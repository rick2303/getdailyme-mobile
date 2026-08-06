

import { useCallback, useEffect, useState } from "react";

import { useI18n } from "@/i18n/provider";
import { useTimeZone } from "@/lib/auth/provider";
import { formatDayMonth } from "@/lib/utils/dates";

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const RELATIVE_DAYS_LIMIT = 7;
const TICK_MS = 60_000;

export function useRelativeTime(): (iso: string) => string {
  const { t, locale } = useI18n();
  const timeZone = useTimeZone();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(interval);
  }, []);

  return useCallback(
    (iso: string) => {
      const timestamp = new Date(iso).getTime();
      if (Number.isNaN(timestamp)) return "";

      const elapsed = Math.max(now - timestamp, 0);
      if (elapsed < MINUTE_MS) return t("time.justNow");
      if (elapsed < HOUR_MS) {
        return t("time.minutesAgo", { count: Math.floor(elapsed / MINUTE_MS) });
      }
      if (elapsed < DAY_MS) {
        return t("time.hoursAgo", { count: Math.floor(elapsed / HOUR_MS) });
      }

      const days = Math.floor(elapsed / DAY_MS);
      if (days <= RELATIVE_DAYS_LIMIT) return t("time.daysAgo", { count: days });

      return formatDayMonth(new Date(timestamp), locale, timeZone);
    },
    [now, t, locale, timeZone],
  );
}
