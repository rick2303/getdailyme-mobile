

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

import {
  deleteEventPhoto,
  fetchEvent,
  fetchEventPhotos,
  fetchEvents,
  uploadEventPhoto,
  type EventInput,
} from "@/lib/api/events";
import type { EventSummary } from "@/lib/api/types";
import { useCurrentUserId } from "@/lib/auth/provider";
import { mutationKeys, queryKeys } from "@/lib/query/keys";
import type {
  CreateEventVariables,
  DeleteEventVariables,
  LeaveEventVariables,
  RespondInviteVariables,
  UpdateEventVariables,
} from "@/lib/query/offline-mutations";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { DAY_MS } from "@/lib/utils/dates";
import { newId } from "@/lib/utils/ids";

import { useNowMs } from "./use-now";

export function eventEndsAtMs(event: EventSummary): number {
  const start = new Date(event.starts_at).getTime();
  const end = event.ends_at ? new Date(event.ends_at).getTime() : start;
  return event.all_day ? end + DAY_MS : end;
}

export function splitEvents(events: EventSummary[], nowMs: number) {
  const upcoming: EventSummary[] = [];
  const past: EventSummary[] = [];

  for (const event of events) {
    if (eventEndsAtMs(event) >= nowMs) upcoming.push(event);
    else past.push(event);
  }

  upcoming.sort(
    (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
  );
  past.sort((a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime());

  return { upcoming, past };
}

export function useEvents() {
  const userId = useCurrentUserId();
  const now = useNowMs();

  const query = useQuery({
    queryKey: queryKeys.events(userId ?? "anonymous"),
    enabled: isSupabaseConfigured() && Boolean(userId),
    queryFn: () => fetchEvents(getSupabaseBrowserClient()),
  });

  const events = useMemo(() => query.data ?? [], [query.data]);
  const { upcoming, past } = useMemo(() => splitEvents(events, now), [events, now]);

  return { ...query, events, upcoming, past };
}

export function useEvent(eventId: string | null) {
  return useQuery({
    queryKey: queryKeys.event(eventId ?? "none"),
    enabled: isSupabaseConfigured() && Boolean(eventId),
    queryFn: () => fetchEvent(getSupabaseBrowserClient(), eventId!),
  });
}

export function useCreateEvent() {
  const userId = useCurrentUserId();

  const mutation = useMutation<unknown, Error, CreateEventVariables>({
    mutationKey: mutationKeys.createEvent,
  });

  const createEvent = (input: EventInput, invitees: string[]) => {
    if (!userId) return null;
    const id = newId();
    mutation.mutate({ id, userId, input, invitees });
    return id;
  };

  return { ...mutation, createEvent };
}

export function useUpdateEvent() {
  return useMutation<unknown, Error, UpdateEventVariables>({
    mutationKey: mutationKeys.updateEvent,
  });
}

export function useDeleteEvent() {
  return useMutation<unknown, Error, DeleteEventVariables>({
    mutationKey: mutationKeys.deleteEvent,
  });
}

export function useRespondToInvite() {
  return useMutation<unknown, Error, RespondInviteVariables>({
    mutationKey: mutationKeys.respondInvite,
  });
}

export function useLeaveEvent() {
  return useMutation<unknown, Error, LeaveEventVariables>({
    mutationKey: mutationKeys.leaveEvent,
  });
}

export function useEventPhotos(eventId: string | null) {
  return useQuery({
    queryKey: queryKeys.eventPhotos(eventId ?? "none"),
    enabled: isSupabaseConfigured() && Boolean(eventId),
    queryFn: () => fetchEventPhotos(getSupabaseBrowserClient(), eventId!),
  });
}

function useInvalidateEvents() {
  const userId = useCurrentUserId();
  const queryClient = useQueryClient();

  return (eventId?: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.events(userId ?? "anonymous") });
    if (eventId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.event(eventId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.eventPhotos(eventId) });
    }
  };
}

export function useUploadEventPhoto() {
  const userId = useCurrentUserId();
  const invalidate = useInvalidateEvents();

  return useMutation({
    mutationFn: ({
      eventId,
      file,
      caption,
    }: {
      eventId: string;
      file: File;
      caption?: string | null;
    }) =>
      uploadEventPhoto(getSupabaseBrowserClient(), eventId, userId!, file, caption ?? null),
    onSuccess: (photo) => invalidate(photo.event_id),
  });
}

export function useDeleteEventPhoto() {
  const invalidate = useInvalidateEvents();

  return useMutation({
    mutationFn: ({
      photoId,
      path,
    }: {
      eventId: string;
      photoId: string;
      path: string;
    }) => deleteEventPhoto(getSupabaseBrowserClient(), photoId, path),
    onSuccess: (_result, variables) => invalidate(variables.eventId),
  });
}
