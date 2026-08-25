

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createChallenge,
  fetchChallengeStandings,
  fetchChallenges,
  joinChallenge,
  leaveChallenge,
  updateChallenge,
  type NewChallenge,
} from "@/lib/api/challenges";
import { useCurrentUserId } from "@/lib/auth/provider";
import { queryKeys } from "@/lib/query/keys";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function useChallenges() {
  const userId = useCurrentUserId();

  const query = useQuery({
    queryKey: queryKeys.challenges(userId ?? "anonymous"),
    enabled: isSupabaseConfigured() && Boolean(userId),
    queryFn: () => fetchChallenges(getSupabaseBrowserClient(), userId!),
  });

  const all = query.data ?? [];

  return {
    ...query,
    active: all.filter((item) => item.status === "joined"),
    invitations: all.filter((item) => item.status === "invited"),
  };
}

export function useChallengeStandings(challengeId: string | null) {
  return useQuery({
    queryKey: queryKeys.challengeStandings(challengeId ?? "none"),
    enabled: isSupabaseConfigured() && Boolean(challengeId),
    queryFn: () => fetchChallengeStandings(getSupabaseBrowserClient(), challengeId!),
  });
}

function useInvalidateChallenges() {
  const queryClient = useQueryClient();
  const userId = useCurrentUserId();

  return () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.challenges(userId ?? "anonymous") });
    queryClient.invalidateQueries({ queryKey: ["challenge-standings"] });
  };
}

export function useCreateChallenge() {
  const userId = useCurrentUserId();
  const invalidate = useInvalidateChallenges();

  return useMutation({
    mutationFn: (input: NewChallenge) =>
      createChallenge(getSupabaseBrowserClient(), userId!, input),
    onSuccess: invalidate,
  });
}

export function useUpdateChallenge() {
  const invalidate = useInvalidateChallenges();

  return useMutation({
    mutationFn: ({
      challengeId,
      patch,
    }: {
      challengeId: string;
      patch: { title?: string; target?: number; ends_on?: string };
    }) => updateChallenge(getSupabaseBrowserClient(), challengeId, patch),
    onSettled: invalidate,
  });
}

export function useJoinChallenge() {
  const userId = useCurrentUserId();
  const invalidate = useInvalidateChallenges();

  return useMutation({
    mutationFn: ({ challengeId, activityId }: { challengeId: string; activityId: string }) =>
      joinChallenge(getSupabaseBrowserClient(), challengeId, userId!, activityId),
    onSuccess: invalidate,
  });
}

export function useLeaveChallenge() {
  const userId = useCurrentUserId();
  const invalidate = useInvalidateChallenges();

  return useMutation({
    mutationFn: (challengeId: string) =>
      leaveChallenge(getSupabaseBrowserClient(), challengeId, userId!),
    onSuccess: invalidate,
  });
}
