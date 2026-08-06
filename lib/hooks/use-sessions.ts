

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { clearSession, fetchActiveSessions, startSession } from "@/lib/api/sessions";
import type { ActiveSession } from "@/lib/api/types";
import { useCurrentUserId } from "@/lib/auth/provider";
import { queryKeys } from "@/lib/query/keys";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function useActiveSessions() {
  const userId = useCurrentUserId();

  return useQuery({
    queryKey: queryKeys.activeSessions(userId ?? "anonymous"),
    enabled: isSupabaseConfigured() && Boolean(userId),
    queryFn: () => fetchActiveSessions(getSupabaseBrowserClient(), userId!),
    refetchOnWindowFocus: true,
  });
}

export function useSessionFor(activityId: string | null): ActiveSession | null {
  const { data } = useActiveSessions();
  if (!activityId) return null;
  return data?.find((session) => session.activity_id === activityId) ?? null;
}

export function useStartSession() {
  const userId = useCurrentUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (activityId: string) =>
      startSession(getSupabaseBrowserClient(), userId!, activityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.activeSessions(userId ?? "anonymous") });
    },
  });
}

export function useClearSession() {
  const userId = useCurrentUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (activityId: string) =>
      clearSession(getSupabaseBrowserClient(), userId!, activityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.activeSessions(userId ?? "anonymous") });
    },
  });
}

export function useElapsedMinutes(startedAt: string | null): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!startedAt) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  if (!startedAt) return 0;
  return Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 60_000));
}

export function formatElapsed(startedAt: string, now: number): string {
  const totalSeconds = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => value.toString().padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

export function useTicker(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [active]);

  return now;
}
