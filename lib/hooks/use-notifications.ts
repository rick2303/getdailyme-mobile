import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { updateProfile } from "@/lib/api/profile";
import { useAuth, useCurrentUserId } from "@/lib/auth/provider";
import { queryKeys } from "@/lib/query/keys";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export type NotificationPreferences = {
  notify_nudges: boolean;
  notify_reactions: boolean;
  notify_comments: boolean;
  daily_reminder_at: string | null;
};

export function useNotificationPreferences() {
  const userId = useCurrentUserId();

  return useQuery({
    queryKey: queryKeys.notificationPrefs(userId ?? "anonymous"),
    enabled: isSupabaseConfigured() && Boolean(userId),
    queryFn: async (): Promise<NotificationPreferences> => {
      const { data, error } = await getSupabaseBrowserClient()
        .from("profiles")
        .select("notify_nudges, notify_reactions, notify_comments, daily_reminder_at")
        .eq("id", userId!)
        .single();

      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateNotificationPreferences() {
  const userId = useCurrentUserId();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const key = queryKeys.notificationPrefs(userId ?? "anonymous");

  return useMutation<unknown, Error, Partial<NotificationPreferences>, { previous?: NotificationPreferences }>({
    mutationFn: async (patch) => updateProfile(getSupabaseBrowserClient(), userId!, patch),
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<NotificationPreferences>(key);
      if (previous) queryClient.setQueryData<NotificationPreferences>(key, { ...previous, ...patch });
      return { previous };
    },
    onError: (_error, _patch, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
      if (profile) queryClient.invalidateQueries({ queryKey: queryKeys.profile(profile.id) });
    },
  });
}
