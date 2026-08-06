

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

import { fetchDailyTotals, fetchLogsSince } from "@/lib/api/logs";
import type { Activity, ActivityLog } from "@/lib/api/types";
import { useCurrentUserId, useTimeZone } from "@/lib/auth/provider";
import { mutationKeys, queryKeys } from "@/lib/query/keys";
import type { CreateLogVariables, DeleteLogVariables } from "@/lib/query/offline-mutations";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { totalInCurrentWeek } from "@/lib/activities/streaks";
import type { DayTotal } from "@/lib/activities/weekly";
import { daysBetweenKeys, shiftDateKey, toLocalDateKey, todayKey } from "@/lib/utils/dates";

export const HISTORY_DAYS = 180;

export const RAW_LOG_DAYS = 14;

export function useRecentLogs() {
  const userId = useCurrentUserId();
  const timeZone = useTimeZone();
  const since = shiftDateKey(todayKey(timeZone), -(RAW_LOG_DAYS - 1));

  return useQuery({
    queryKey: queryKeys.activityHistory(userId ?? "anonymous"),
    enabled: isSupabaseConfigured() && Boolean(userId),
    queryFn: () => fetchLogsSince(getSupabaseBrowserClient(), userId!, since),
  });
}

export function useDailyTotals() {
  const userId = useCurrentUserId();

  return useQuery({
    queryKey: queryKeys.dailyTotals(userId ?? "anonymous"),
    enabled: isSupabaseConfigured() && Boolean(userId),
    queryFn: () => fetchDailyTotals(getSupabaseBrowserClient(), HISTORY_DAYS),
  });
}

export function useLogCountsByActivity() {
  const timeZone = useTimeZone();
  const { data: dailyTotals, isLoading: isLoadingTotals } = useDailyTotals();
  const { data: logs, isLoading: isLoadingLogs } = useRecentLogs();
  const rawSince = shiftDateKey(todayKey(timeZone), -(RAW_LOG_DAYS - 1));

  return useMemo(() => {
    const byActivity = new Map<string, Map<string, number>>();

    const bump = (activityId: string, day: string, amount: number) => {
      const days = byActivity.get(activityId) ?? new Map<string, number>();
      days.set(day, (days.get(day) ?? 0) + amount);
      byActivity.set(activityId, days);
    };

    for (const row of dailyTotals ?? []) {
      if (row.day >= rawSince) continue;
      bump(row.activity_id, row.day, row.log_count);
    }

    for (const log of logs ?? []) {
      bump(log.activity_id, log.local_date, 1);
    }

    return { byActivity, isLoading: isLoadingTotals || isLoadingLogs };
  }, [dailyTotals, logs, rawSince, isLoadingTotals, isLoadingLogs]);
}

// Igual que useLogCountsByActivity pero sumando cantidades en vez de registros:
// una meta semanal de "3 veces" y otra de "20 km" no se miden con lo mismo.
export function useAmountsByActivity() {
  const timeZone = useTimeZone();
  const { data: dailyTotals, isLoading: isLoadingTotals } = useDailyTotals();
  const { data: logs, isLoading: isLoadingLogs } = useRecentLogs();
  const rawSince = shiftDateKey(todayKey(timeZone), -(RAW_LOG_DAYS - 1));

  return useMemo(() => {
    const byActivity = new Map<string, Map<string, number>>();

    const bump = (activityId: string, day: string, amount: number) => {
      const days = byActivity.get(activityId) ?? new Map<string, number>();
      days.set(day, (days.get(day) ?? 0) + amount);
      byActivity.set(activityId, days);
    };

    for (const row of dailyTotals ?? []) {
      if (row.day >= rawSince) continue;
      bump(row.activity_id, row.day, row.total);
    }

    for (const log of logs ?? []) {
      bump(log.activity_id, log.local_date, log.amount);
    }

    return { byActivity, isLoading: isLoadingTotals || isLoadingLogs };
  }, [dailyTotals, logs, rawSince, isLoadingTotals, isLoadingLogs]);
}

