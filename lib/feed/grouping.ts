import type { FeedEntry } from "@/lib/api/types";

export const GROUP_WINDOW_MS = 30 * 60 * 1000;

export type FeedGroup = {
  entry: FeedEntry;
  count: number;
  amount: number;
};

export function groupFeedEntries(entries: FeedEntry[]): FeedGroup[] {
  const groups: FeedGroup[] = [];

  for (const entry of entries) {
    const current = groups[groups.length - 1];
    const belongsToCurrent =
      current !== undefined &&
      current.entry.user_id === entry.user_id &&
      current.entry.activity.id === entry.activity.id &&
      new Date(current.entry.logged_at).getTime() - new Date(entry.logged_at).getTime() <=
        GROUP_WINDOW_MS;

    if (belongsToCurrent) {
      current.count += 1;
      current.amount += entry.amount;
      continue;
    }

    groups.push({ entry, count: 1, amount: entry.amount });
  }

  return groups;
}
