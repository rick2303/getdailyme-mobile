

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchInviteToken, redeemInvite, rotateInviteToken } from "@/lib/api/invites";
import { useCurrentUserId } from "@/lib/auth/provider";
import { queryKeys } from "@/lib/query/keys";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function useInviteToken() {
  const userId = useCurrentUserId();

  return useQuery({
    queryKey: queryKeys.invite(userId ?? "anonymous"),
    enabled: isSupabaseConfigured() && Boolean(userId),
    staleTime: Infinity,
    queryFn: () => fetchInviteToken(getSupabaseBrowserClient()),
  });
}

export function useRotateInvite() {
  const userId = useCurrentUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => rotateInviteToken(getSupabaseBrowserClient()),
    onSuccess: (token) => {
      queryClient.setQueryData(queryKeys.invite(userId ?? "anonymous"), token);
    },
  });
}

export function useRedeemInvite(token: string | null) {
  const userId = useCurrentUserId();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: queryKeys.inviteRedeem(token ?? "none"),
    enabled: isSupabaseConfigured() && Boolean(token) && Boolean(userId),
    retry: false,
    staleTime: Infinity,
    queryFn: async () => {
      const result = await redeemInvite(getSupabaseBrowserClient(), token!);
      if (result.outcome === "accepted") {
        queryClient.invalidateQueries({ queryKey: queryKeys.friends(userId!) });
        queryClient.invalidateQueries({ queryKey: queryKeys.feed() });
      }
      return result;
    },
  });
}
