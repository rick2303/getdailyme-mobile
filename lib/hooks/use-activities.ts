

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  fetchActivities,
  fetchActivityShares,
  reorderActivities,
  type ActivityInput,
} from "@/lib/api/activities";
import type { Activity } from "@/lib/api/types";
import { useCurrentUserId } from "@/lib/auth/provider";
import { mutationKeys, queryKeys } from "@/lib/query/keys";
import type {
  CreateActivityVariables,
  DeleteActivityVariables,
  ReplaceSharesVariables,
  UpdateActivityVariables,
} from "@/lib/query/offline-mutations";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { newId } from "@/lib/utils/ids";

export function useActivities() {
  const userId = useCurrentUserId();

  return useQuery({
    queryKey: queryKeys.activities(userId ?? "anonymous"),
    enabled: isSupabaseConfigured() && Boolean(userId),
    queryFn: () => fetchActivities(getSupabaseBrowserClient(), userId!),
  });
}

export function useActiveActivities() {
  const query = useActivities();
  return {
    ...query,
    data: query.data?.filter((activity) => !activity.is_archived) ?? [],
    archived: query.data?.filter((activity) => activity.is_archived) ?? [],
  };
}

function useActivityCache() {
  const userId = useCurrentUserId();
  const queryClient = useQueryClient();
  const key = queryKeys.activities(userId ?? "anonymous");

  return {
    userId,
    snapshot: () => queryClient.getQueryData<Activity[]>(key),
    write: (updater: (current: Activity[]) => Activity[]) =>
      queryClient.setQueryData<Activity[]>(key, (current) => updater(current ?? [])),
    restore: (previous?: Activity[]) => {
      if (previous) queryClient.setQueryData(key, previous);
    },
  };
}

export function useCreateActivity() {
  const cache = useActivityCache();

  const mutation = useMutation<
    unknown,
    Error,
    CreateActivityVariables,
    { previous?: Activity[] }
  >({
    mutationKey: mutationKeys.createActivity,
    onMutate: (variables) => {
      const previous = cache.snapshot();
      cache.write((current) => [
        ...current,
        {
          id: variables.id,
          user_id: variables.userId,
          position: variables.position,
          is_archived: false,
          ...variables.input,
        },
      ]);
      return { previous };
    },
    onError: (_error, _variables, context) => cache.restore(context?.previous),
  });

  const createActivity = (input: ActivityInput, position: number) => {
    if (!cache.userId) return null;
    const id = newId();
    mutation.mutate({ id, userId: cache.userId, input, position });
    return id;
  };

  return { ...mutation, createActivity };
}

export function useUpdateActivity() {
  const cache = useActivityCache();

  return useMutation<unknown, Error, UpdateActivityVariables, { previous?: Activity[] }>({
    mutationKey: mutationKeys.updateActivity,
    onMutate: (variables) => {
      const previous = cache.snapshot();
      cache.write((current) =>
        current.map((item) =>
          item.id === variables.activityId ? { ...item, ...variables.patch } : item,
        ),
      );
      return { previous };
    },
    onError: (_error, _variables, context) => cache.restore(context?.previous),
  });
}

export function useDeleteActivity() {
  const cache = useActivityCache();

  return useMutation<unknown, Error, DeleteActivityVariables, { previous?: Activity[] }>({
    mutationKey: mutationKeys.deleteActivity,
    onMutate: (variables) => {
      const previous = cache.snapshot();
      cache.write((current) => current.filter((item) => item.id !== variables.activityId));
      return { previous };
    },
    onError: (_error, _variables, context) => cache.restore(context?.previous),
  });
}

export function useReorderActivities() {
  const cache = useActivityCache();

  return useMutation<unknown, Error, string[], { previous?: Activity[] }>({
    mutationFn: (orderedIds) => reorderActivities(getSupabaseBrowserClient(), orderedIds),
    onMutate: (orderedIds) => {
      const previous = cache.snapshot();
      cache.write((current) => {
        const byId = new Map(current.map((activity) => [activity.id, activity]));
        const reordered = orderedIds
          .map((id, position) => {
            const activity = byId.get(id);
            return activity ? { ...activity, position } : null;
          })
          .filter((activity): activity is Activity => activity !== null);
        const missing = current.filter((activity) => !orderedIds.includes(activity.id));
        return [...reordered, ...missing];
      });
      return { previous };
    },
    onError: (_error, _variables, context) => cache.restore(context?.previous),
  });
}

export function useActivityShares(activityId: string | null) {
  return useQuery({
    queryKey: queryKeys.activityShares(activityId ?? "none"),
    enabled: isSupabaseConfigured() && Boolean(activityId),
    queryFn: () => fetchActivityShares(getSupabaseBrowserClient(), activityId!),
  });
}

export function useReplaceActivityShares() {
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, ReplaceSharesVariables>({
    mutationKey: mutationKeys.replaceShares,
    onMutate: ({ activityId, friendIds }) => {
      queryClient.setQueryData(queryKeys.activityShares(activityId), friendIds);
    },
  });
}
