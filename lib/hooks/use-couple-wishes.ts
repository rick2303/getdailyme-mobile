import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  addWish,
  deleteWish,
  fetchWishes,
  linkWishToEvent,
  setWishDone,
  sortWishes,
  type CoupleWish,
} from "@/lib/api/couple-wishes";
import { useCurrentUserId } from "@/lib/auth/provider";
import { queryKeys } from "@/lib/query/keys";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function useWishes(coupleId: string | null) {
  return useQuery({
    queryKey: queryKeys.coupleWishes(coupleId ?? "none"),
    enabled: isSupabaseConfigured() && Boolean(coupleId),
    queryFn: () => fetchWishes(getSupabaseBrowserClient(), coupleId!),
  });
}

function useWishCache(coupleId: string | null) {
  const queryClient = useQueryClient();
  const key = queryKeys.coupleWishes(coupleId ?? "none");

  return {
    patch: (update: (wishes: CoupleWish[]) => CoupleWish[]) => {
      const previous = queryClient.getQueryData<CoupleWish[]>(key);
      if (previous) queryClient.setQueryData(key, sortWishes(update(previous)));
      return previous;
    },
    restore: (previous: CoupleWish[] | undefined) => {
      if (previous) queryClient.setQueryData(key, previous);
    },
    refresh: () => void queryClient.invalidateQueries({ queryKey: key }),
  };
}

export function useAddWish(coupleId: string | null) {
  const userId = useCurrentUserId();
  const cache = useWishCache(coupleId);

  return useMutation({
    mutationFn: (input: { title: string; note?: string | null }) =>
      addWish(getSupabaseBrowserClient(), coupleId!, userId!, input),
    onSuccess: (wish) => {
      cache.patch((wishes) => [wish, ...wishes.filter((item) => item.id !== wish.id)]);
    },
    onSettled: cache.refresh,
  });
}

// Tachar es optimista: es un gesto de un toque y tiene que sentirse asi.
export function useToggleWish(coupleId: string | null) {
  const userId = useCurrentUserId();
  const cache = useWishCache(coupleId);

  return useMutation({
    mutationFn: ({ wishId, done }: { wishId: string; done: boolean }) =>
      setWishDone(getSupabaseBrowserClient(), wishId, done ? userId! : null),
    onMutate: ({ wishId, done }) =>
      cache.patch((wishes) =>
        wishes.map((wish) =>
          wish.id === wishId
            ? {
                ...wish,
                doneAt: done ? new Date().toISOString() : null,
                doneBy: done ? (userId ?? null) : null,
              }
            : wish,
        ),
      ),
    onError: (_error, _input, previous) => cache.restore(previous),
    onSettled: cache.refresh,
  });
}

export function useDeleteWish(coupleId: string | null) {
  const cache = useWishCache(coupleId);

  return useMutation({
    mutationFn: (wishId: string) => deleteWish(getSupabaseBrowserClient(), wishId),
    onMutate: (wishId) => cache.patch((wishes) => wishes.filter((wish) => wish.id !== wishId)),
    onError: (_error, _wishId, previous) => cache.restore(previous),
    onSettled: cache.refresh,
  });
}

export function useLinkWishToEvent(coupleId: string | null) {
  const cache = useWishCache(coupleId);

  return useMutation({
    mutationFn: ({ wishId, eventId }: { wishId: string; eventId: string | null }) =>
      linkWishToEvent(getSupabaseBrowserClient(), wishId, eventId),
    onMutate: ({ wishId, eventId }) =>
      cache.patch((wishes) =>
        wishes.map((wish) => (wish.id === wishId ? { ...wish, eventId } : wish)),
      ),
    onError: (_error, _input, previous) => cache.restore(previous),
    onSettled: cache.refresh,
  });
}
