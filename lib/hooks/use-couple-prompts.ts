import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { updatePromptDecks, type Couple } from "@/lib/api/couple";
import {
  addCustomPrompt,
  deleteCustomPrompt,
  fetchMyPendingPrompts,
  fetchPromptState,
} from "@/lib/api/couple-prompts";
import { useCurrentUserId } from "@/lib/auth/provider";
import type { CoupleDeck, PromptState } from "@/lib/couple/prompts";
import { queryKeys } from "@/lib/query/keys";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function usePromptState(coupleId: string | null, dateKey: string) {
  return useQuery({
    queryKey: queryKeys.couplePromptState(coupleId ?? "none", dateKey),
    enabled: isSupabaseConfigured() && Boolean(coupleId),
    queryFn: () => fetchPromptState(getSupabaseBrowserClient(), coupleId!, dateKey),
  });
}

export function useMyPendingPrompts(coupleId: string | null, state: PromptState | undefined) {
  const userId = useCurrentUserId();

  return useQuery({
    queryKey: queryKeys.coupleCustomPrompts(coupleId ?? "none"),
    enabled: isSupabaseConfigured() && Boolean(coupleId) && Boolean(userId) && Boolean(state),
    queryFn: () =>
      fetchMyPendingPrompts(
        getSupabaseBrowserClient(),
        coupleId!,
        userId!,
        state?.used ?? {},
        state?.todayKey ?? null,
      ),
  });
}

function useInvalidatePrompts() {
  const queryClient = useQueryClient();
  return (coupleId: string) => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.coupleCustomPrompts(coupleId) });
    void queryClient.invalidateQueries({ queryKey: ["couple-prompt-state", coupleId] });
  };
}

export function useAddCustomPrompt() {
  const userId = useCurrentUserId();
  const invalidate = useInvalidatePrompts();

  return useMutation({
    mutationFn: ({ coupleId, body }: { coupleId: string; body: string }) =>
      addCustomPrompt(getSupabaseBrowserClient(), coupleId, userId!, body),
    onSuccess: (_data, { coupleId }) => invalidate(coupleId),
  });
}

export function useDeleteCustomPrompt() {
  const invalidate = useInvalidatePrompts();

  return useMutation({
    mutationFn: ({ id }: { id: string; coupleId: string }) =>
      deleteCustomPrompt(getSupabaseBrowserClient(), id),
    onSuccess: (_data, { coupleId }) => invalidate(coupleId),
  });
}

export function useUpdatePromptDecks() {
  const userId = useCurrentUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ coupleId, decks }: { coupleId: string; decks: CoupleDeck[] | null }) =>
      updatePromptDecks(getSupabaseBrowserClient(), coupleId, decks),
    onMutate: ({ decks }) => {
      const key = queryKeys.couple(userId ?? "anonymous");
      const previous = queryClient.getQueryData<Couple | null>(key);
      if (previous) queryClient.setQueryData<Couple>(key, { ...previous, promptDecks: decks });
      return { previous, key };
    },
    onError: (_error, _variables, context) => {
      if (context) queryClient.setQueryData(context.key, context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.couple(userId ?? "anonymous") });
    },
  });
}
