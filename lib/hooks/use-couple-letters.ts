import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  deleteLetter,
  fetchLetters,
  fetchSealedLetters,
  markLetterRead,
  updateLetter,
  writeLetter,
  type LetterInput,
} from "@/lib/api/couple-letters";
import { useCurrentUserId } from "@/lib/auth/provider";
import { requestPush } from "@/lib/push/client";
import { queryKeys } from "@/lib/query/keys";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function useLetters(coupleId: string | null) {
  return useQuery({
    queryKey: queryKeys.coupleLetters(coupleId ?? "none"),
    enabled: isSupabaseConfigured() && Boolean(coupleId),
    queryFn: () => fetchLetters(getSupabaseBrowserClient(), coupleId!),
  });
}

export function useSealedLetters(coupleId: string | null) {
  return useQuery({
    queryKey: queryKeys.coupleSealedLetters(coupleId ?? "none"),
    enabled: isSupabaseConfigured() && Boolean(coupleId),
    queryFn: () => fetchSealedLetters(getSupabaseBrowserClient()),
  });
}

function useRefreshLetters(coupleId: string | null) {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.coupleLetters(coupleId ?? "none") });
    void queryClient.invalidateQueries({
      queryKey: queryKeys.coupleSealedLetters(coupleId ?? "none"),
    });
  };
}

export function useWriteLetter(coupleId: string | null) {
  const userId = useCurrentUserId();
  const refresh = useRefreshLetters(coupleId);

  return useMutation({
    mutationFn: (input: LetterInput) =>
      writeLetter(getSupabaseBrowserClient(), coupleId!, userId!, input),
    onSuccess: (letter) => {
      refresh();
      void requestPush({ type: "couple_letter", letterId: letter.id });
    },
  });
}

export function useUpdateLetter(coupleId: string | null) {
  const refresh = useRefreshLetters(coupleId);

  return useMutation({
    mutationFn: ({ letterId, input }: { letterId: string; input: LetterInput }) =>
      updateLetter(getSupabaseBrowserClient(), letterId, input),
    onSuccess: refresh,
  });
}

export function useDeleteLetter(coupleId: string | null) {
  const refresh = useRefreshLetters(coupleId);

  return useMutation({
    mutationFn: (letterId: string) => deleteLetter(getSupabaseBrowserClient(), letterId),
    onSuccess: refresh,
  });
}

export function useMarkLetterRead(coupleId: string | null) {
  const refresh = useRefreshLetters(coupleId);

  return useMutation({
    mutationFn: (letterId: string) => markLetterRead(getSupabaseBrowserClient(), letterId),
    onSuccess: refresh,
  });
}