// Cantidad y numero de registros juntos por dia y actividad. Es lo que necesita
// el resumen semanal para poder retroceder: los registros crudos solo llegan a
// dos semanas, daily_totals cubre HISTORY_DAYS.
export function useDayTotals() {
  const timeZone = useTimeZone();
  const { data: dailyTotals, isLoading: isLoadingTotals } = useDailyTotals();
  const { data: logs, isLoading: isLoadingLogs } = useRecentLogs();
  const today = todayKey(timeZone);
  const rawSince = shiftDateKey(today, -(RAW_LOG_DAYS - 1));

  return useMemo(() => {
    const merged = new Map<string, DayTotal>();

    const bump = (activityId: string, date: string, amount: number, count: number) => {
      const key = `${date}|${activityId}`;
      const entry = merged.get(key) ?? { activityId, date, amount: 0, count: 0 };
      entry.amount += amount;
      entry.count += count;
      merged.set(key, entry);
    };

    for (const row of dailyTotals ?? []) {
      if (row.day >= rawSince) continue;
      bump(row.activity_id, row.day, row.total, row.log_count);
    }

    for (const log of logs ?? []) {
      bump(log.activity_id, log.local_date, log.amount, 1);
    }

    return {
      entries: [...merged.values()],
      today,
      earliestDate: shiftDateKey(today, -(HISTORY_DAYS - 1)),
      isLoading: isLoadingTotals || isLoadingLogs,
    };
  }, [dailyTotals, logs, rawSince, today, isLoadingTotals, isLoadingLogs]);
}

// El año no cabe en HISTORY_DAYS: se pide aparte y solo cuando la pestaña Año
// esta a la vista, que es una consulta agregada y barata pero no gratis.
export function useYearDayTotals(enabled: boolean) {
  const userId = useCurrentUserId();
  const timeZone = useTimeZone();
  const today = todayKey(timeZone);
  const year = Number(today.slice(0, 4));
  const yearStart = `${year}-01-01`;
  const days = daysBetweenKeys(yearStart, today) + 1;
  const rawSince = shiftDateKey(today, -(RAW_LOG_DAYS - 1));

  const totalsQuery = useQuery({
    queryKey: queryKeys.yearTotals(userId ?? "anonymous", year),
    enabled: isSupabaseConfigured() && Boolean(userId) && enabled,
    queryFn: () => fetchDailyTotals(getSupabaseBrowserClient(), days),
  });

  const { data: logs } = useRecentLogs();

  return useMemo(() => {
    const merged = new Map<string, DayTotal>();

    const bump = (activityId: string, date: string, amount: number, count: number) => {
      const key = `${date}|${activityId}`;
      const entry = merged.get(key) ?? { activityId, date, amount: 0, count: 0 };
      entry.amount += amount;
      entry.count += count;
      merged.set(key, entry);
    };

    for (const row of totalsQuery.data ?? []) {
      if (row.day >= rawSince) continue;
      bump(row.activity_id, row.day, row.total, row.log_count);
    }

    for (const log of logs ?? []) {
      bump(log.activity_id, log.local_date, log.amount, 1);
    }

    return {
      entries: [...merged.values()],
      yearStart,
      today,
      isLoading: totalsQuery.isLoading,
    };
  }, [totalsQuery.data, totalsQuery.isLoading, logs, rawSince, yearStart, today]);
}

export function useWeekProgress() {
  const timeZone = useTimeZone();
  const { byActivity, isLoading } = useAmountsByActivity();
  const today = todayKey(timeZone);

  return useMemo(() => {
    const totals = new Map<string, number>();
    const streaks = new Map<string, Map<string, number>>();

    for (const [activityId, days] of byActivity) {
      totals.set(activityId, totalInCurrentWeek(days, today));
      streaks.set(activityId, days);
    }

    return { totals, byActivity: streaks, today, isLoading };
  }, [byActivity, today, isLoading]);
}

