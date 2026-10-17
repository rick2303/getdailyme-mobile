import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  clearMood,
  fetchMoods,
  fetchPingTally,
  sendPing,
  setMood,
} from "@/lib/api/couple-presence";
import { useCurrentUserId } from "@/lib/auth/provider";
import type { CoupleMood } from "@/lib/couple/moods";
import { requestPush } from "@/lib/push/client";
import { queryKeys } from "@/lib/query/keys";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

// El estado cambia poco y lo que importa es verlo al entrar, pero un toque
// recibido con la pantalla abierta deberia notarse sin tirar de la lista: un
// minuto de refresco es el punto medio sin realtime.
const PRESENCE_REFRESH_MS = 60_000;

export function useCoupleMoods(coupleId: string | null) {
  return useQuery({
    queryKey: queryKeys.coupleMoods(coupleId ?? "none"),
    enabled: isSupabaseConfigured() && Boolean(coupleId),
    queryFn: () => fetchMoods(getSupabaseBrowserClient(), coupleId!),
    refetchInterval: PRESENCE_REFRESH_MS,
  });
}

export function useSetMood(coupleId: string | null) {
  const userId = useCurrentUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (mood: CoupleMood | null) =>
      mood
        ? setMood(getSupabaseBrowserClient(), coupleId!, userId!, mood)
        : clearMood(getSupabaseBrowserClient(), coupleId!, userId!),
    onSuccess: (_result, mood) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.coupleMoods(coupleId ?? "none") });
      if (mood && coupleId) void requestPush({ type: "couple_mood", coupleId });
    },
  });
}

/** Los toques desde `since` (el principio del dia local, normalmente). */
export function usePingTally(coupleId: string | null, since: string) {
  const userId = useCurrentUserId();

  return useQuery({
    queryKey: queryKeys.couplePings(coupleId ?? "none", since),
    enabled: isSupabaseConfigured() && Boolean(coupleId) && Boolean(userId),
    queryFn: () => fetchPingTally(getSupabaseBrowserClient(), coupleId!, userId!, since),
    refetchInterval: PRESENCE_REFRESH_MS,
  });
}

export function useSendPing(coupleId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => sendPing(getSupabaseBrowserClient()),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ["couple-pings", coupleId ?? "none"] });
      if (result.outcome === "sent" && result.pingId) {
        void requestPush({ type: "couple_ping", pingId: result.pingId });
      }
    },
  });
}
