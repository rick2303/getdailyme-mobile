import { STARTER_SUGGESTIONS } from "@/lib/activities/starter";
import type { ActivityUnit } from "@/lib/activities/units";
import type { Activity } from "@/lib/api/types";

export type ChallengeTemplateKey = "water" | "exercise" | "reading" | "meditate";

export type ChallengeTemplate = {
  key: ChallengeTemplateKey;
  days: number;
  names: readonly string[];
  icons: readonly string[];
  unit: ActivityUnit;
  perDay: number;
};

const starterNames = (key: string) => {
  const suggestion = STARTER_SUGGESTIONS.find((item) => item.key === key);
  return suggestion ? Object.values(suggestion.names) : [];
};

const starterIcon = (key: string) => {
  const suggestion = STARTER_SUGGESTIONS.find((item) => item.key === key);
  return suggestion ? [suggestion.icon] : [];
};

export const CHALLENGE_TEMPLATES: readonly ChallengeTemplate[] = [
  { key: "water", days: 7, names: ["agua", "water"], icons: ["glass-water"], unit: "glass", perDay: 8 },
  { key: "exercise", days: 7, names: ["ejercicio", "exercise"], icons: ["dumbbell"], unit: "minute", perDay: 30 },
  { key: "reading", days: 30, names: ["lectura", "reading"], icons: ["book-open"], unit: "page", perDay: 20 },
  {
    key: "meditate",
    days: 14,
    names: starterNames("meditate"),
    icons: starterIcon("meditate"),
    unit: "minute",
    perDay: 10,
  },
];

export type ResolvedChallengeTemplate = {
  key: ChallengeTemplateKey;
  days: number;
  target: number;
  activity: Activity;
};

const normalize = (value: string) => value.trim().toLowerCase();

function findActivity(template: ChallengeTemplate, activities: readonly Activity[]) {
  const names = template.names.map(normalize);
  const usable = activities.filter((activity) => !activity.is_archived);
  return (
    usable.find((activity) => names.includes(normalize(activity.name))) ??
    usable.find((activity) => template.icons.includes(activity.icon))
  );
}

function dailyAmount(template: ChallengeTemplate, activity: Activity): number | null {
  if (activity.daily_target && activity.daily_target > 0) {
    return activity.target_period === "week" ? activity.daily_target / 7 : activity.daily_target;
  }
  return activity.unit === template.unit ? template.perDay : null;
}

export function resolveChallengeTemplates(
  activities: readonly Activity[],
): ResolvedChallengeTemplate[] {
  const used = new Set<string>();
  const resolved: ResolvedChallengeTemplate[] = [];

  for (const template of CHALLENGE_TEMPLATES) {
    const activity = findActivity(template, activities);
    if (!activity || used.has(activity.id)) continue;
    const perDay = dailyAmount(template, activity);
    if (perDay === null) continue;
    used.add(activity.id);
    resolved.push({
      key: template.key,
      days: template.days,
      target: Math.max(1, Math.round(perDay * template.days)),
      activity,
    });
  }

  return resolved;
}
