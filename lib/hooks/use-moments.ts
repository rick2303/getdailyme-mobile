import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  clearMomentReaction,
  deleteMoment,
  fetchFriendsPosted,
  fetchMoments,
  fetchTodayRound,
  publishMoment,
  reactToMoment,
} from "@/lib/api/moments";
import { removeMomentMedia, uploadMomentMedia } from "@/lib/api/storage";
import type { ReactionType } from "@/lib/api/types";
import { useCurrentUserId, useTimeZone } from "@/lib/auth/provider";
import { requestPush } from "@/lib/push/client";
import { queryKeys } from "@/lib/query/keys";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

// Mientras no ha sonado, la ronda se vuelve a pedir cada minuto: es la unica
// forma de que la tarjeta cambie a "es el momento" con la app abierta aunque
// el aviso no llegue (avisos apagados).
const ROUND_POLL_MS = 60_000;

export function useMomentRound(today: string) {
  const timeZone = useTimeZone();

  return useQuery({
    queryKey: queryKeys.momentRound(timeZone, today),
    enabled: isSupabaseConfigured(),
    queryFn: () => fetchTodayRound(getSupabaseBrowserClient(), timeZone, today),
    refetchInterval: (query) => (query.state.data ? false : ROUND_POLL_MS),
  });
}

export function useMoments(today: string) {
  const userId = useCurrentUserId();

  return useQuery({
    queryKey: queryKeys.moments(today),
    enabled: isSupabaseConfigured() && Boolean(userId),
    queryFn: () => fetchMoments(getSupabaseBrowserClient(), userId!, today),
  });
}

export function useMomentFriendsPosted(today: string, enabled = true) {
  return useQuery({
    queryKey: queryKeys.momentFriendsPosted(today),
    enabled: isSupabaseConfigured() && enabled,
    queryFn: () => fetchFriendsPosted(getSupabaseBrowserClient(), today),
    refetchInterval: ROUND_POLL_MS,
  });
}

function useRefreshMoments(today: string) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.moments(today) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.momentFriendsPosted(today) });
  };
}

export function usePublishMoment(today: string) {
  const userId = useCurrentUserId();
  const refresh = useRefreshMoments(today);

  return useMutation({
    // En el movil la foto llega como URI de la camara, no como File.
    mutationFn: async ({ uri, caption }: { uri: string; caption: string }) => {
      const client = getSupabaseBrowserClient();
      const mediaPath = await uploadMomentMedia(client, userId!, uri);
      try {
        await publishMoment(client, userId!, { mediaPath, caption });
      } catch (error) {
        // Sin fila no hay quien vea el archivo: se suelta para no dejar
        // huerfanos en el bucket.
        await removeMomentMedia(client, mediaPath);
        throw error;
      }
    },
    onSuccess: refresh,
  });
}

export function useDeleteMoment(today: string) {
  const refresh = useRefreshMoments(today);

  return useMutation({
    mutationFn: async ({ momentId, mediaPath }: { momentId: string; mediaPath: string }) => {
      const client = getSupabaseBrowserClient();
      await deleteMoment(client, momentId);
      await removeMomentMedia(client, mediaPath);
    },
    onSuccess: refresh,
  });
}

export function useMomentReaction(today: string) {
  const userId = useCurrentUserId();
  const refresh = useRefreshMoments(today);

  return useMutation({
    mutationFn: async ({ momentId, kind }: { momentId: string; kind: ReactionType | null }) => {
      const client = getSupabaseBrowserClient();
      if (kind) await reactToMoment(client, momentId, userId!, kind);
      else await clearMomentReaction(client, momentId, userId!);
    },
    onSuccess: (_result, { momentId, kind }) => {
      refresh();
      if (kind) void requestPush({ type: "moment_reaction", momentId });
    },
  });
}
