

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";

import { FEED_PAGE_SIZE, fetchFeedPage } from "@/lib/api/feed";
import type { FeedEntry, ReactionType } from "@/lib/api/types";
import { useCurrentUserId } from "@/lib/auth/provider";
import { mutationKeys, queryKeys } from "@/lib/query/keys";
import type { ToggleReactionVariables } from "@/lib/query/offline-mutations";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

const REALTIME_CHANNEL = "feed-stream";
const REALTIME_THROTTLE_MS = 4000;

export type FeedInfiniteData = InfiniteData<FeedEntry[], string | null>;

export function useFeed() {
  return useInfiniteQuery<
    FeedEntry[],
    Error,
    FeedInfiniteData,
    ReturnType<typeof queryKeys.feed>,
    string | null
  >({
    queryKey: queryKeys.feed(),
    enabled: isSupabaseConfigured(),
    initialPageParam: null,
    queryFn: ({ pageParam }) => fetchFeedPage(getSupabaseBrowserClient(), { before: pageParam }),
    getNextPageParam: (lastPage) => {
      if (lastPage.length < FEED_PAGE_SIZE) return undefined;
      return lastPage[lastPage.length - 1]?.logged_at ?? undefined;
    },
  });
}

export function useFeedRealtime() {
  const queryClient = useQueryClient();
  const currentUserId = useCurrentUserId();
  const [pendingCount, setPendingCount] = useState(0);
  const lastInvalidationRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const invalidateFeed = useCallback(() => {
    lastInvalidationRef.current = Date.now();
    queryClient.invalidateQueries({ queryKey: queryKeys.feed() });
  }, [queryClient]);

  const scheduleInvalidation = useCallback(() => {
    const elapsed = Date.now() - lastInvalidationRef.current;
    if (elapsed >= REALTIME_THROTTLE_MS) {
      invalidateFeed();
      return;
    }
    if (timeoutRef.current !== null) return;
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null;
      invalidateFeed();
    }, REALTIME_THROTTLE_MS - elapsed);
  }, [invalidateFeed]);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const client = getSupabaseBrowserClient();
    const channel = client
      .channel(REALTIME_CHANNEL)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity_logs" },
        (payload) => {
          const inserted = payload.new as { user_id?: string } | null;
          if (!currentUserId || inserted?.user_id !== currentUserId) {
            setPendingCount((current) => current + 1);
          }
          scheduleInvalidation();
        },
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "reactions" }, () => {
        scheduleInvalidation();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "comments" }, (payload) => {
        // El hilo abierto se refresca al momento; la cuenta del feed puede
        // esperar al throttle como el resto.
        const row = (payload.new ?? payload.old) as { log_id?: string } | null;
        if (row?.log_id) {
          queryClient.invalidateQueries({ queryKey: queryKeys.comments(row.log_id) });
        }
        scheduleInvalidation();
      })
      .subscribe();

    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      client.removeChannel(channel);
    };
  }, [currentUserId, scheduleInvalidation, queryClient]);

  const consumePending = useCallback(() => {
    setPendingCount(0);
    invalidateFeed();
    // El scroll al principio lo hace la pantalla con su propia ref de lista.
  }, [invalidateFeed]);

  const resetPending = useCallback(() => setPendingCount(0), []);

  return { pendingCount, consumePending, resetPending };
}

function optimisticReactionId(logId: string, type: ReactionType): string {
  return `optimistic-${logId}-${type}`;
}

export function useToggleReaction() {
  const userId = useCurrentUserId();
  const queryClient = useQueryClient();

  const mutation = useMutation<
    unknown,
    Error,
    ToggleReactionVariables,
    { previous?: FeedInfiniteData }
  >({
    mutationKey: mutationKeys.toggleReaction,
    onMutate: async (variables) => {
      const key = queryKeys.feed();
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<FeedInfiniteData>(key);

      queryClient.setQueryData<FeedInfiniteData>(key, (current) => {
        if (!current) return current;

        return {
          ...current,
          pages: current.pages.map((page) =>
            page.map((entry) => {
              if (entry.id !== variables.logId) return entry;

              const reactions = variables.shouldAdd
                ? [
                    ...entry.reactions,
                    {
                      id: optimisticReactionId(variables.logId, variables.type),
                      type: variables.type,
                      user_id: variables.userId,
                    },
                  ]
                : entry.reactions.filter(
                    (reaction) =>
                      reaction.user_id !== variables.userId || reaction.type !== variables.type,
                  );

              return { ...entry, reactions };
            }),
          ),
        };
      });

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.feed(), context.previous);
      }
    },
  });

  const { mutate } = mutation;

  const toggleReaction = useCallback(
    (logId: string, type: ReactionType, isActive: boolean) => {
      if (!userId) return;
      mutate({ logId, userId, type, shouldAdd: !isActive });
    },
    [mutate, userId],
  );

  return { ...mutation, toggleReaction };
}
