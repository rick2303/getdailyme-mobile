import type { TranslationKey, TranslationParams } from "@/i18n/translate";
import type { InboxNotification } from "@/lib/api/notifications";
import { isCoupleMood } from "@/lib/couple/moods";

export type InboxCopy = { key: TranslationKey; params: TranslationParams };

type CopySource = Pick<InboxNotification, "type" | "details" | "actor" | "challenge">;

function numberIn(details: Record<string, unknown> | null, name: string): number {
  const value = details?.[name];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function textIn(details: Record<string, unknown> | null, name: string): string {
  const value = details?.[name];
  return typeof value === "string" ? value : "";
}

export function inboxCopy(item: CopySource): InboxCopy {
  const name = item.actor.display_name;
  const title = item.challenge?.title ?? "";

  switch (item.type) {
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