export function useTodayTotals() {
  const timeZone = useTimeZone();
  const { data: logs, isLoading } = useRecentLogs();
  const today = todayKey(timeZone);

  return useMemo(() => {
    const totals = new Map<string, { amount: number; count: number }>();
    for (const log of logs ?? []) {
      if (log.local_date !== today) continue;
      const entry = totals.get(log.activity_id) ?? { amount: 0, count: 0 };
      entry.amount += log.amount;
      entry.count += 1;
      totals.set(log.activity_id, entry);
    }
    return { totals, today, isLoading };
  }, [logs, today, isLoading]);
}

export function useDatesByActivity() {
  const { byActivity } = useLogCountsByActivity();

  return useMemo(() => {
    const datesByActivity = new Map<string, Set<string>>();
    for (const [activityId, days] of byActivity) {
      datesByActivity.set(activityId, new Set(days.keys()));
    }
    return datesByActivity;
  }, [byActivity]);
}

export function useHistorySummary() {
  const timeZone = useTimeZone();
  const { byActivity, isLoading } = useLogCountsByActivity();

  return useMemo(() => {
    const countsByDate = new Map<string, number>();
    let totalLogs = 0;

    for (const days of byActivity.values()) {
      for (const [day, count] of days) {
        countsByDate.set(day, (countsByDate.get(day) ?? 0) + count);
        totalLogs += count;
      }
    }

    return {
      countsByDate,
      totalLogs,
      allDates: new Set(countsByDate.keys()),
      today: todayKey(timeZone),
      isLoading,
    };
  }, [byActivity, timeZone, isLoading]);
}

function createLogId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
}

export function useCreateLog() {
  const userId = useCurrentUserId();
  const timeZone = useTimeZone();
  const queryClient = useQueryClient();

  const mutation = useMutation<unknown, Error, CreateLogVariables, { previous?: ActivityLog[] }>({
    mutationKey: mutationKeys.createLog,
    onMutate: async (variables) => {
      const key = queryKeys.activityHistory(userId!);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ActivityLog[]>(key);

      queryClient.setQueryData<ActivityLog[]>(key, (current) => [
        {
          id: variables.id,
          activity_id: variables.activity_id,
          user_id: variables.user_id,
          amount: variables.amount,
          note: variables.note ?? null,
          photo_url: variables.photo_url ?? null,
          logged_at: variables.logged_at,
          local_date: variables.local_date,
        },
        ...(current ?? []),
      ]);

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.activityHistory(userId!), context.previous);
      }
    },
  });

  const logActivity = (activity: Activity, options?: { amount?: number; note?: string | null; photoUrl?: string | null; loggedAt?: Date }) => {
    if (!userId) return null;
    const loggedAt = options?.loggedAt ?? new Date();
    const variables: CreateLogVariables = {
      id: createLogId(),
      activity_id: activity.id,
      user_id: userId,
      amount: options?.amount ?? activity.step,
      note: options?.note ?? null,
      photo_url: options?.photoUrl ?? null,
      logged_at: loggedAt.toISOString(),
      // El servidor recalcula local_date con un trigger; aqui se refleja lo
      // mismo para que un registro de ayer no aparezca como de hoy mientras
      // viaja la peticion.
      local_date: toLocalDateKey(loggedAt, timeZone),
    };
    mutation.mutate(variables);
    return variables.id;
  };

  return { ...mutation, logActivity };
}

export function useDeleteLog() {
  const userId = useCurrentUserId();
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, DeleteLogVariables, { previous?: ActivityLog[] }>({
    mutationKey: mutationKeys.deleteLog,
    onMutate: async (variables) => {
      const key = queryKeys.activityHistory(userId!);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ActivityLog[]>(key);

      queryClient.setQueryData<ActivityLog[]>(key, (current) =>
        (current ?? []).filter((log) => log.id !== variables.logId),
      );

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.activityHistory(userId!), context.previous);
      }
    },
  });
}
