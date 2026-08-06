import type { ActivityColor } from "@/lib/activities/colors";
import type { TypedSupabaseClient } from "@/lib/supabase/types";

import { removeEventPhotoFile, uploadEventPhotoFile } from "./storage";
import type {
  EventMember,
  EventMemberStatus,
  EventPerson,
  EventPhoto,
  EventSummary,
} from "./types";

const EVENT_PERSON_COLUMNS = "id, username, display_name, avatar_url";

const UNIQUE_VIOLATION = "23505";

const EVENT_COLUMNS =
  "id, creator_id, title, description, icon, color, starts_at, ends_at, all_day";

const EVENT_SELECT = `
  ${EVENT_COLUMNS},
  members:event_members (
    event_id, user_id, status,
    profile:profiles!event_members_user_id_fkey ( ${EVENT_PERSON_COLUMNS} )
  ),
  photos:event_photos ( id )
`;

const EVENT_PHOTO_SELECT = `
  id, event_id, user_id, photo_url, caption, created_at,
  author:profiles!event_photos_user_id_fkey ( ${EVENT_PERSON_COLUMNS} )
`;

export type EventInput = {
  title: string;
  description: string | null;
  icon: string;
  color: ActivityColor;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
};

type RawEventMember = {
  event_id: string;
  user_id: string;
  status: EventMemberStatus;
  profile: EventPerson | null;
};

type RawEvent = {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  icon: string;
  color: ActivityColor;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  members: RawEventMember[] | null;
  photos: { id: string }[] | null;
};

type RawEventPhoto = {
  id: string;
  event_id: string;
  user_id: string;
  photo_url: string;
  caption: string | null;
  created_at: string;
  author: EventPerson | null;
};

function toMember(row: RawEventMember): EventMember | null {
  if (!row.profile) return null;
  return {
    event_id: row.event_id,
    user_id: row.user_id,
    status: row.status,
    profile: row.profile,
  };
}

function toEventSummary(row: RawEvent): EventSummary {
  return {
    id: row.id,
    creator_id: row.creator_id,
    title: row.title,
    description: row.description,
    icon: row.icon,
    color: row.color,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    all_day: row.all_day,
    members: (row.members ?? [])
      .map(toMember)
      .filter((member): member is EventMember => member !== null),
    photo_count: (row.photos ?? []).length,
  };
}

export async function fetchEvents(client: TypedSupabaseClient): Promise<EventSummary[]> {
  const { data, error } = await client
    .from("events")
    .select(EVENT_SELECT)
    .order("starts_at", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as unknown as RawEvent[]).map(toEventSummary);
}

export async function fetchEvent(
  client: TypedSupabaseClient,
  eventId: string,
): Promise<EventSummary | null> {
  const { data, error } = await client
    .from("events")
    .select(EVENT_SELECT)
    .eq("id", eventId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return toEventSummary(data as unknown as RawEvent);
}

export async function inviteMembers(
  client: TypedSupabaseClient,
  eventId: string,
  userIds: string[],
): Promise<void> {
  if (userIds.length === 0) return;

  const { error } = await client.from("event_members").upsert(
    userIds.map((userId) => ({ event_id: eventId, user_id: userId, status: "invited" as const })),
    { onConflict: "event_id,user_id", ignoreDuplicates: true },
  );

  if (error) throw error;
}

export async function removeMembers(
  client: TypedSupabaseClient,
  eventId: string,
  userIds: string[],
): Promise<void> {
  if (userIds.length === 0) return;

  const { error } = await client
    .from("event_members")
    .delete()
    .eq("event_id", eventId)
    .in("user_id", userIds);

  if (error) throw error;
}

export async function createEvent(
  client: TypedSupabaseClient,
  creatorId: string,
  input: EventInput,
  inviteeIds: string[],
  eventId: string,
): Promise<EventSummary> {
  const { error } = await client
    .from("events")
    .insert({ ...input, id: eventId, creator_id: creatorId });

  if (error && error.code !== UNIQUE_VIOLATION) throw error;

  const { error: creatorError } = await client
    .from("event_members")
    .upsert(
      [{ event_id: eventId, user_id: creatorId, status: "going" as const }],
      { onConflict: "event_id,user_id", ignoreDuplicates: true },
    );

  if (creatorError) throw creatorError;

  await inviteMembers(
    client,
    eventId,
    inviteeIds.filter((id) => id !== creatorId),
  );

  const created = await fetchEvent(client, eventId);
  if (!created) throw new Error("event not found after creation");
  return created;
}

export async function updateEvent(
  client: TypedSupabaseClient,
  eventId: string,
  patch: Partial<EventInput>,
): Promise<EventSummary> {
  const { error } = await client.from("events").update(patch).eq("id", eventId);
  if (error) throw error;

  const updated = await fetchEvent(client, eventId);
  if (!updated) throw new Error("event not found after update");
  return updated;
}

export async function deleteEvent(
  client: TypedSupabaseClient,
  eventId: string,
): Promise<void> {
  const { error } = await client.from("events").delete().eq("id", eventId);
  if (error) throw error;
}

export async function respondToInvite(
  client: TypedSupabaseClient,
  eventId: string,
  userId: string,
  status: Extract<EventMemberStatus, "going" | "declined">,
): Promise<void> {
  const { error } = await client
    .from("event_members")
    .update({ status })
    .eq("event_id", eventId)
    .eq("user_id", userId);

  if (error) throw error;
}

export async function leaveEvent(
  client: TypedSupabaseClient,
  eventId: string,
  userId: string,
): Promise<void> {
  const { error } = await client
    .from("event_members")
    .delete()
    .eq("event_id", eventId)
    .eq("user_id", userId);

  if (error) throw error;
}

export async function fetchEventPhotos(
  client: TypedSupabaseClient,
  eventId: string,
): Promise<EventPhoto[]> {
  const { data, error } = await client
    .from("event_photos")
    .select(EVENT_PHOTO_SELECT)
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return ((data ?? []) as unknown as RawEventPhoto[]).map((row) => ({
    id: row.id,
    event_id: row.event_id,
    user_id: row.user_id,
    photo_url: row.photo_url,
    caption: row.caption,
    created_at: row.created_at,
    author: row.author,
  }));
}

export async function uploadEventPhoto(
  client: TypedSupabaseClient,
  eventId: string,
  userId: string,
  file: File,
  caption: string | null = null,
): Promise<EventPhoto> {
  const path = await uploadEventPhotoFile(client, eventId, userId, file);

  const { data, error } = await client
    .from("event_photos")
    .insert({ event_id: eventId, user_id: userId, photo_url: path, caption })
    .select(EVENT_PHOTO_SELECT)
    .single();

  if (error) {
    await removeEventPhotoFile(client, path);
    throw error;
  }

  const row = data as unknown as RawEventPhoto;
  return {
    id: row.id,
    event_id: row.event_id,
    user_id: row.user_id,
    photo_url: row.photo_url,
    caption: row.caption,
    created_at: row.created_at,
    author: row.author,
  };
}

export async function deleteEventPhoto(
  client: TypedSupabaseClient,
  photoId: string,
  path: string,
): Promise<void> {
  const { error } = await client.from("event_photos").delete().eq("id", photoId);
  if (error) throw error;
  await removeEventPhotoFile(client, path);
}
