

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";

import {
  blockUser,
  fetchFriendActiveDates,
  fetchFriendEdges,
  fetchFriendsActivityToday,
  fetchNudgesSentToday,
  fetchUnreadNudges,
  markNudgesRead,
  searchProfiles,
  selectAcceptedFriends,
  selectBlocked,
  selectIncomingRequests,
  selectOutgoingRequests,
} from "@/lib/api/friends";
import type { FriendshipStatus, ReceivedNudge } from "@/lib/api/types";
import { useCurrentUserId, useTimeZone } from "@/lib/auth/provider";
import { mutationKeys, queryKeys } from "@/lib/query/keys";
import type {
  FriendRequestVariables,
  RemoveFriendVariables,
  RespondFriendVariables,
  SendNudgeVariables,
} from "@/lib/query/offline-mutations";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { shiftDateKey, todayKey } from "@/lib/utils/dates";

export function useFriendEdges() {
  const userId = useCurrentUserId();

  return useQuery({
    queryKey: queryKeys.friends(userId ?? "anonymous"),
    enabled: isSupabaseConfigured() && Boolean(userId),
    queryFn: () => fetchFriendEdges(getSupabaseBrowserClient(), userId!),
  });
}

export function useFriends() {
  const query = useFriendEdges();
  const edges = useMemo(() => query.data ?? [], [query.data]);

  return {
    ...query,
    edges,
    friends: useMemo(() => selectAcceptedFriends(edges), [edges]),
    incoming: useMemo(() => selectIncomingRequests(edges), [edges]),
    outgoing: useMemo(() => selectOutgoingRequests(edges), [edges]),
    blocked: useMemo(() => selectBlocked(edges), [edges]),
  };
}

export function useBlockUser() {
  const userId = useCurrentUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (blockedUserId: string) =>
      blockUser(getSupabaseBrowserClient(), blockedUserId),
    onSuccess: () => {
      // El bloqueo corta amistad, feed, fichas y novedades a la vez: mejor
      // recargar de mas que enseñar contenido de alguien recien bloqueado.
      queryClient.invalidateQueries({ queryKey: queryKeys.friends(userId ?? "anonymous") });
      queryClient.invalidateQueries({ queryKey: queryKeys.feed() });
      queryClient.invalidateQueries({ queryKey: ["profile-card"] });
      queryClient.invalidateQueries({ queryKey: queryKeys.inbox(userId ?? "anonymous") });
    },
  });
}

export function useProfileSearch(query: string) {
  const userId = useCurrentUserId();
  const { edges } = useFriends();
  const term = query.trim();

  return useQuery({
    queryKey: queryKeys.profileSearch(term),
    enabled: isSupabaseConfigured() && Boolean(userId) && term.length >= 2,
    queryFn: () => searchProfiles(getSupabaseBrowserClient(), term, userId!, edges),
  });
}

export function useSendFriendRequest() {
  const userId = useCurrentUserId();
  const mutation = useMutation<unknown, Error, FriendRequestVariables>({
    mutationKey: mutationKeys.sendFriendRequest,
  });

  return {
    ...mutation,
    send: (addresseeId: string) => {
      if (!userId) return false;
      mutation.mutate({ userId, addresseeId });
      return true;
    },
  };
}

export function useRespondToFriendRequest() {
  const userId = useCurrentUserId();
  const mutation = useMutation<unknown, Error, RespondFriendVariables>({
    mutationKey: mutationKeys.respondFriendRequest,
  });

  return {
    ...mutation,
    respond: (
      friendshipId: string,
      status: Extract<FriendshipStatus, "accepted" | "declined">,
    ) => {
      if (!userId) return false;
      mutation.mutate({ friendshipId, userId, status });
      return true;
    },
  };
}

export function useRemoveFriend() {
  const userId = useCurrentUserId();
  const mutation = useMutation<unknown, Error, RemoveFriendVariables>({
    mutationKey: mutationKeys.removeFriend,
  });

  return {
    ...mutation,
    remove: (friendshipId: string) => {
      if (!userId) return false;
      mutation.mutate({ friendshipId, userId });
      return true;
    },
  };
}

export function useNudgesSentToday() {
  const userId = useCurrentUserId();
  const timeZone = useTimeZone();
  const today = todayKey(timeZone);

  return useQuery({
    queryKey: [...queryKeys.nudgesSentToday(userId ?? "anonymous"), today],
    enabled: isSupabaseConfigured() && Boolean(userId),
    queryFn: () => fetchNudgesSentToday(getSupabaseBrowserClient(), userId!, today),
  });
}

export function useSendNudge() {
  return useMutation<unknown, Error, SendNudgeVariables>({
    mutationKey: mutationKeys.sendNudge,
  });
}

export function useUnreadNudges() {
  const userId = useCurrentUserId();

  return useQuery({
    queryKey: queryKeys.nudgesReceived(userId ?? "anonymous"),
    enabled: isSupabaseConfigured() && Boolean(userId),
    queryFn: () => fetchUnreadNudges(getSupabaseBrowserClient(), userId!),
  });
}

export function useMarkNudgesRead() {
  const userId = useCurrentUserId();
  const queryClient = useQueryClient();
  const key = queryKeys.nudgesReceived(userId ?? "anonymous");

  return useMutation<unknown, Error, string[], { previous?: ReceivedNudge[] }>({
    mutationFn: async (nudgeIds) => markNudgesRead(getSupabaseBrowserClient(), nudgeIds),
    onMutate: async (nudgeIds) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<ReceivedNudge[]>(key);
      queryClient.setQueryData<ReceivedNudge[]>(key, (current) =>
        (current ?? []).filter((nudge) => !nudgeIds.includes(nudge.id)),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: key });
    },
  });
}

export function useNudgesRealtime() {
  const userId = useCurrentUserId();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isSupabaseConfigured() || !userId) return;

    const client = getSupabaseBrowserClient();
    const channel = client
      .channel(`nudges-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "nudges",
          filter: `receiver_id=eq.${userId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.nudgesReceived(userId) });
        },
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [userId, queryClient]);
}

const SHARED_STREAK_WINDOW_DAYS = 120;

export function useFriendActiveDates(friendId: string | null) {
  const timeZone = useTimeZone();
  const since = shiftDateKey(todayKey(timeZone), -(SHARED_STREAK_WINDOW_DAYS - 1));

  return useQuery({
    queryKey: queryKeys.friendActiveDates(friendId ?? "none"),
    enabled: isSupabaseConfigured() && Boolean(friendId),
    queryFn: () => fetchFriendActiveDates(getSupabaseBrowserClient(), friendId!, since),
  });
}

export function useFriendsActivityToday() {
  const timeZone = useTimeZone();
  const { friends } = useFriends();
  const userId = useCurrentUserId();
  const friendIds = useMemo(() => friends.map((edge) => edge.profile.id), [friends]);

  return useQuery({
    queryKey: [...queryKeys.friendsActivityToday(userId ?? "anonymous"), friendIds.length],
    enabled: isSupabaseConfigured() && friendIds.length > 0,
    queryFn: () =>
      fetchFriendsActivityToday(getSupabaseBrowserClient(), friendIds, todayKey(timeZone)),
  });
}
