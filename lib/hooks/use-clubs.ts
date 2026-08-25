import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createClub,
  deleteClub,
  fetchClubRanking,
  fetchClubs,
  joinClub,
  leaveClub,
} from "@/lib/api/clubs";
import { useCurrentUserId } from "@/lib/auth/provider";
import { queryKeys } from "@/lib/query/keys";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function useClubs() {
  const userId = useCurrentUserId();

  return useQuery({
    queryKey: queryKeys.clubs(userId ?? "anonymous"),
    enabled: isSupabaseConfigured() && Boolean(userId),
    queryFn: () => fetchClubs(getSupabaseBrowserClient()),
  });
}

export function useClubRanking(clubId: string | null) {
  return useQuery({
    queryKey: queryKeys.clubRanking(clubId ?? "none"),
    enabled: isSupabaseConfigured() && Boolean(clubId),
    staleTime: 60_000,
    queryFn: () => fetchClubRanking(getSupabaseBrowserClient(), clubId!),
  });
}

function useInvalidateClubs() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["clubs"] });
}

export function useCreateClub() {
  const userId = useCurrentUserId();
  const invalidate = useInvalidateClubs();

  return useMutation({
    mutationFn: (input: { name: string; icon: string; color: string }) =>
      createClub(getSupabaseBrowserClient(), userId!, input),
    onSettled: invalidate,
  });
}

export function useJoinClub() {
  const invalidate = useInvalidateClubs();

  return useMutation({
    mutationFn: (code: string) => joinClub(getSupabaseBrowserClient(), code),
    onSettled: invalidate,
  });
}

export function useLeaveClub() {
  const invalidate = useInvalidateClubs();

  return useMutation({
    mutationFn: ({ clubId, userId }: { clubId: string; userId: string }) =>
      leaveClub(getSupabaseBrowserClient(), clubId, userId),
    onSettled: invalidate,
  });
}

export function useDeleteClub() {
  const invalidate = useInvalidateClubs();

  return useMutation({
    mutationFn: (clubId: string) => deleteClub(getSupabaseBrowserClient(), clubId),
    onSettled: invalidate,
  });
}
