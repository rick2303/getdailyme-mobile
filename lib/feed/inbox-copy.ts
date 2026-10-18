import type { TranslationKey, TranslationParams } from "@/i18n/translate";
import type { InboxNotification } from "@/lib/api/notifications";
import { isCoupleMood } from "@/lib/couple/moods";

export type InboxCopy = { key: TranslationKey; params: TranslationParams };

type CopySource = Pick<InboxNotification, "type" | "details" | "actor" | "challenge"> & {
  activityName?: string | null;
};

// Traduce el nombre crudo de una actividad (las de serie vienen como clave).
type ActivityLabel = (name: string) => string;

// Lo que se agrupa: la misma persona haciendo lo mismo sobre tus cosas.
// Tres "Sofia reacciono a tu registro" seguidos eran tres lineas que decian una
// sola cosa; ahora es "Sofia reacciono a 3 de tus registros".
const GROUPABLE: InboxNotification["type"][] = ["reaction", "comment", "story_reaction"];

export type InboxGroup = {
  lead: InboxNotification;
  ids: string[];
  count: number;
};

export function groupInbox(items: InboxNotification[]): InboxGroup[] {
  const groups: InboxGroup[] = [];
  const byKey = new Map<string, InboxGroup>();

  for (const item of items) {
    if (!GROUPABLE.includes(item.type)) {
      groups.push({ lead: item, ids: [item.id], count: 1 });
      continue;
    }
    const key = `${item.type}:${item.actor.id}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.ids.push(item.id);
      existing.count += 1;
      continue;
    }
    const group = { lead: item, ids: [item.id], count: 1 };
    byKey.set(key, group);
    groups.push(group);
  }

  return groups;
}

export function inboxGroupCopy(group: InboxGroup, label: ActivityLabel = (name) => name): InboxCopy {
  const name = group.lead.actor.display_name;
  if (group.count > 1) {
    if (group.lead.type === "reaction") return { key: "inbox.reaction_many", params: { name, count: group.count } };
    if (group.lead.type === "comment") return { key: "inbox.comment_many", params: { name, count: group.count } };
    if (group.lead.type === "story_reaction") {
      return { key: "inbox.story_reaction_many", params: { name, count: group.count } };
    }
  }
  return inboxCopy(group.lead, label);
}

function numberIn(details: Record<string, unknown> | null, name: string): number {
  const value = details?.[name];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function textIn(details: Record<string, unknown> | null, name: string): string {
  const value = details?.[name];
  return typeof value === "string" ? value : "";
}

export function inboxCopy(item: CopySource, label: ActivityLabel = (name) => name): InboxCopy {
  const name = item.actor.display_name;
  const title = item.challenge?.title ?? "";
  const activity = item.activityName ? label(item.activityName) : null;

  switch (item.type) {
    case "reaction":
      return activity
        ? { key: "inbox.reaction_on", params: { name, activity } }
        : { key: "inbox.reaction", params: { name } };
    case "comment":
      return activity
        ? { key: "inbox.comment_on", params: { name, activity } }
        : { key: "inbox.comment", params: { name } };
    case "challenge_joined":
      return { key: "inbox.challenge_joined", params: { name, title } };
    case "challenge_ending":
      return { key: "inbox.challenge_ending", params: { title } };
    case "challenge_finished": {
      const rank = numberIn(item.details, "rank");
      const members = numberIn(item.details, "members");
      if (members <= 1) {
        return {
          key: "inbox.challenge_finished_solo",
          params: {
            title,
            total: numberIn(item.details, "total"),
            target: numberIn(item.details, "target"),
          },
        };
      }
      if (rank === 1) return { key: "inbox.challenge_won", params: { title, members } };
      return { key: "inbox.challenge_finished", params: { title, rank, members } };
    }
    case "friend_streak_risk": {
      const days = numberIn(item.details, "streak_days");
      const others = numberIn(item.details, "others");
      if (others > 0) {
        return { key: "inbox.friend_streak_risk_more", params: { name, days, count: others } };
      }
      return { key: "inbox.friend_streak_risk", params: { name, days } };
    }
    case "couple_ping":
      return {
        key: "inbox.couple_ping",
        params: { name, count: Math.max(1, numberIn(item.details, "count")) },
      };
    case "couple_mood": {
      const mood = item.details?.mood;
      if (isCoupleMood(mood)) {
        return { key: `inbox.couple_mood.${mood}`, params: { name } };
      }
      return { key: "inbox.couple_mood_generic", params: { name } };
    }
    case "couple_letter":
    case "couple_letter_open":
      return { key: `inbox.${item.type}`, params: { name, title: textIn(item.details, "title") } };
    default:
      return { key: `inbox.${item.type}` as TranslationKey, params: { name } };
  }
}
