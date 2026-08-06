

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  fetchUnreadNotifications,
  markNotificationsRead,
  type InboxNotification,
} from "@/lib/api/notifications";
import { useCurrentUserId } from "@/lib/auth/provider";
import { queryKeys } from "@/lib/query/keys";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function useInbox() {
  const userId = useCurrentUserId();

  return useQuery({
    queryKey: queryKeys.inbox(userId ?? "anonymous"),
    enabled: isSupabaseConfigured() && Boolean(userId),
    queryFn: () => fetchUnreadNotifications(getSupabaseBrowserClient()),
    // Sin realtime a proposito: la bandeja se mira al entrar al feed, y un
    // minuto de retraso no cambia nada. Un canal abierto si costaria.
    refetchInterval: 60_000,
  });
}

export function useMarkInboxRead() {
  const userId = useCurrentUserId();
  const queryClient = useQueryClient();
  const key = queryKeys.inbox(userId ?? "anonymous");

  return useMutation({
    mutationFn: (ids: string[]) => markNotificationsRead(getSupabaseBrowserClient(), ids),
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<InboxNotification[]>(key);
      queryClient.setQueryData<InboxNotification[]>(key, (current) =>
        (current ?? []).filter((item) => !ids.includes(item.id)),
      );
      return { previous };
    },
    onError: (_error, _ids, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
    },
  });
}
