import type { ActivityColor } from "@/lib/activities/colors";
import type { ActivityUnit } from "@/lib/activities/units";

export type ActivityVisibility = "private" | "friends" | "custom";

export type ActivityInputMode = "counter" | "duration" | "check" | "amount";

export type ReactionType = "fire" | "clap" | "heart" | "laugh" | "muscle";

export const REACTION_TYPES: ReactionType[] = ["fire", "clap", "heart", "laugh", "muscle"];

export type FriendshipStatus = "pending" | "accepted" | "declined" | "blocked";

export type Profile = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  timezone: string;
  locale: string;
  created_at: string;
  // null mientras nadie lo haya cambiado a mano: el que trae la cuenta al
  // crearse sale del correo y no lo eligio nadie.
  username_changed_at: string | null;
};

export type Activity = {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: ActivityColor;
  unit: ActivityUnit;
  step: number;
  daily_target: number | null;
  target_period: "day" | "week";
  reminder_at: string | null;
  position: number;
  visibility: ActivityVisibility;
  input_mode: ActivityInputMode;
  quick_values: number[];
  is_archived: boolean;
};

export type ActiveSession = {
  id: string;
  user_id: string;
  activity_id: string;
  started_at: string;
};

export type ActivityLog = {
  id: string;
  activity_id: string;
  user_id: string;
  amount: number;
  note: string | null;
  photo_url: string | null;
  logged_at: string;
  local_date: string;
};

export type FeedReaction = {
  id: string;
  type: ReactionType;
  user_id: string;
};

export type CommentAuthor = Pick<Profile, "id" | "username" | "display_name" | "avatar_url">;

export type FeedComment = {
  id: string;
  log_id: string;
  user_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  // null en la raiz del hilo. Solo hay un nivel: una respuesta a una respuesta
  // cuelga del mismo padre y se distingue por reply_to.
  parent_id: string | null;
  reply_to: Pick<Profile, "username" | "display_name"> | null;
  author: CommentAuthor;
};

// La raiz con sus respuestas ya ordenadas, que es como se pinta y como se
// decide a quien avisar.
export type CommentThread = {
  root: FeedComment;
  replies: FeedComment[];
};

export const MAX_COMMENT_LENGTH = 280;

export type FeedEntry = {
  id: string;
  user_id: string;
  amount: number;
  note: string | null;
  photo_url: string | null;
  logged_at: string;
  author: Pick<Profile, "username" | "display_name" | "avatar_url">;
  activity: Pick<Activity, "id" | "name" | "icon" | "color" | "unit">;
  reactions: FeedReaction[];
  comment_count: number;
};

export type FriendEdge = {
  friendshipId: string;
  status: FriendshipStatus;
  direction: "outgoing" | "incoming";
  profile: Profile;
};

export type ReceivedNudge = {
  id: string;
  sentOn: string;
  createdAt: string;
  sender: Profile;
};

export type SearchResult = {
  profile: Profile;
  relation: "none" | "pending_out" | "pending_in" | "accepted" | "blocked";
};

export type EventMemberStatus = "invited" | "going" | "declined";

export const EVENT_MEMBER_STATUSES: EventMemberStatus[] = ["going", "invited", "declined"];

export type EventPerson = Pick<Profile, "id" | "username" | "display_name" | "avatar_url">;

export type EventMember = {
  event_id: string;
  user_id: string;
  status: EventMemberStatus;
  profile: EventPerson;
};

export type EventSummary = {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  icon: string;
  color: ActivityColor;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  members: EventMember[];
  photo_count: number;
};

export type EventPhoto = {
  id: string;
  event_id: string;
  user_id: string;
  photo_url: string;
  caption: string | null;
  created_at: string;
  author: EventPerson | null;
};
