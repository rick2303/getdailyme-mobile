import type { CreateLogVariables } from '@/lib/query/offline-mutations'
import { toLocalDateKey } from '@/lib/utils/dates'
import type { WidgetActivityPayload, WidgetPayload } from '@/lib/widget'

export type WidgetLogEntry = {
  id: string
  activity_id: string
  user_id: string
  amount: number
  logged_at: string
  local_date: string
  sent: boolean
}

export type WidgetDrainPlan = {
  toCreate: WidgetLogEntry[]
  toConfirm: WidgetLogEntry[]
  toRemove: string[]
  settled: boolean
}

export function isReached(activity: WidgetActivityPayload): boolean {
  if (activity.mode === 'check') return activity.amount > 0
  return activity.target !== null && activity.amount >= activity.target
}

export function canLogFromWidget(activity: WidgetActivityPayload): boolean {
  if (!activity.id || activity.step <= 0) return false
  return activity.mode !== 'check' || activity.amount === 0
}

function progressOf(activity: WidgetActivityPayload): number {
  if (activity.mode === 'check') return activity.amount > 0 ? 1 : 0
  if (!activity.target || activity.target <= 0) return 0
  return Math.min(1, activity.amount / activity.target)
}

export function payloadForDay(payload: WidgetPayload, today: string): WidgetPayload {
  if (!payload.day || payload.day === today) return payload
  return {
    ...payload,
    day: today,
    done: 0,
    complete: false,
    activities: payload.activities.map((activity) => ({ ...activity, amount: 0, progress: 0 })),
  }
}

export function bumpWidgetPayload(
  payload: WidgetPayload,
  activityId: string,
  today: string,
): WidgetPayload {
  const base = payloadForDay(payload, today)
  const index = base.activities.findIndex((activity) => activity.id === activityId)
  if (index < 0) return base

  const current = base.activities[index]!
  if (!canLogFromWidget(current)) return base

  const amount = current.amount + current.step
  const next = { ...current, amount }
  const bumped = { ...next, progress: progressOf(next) }
  const done = base.done + (!isReached(current) && isReached(bumped) ? 1 : 0)

  const activities = [...base.activities]
  activities[index] = bumped

  return {
    ...base,
    day: today,
    done,
    complete: base.due > 0 && done >= base.due,
    activities,
  }
}

export function buildWidgetLog(options: {
  id: string
  activity: WidgetActivityPayload
  userId: string
  timeZone: string
  now: Date
}): WidgetLogEntry {
  return {
    id: options.id,
    activity_id: options.activity.id,
    user_id: options.userId,
    amount: options.activity.step,
    logged_at: options.now.toISOString(),
    local_date: toLocalDateKey(options.now, options.timeZone),
    sent: false,
  }
}

export function toCreateLogVariables(entry: WidgetLogEntry): CreateLogVariables {
  return {
    id: entry.id,
    activity_id: entry.activity_id,
    user_id: entry.user_id,
    amount: entry.amount,
    note: null,
    photo_url: null,
    logged_at: entry.logged_at,
    local_date: entry.local_date,
  }
}

export function parseWidgetLog(raw: string): WidgetLogEntry | null {
  try {
    const value = JSON.parse(raw) as Partial<WidgetLogEntry>
    if (
      typeof value.id !== 'string' ||
      typeof value.activity_id !== 'string' ||
      typeof value.user_id !== 'string' ||
      typeof value.amount !== 'number' ||
      typeof value.logged_at !== 'string' ||
      typeof value.local_date !== 'string'
    ) {
      return null
    }
    return {
      id: value.id,
      activity_id: value.activity_id,
      user_id: value.user_id,
      amount: value.amount,
      logged_at: value.logged_at,
      local_date: value.local_date,
      sent: value.sent === true,
    }
  } catch {
    return null
  }
}

export function planWidgetDrain(
  entries: WidgetLogEntry[],
  context: {
    userId: string
    knownIds: Set<string>
    inFlightIds: Set<string>
    activityIds?: Set<string>
  },
): WidgetDrainPlan {
  const toCreate: WidgetLogEntry[] = []
  const toConfirm: WidgetLogEntry[] = []
  const toRemove: string[] = []
  const seen = new Set<string>()
  let settled = false

  for (const entry of entries) {
    if (seen.has(entry.id)) continue
    seen.add(entry.id)

    if (
      entry.user_id !== context.userId ||
      (context.activityIds && !context.activityIds.has(entry.activity_id))
    ) {
      toRemove.push(entry.id)
      continue
    }
    if (entry.sent) {
      toRemove.push(entry.id)
      settled = true
      continue
    }
    if (context.inFlightIds.has(entry.id)) continue
    if (context.knownIds.has(entry.id)) {
      toConfirm.push(entry)
      continue
    }
    toCreate.push(entry)
  }

  return { toCreate, toConfirm, toRemove, settled }
}
