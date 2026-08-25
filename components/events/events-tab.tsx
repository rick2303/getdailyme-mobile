import { CalendarPlus, ChevronLeft, ChevronRight } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import { EventDetailSheet } from '@/components/events/event-detail-sheet'
import { EventEditorSheet } from '@/components/events/event-editor-sheet'
import { useCountdownLabel } from '@/components/events/countdown'
import { Avatar } from '@/components/ui/avatar'
import { Button, IconButton } from '@/components/ui/button'
import { EmptyState, SkeletonTile } from '@/components/ui/feedback'
import { Segmented } from '@/components/ui/segmented'
import { ActivityIcon } from '@/components/activities/activity-icon'
import { SHADOW_TILE, useActivityHex, useThemeColors, withTint } from '@/constants/colors'
import { useI18n } from '@/i18n/provider'
import type { EventSummary } from '@/lib/api/types'
import { useTimeZone } from '@/lib/auth/provider'
import {
  buildMonthGrid,
  eventsByDateKey,
  monthLabelDate,
  monthOf,
  shiftMonth,
  weekdayLabels,
  type CalendarMonth,
} from '@/lib/events/calendar'
import { useEvents } from '@/lib/hooks/use-events'
import { formatDateRange, formatMonthYear, todayKey } from '@/lib/utils/dates'

// La pestaña de eventos de la web: vista lista/calendario, proximos y
// recuerdos, y la ficha de detalle con RSVP y fotos.
type EventView = 'list' | 'calendar'

export function EventsTab() {
  const { t } = useI18n()
  const colors = useThemeColors()
  const { events, upcoming, past, isLoading } = useEvents()

  const [view, setView] = useState<EventView>('list')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editing, setEditing] = useState<EventSummary | null>(null)
  const [creating, setCreating] = useState(false)

  if (isLoading) {
    return (
      <View className="gap-3 px-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <SkeletonTile key={index} className="h-28" />
        ))}
      </View>
    )
  }

  const isEmpty = upcoming.length === 0 && past.length === 0

  return (
    <View className="gap-5">
      <View className="px-4">
        <Segmented
          value={view}
          options={[
            { value: 'list', label: t('events.viewList') },
            { value: 'calendar', label: t('events.viewCalendar') },
          ]}
          onChange={setView}
        />
      </View>

      {view === 'calendar' ? (
        <EventsCalendar events={events} onOpen={(event) => setSelectedId(event.id)} />
      ) : isEmpty ? (
        <EmptyState
          icon={<CalendarPlus size={28} color={colors.textSubtle} />}
          title={t('events.emptyTitle')}
          body={t('events.emptyBody')}
          action={
            <Button
              title={t('events.createCta')}
              icon={<CalendarPlus size={18} color="#fff" />}
              onPress={() => setCreating(true)}
            />
          }
        />
      ) : (
        <View className="gap-6 px-4">
          <EventSection
            title={t('events.upcomingTitle')}
            events={upcoming}
            onOpen={(event) => setSelectedId(event.id)}
          />
          <EventSection
            title={t('events.memoriesTitle')}
            events={past}
            past
            onOpen={(event) => setSelectedId(event.id)}
          />
          <Button
            title={t('events.createCta')}
            variant="secondary"
            fullWidth
            icon={<CalendarPlus size={18} color={colors.text} />}
            onPress={() => setCreating(true)}
          />
        </View>
      )}

      <EventDetailSheet
        eventId={selectedId}
        onClose={() => setSelectedId(null)}
        onEdit={(event) => {
          setSelectedId(null)
          setEditing(event)
        }}
      />

      <EventEditorSheet
        open={creating || editing !== null}
        event={editing}
        onClose={() => {
          setCreating(false)
          setEditing(null)
        }}
      />
    </View>
  )
}

function EventSection({
  title,
  events,
  past = false,
  onOpen,
}: {
  title: string
  events: EventSummary[]
  past?: boolean
  onOpen: (event: EventSummary) => void
}) {
  if (events.length === 0) return null

  return (
    <View className="gap-2.5">
      <Text className="px-1 text-sm font-bold uppercase tracking-wide text-text-muted dark:text-text-muted-dark">
        {title}
      </Text>
      {events.map((event) => (
        <EventCard key={event.id} event={event} past={past} onOpen={() => onOpen(event)} />
      ))}
    </View>
  )
}

function EventCard({
  event,
  past,
  onOpen,
}: {
  event: EventSummary
  past: boolean
  onOpen: () => void
}) {
  const { locale } = useI18n()
  const timeZone = useTimeZone()
  const countdownLabel = useCountdownLabel()
  const hex = useActivityHex(event.color)

  const going = event.members.filter((member) => member.status === 'going')

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={event.title}
      onPress={onOpen}
      style={SHADOW_TILE}
      className={
        past
          ? 'gap-3 rounded-3xl border border-border bg-surface p-4 opacity-80 active:opacity-60 dark:border-border-dark dark:bg-surface-dark'
          : 'gap-3 rounded-3xl border border-border bg-surface p-4 active:opacity-80 dark:border-border-dark dark:bg-surface-dark'
      }
    >
      <View className="flex-row items-center gap-3">
        <ActivityIcon icon={event.icon} color={event.color} size="md" />
        <View className="min-w-0 flex-1">
          <Text className="text-[15px] font-bold text-text dark:text-text-dark" numberOfLines={1}>
            {event.title}
          </Text>
          <Text className="mt-0.5 text-xs text-text-muted dark:text-text-muted-dark" numberOfLines={1}>
            {formatDateRange(event.starts_at, event.ends_at, event.all_day, locale, timeZone)}
          </Text>
        </View>
        {!past ? (
          <View
            className="rounded-full px-2.5 py-1"
            style={{ backgroundColor: withTint(hex) }}
          >
            <Text className="text-[11px] font-bold" style={{ color: hex }}>
              {countdownLabel(event)}
            </Text>
          </View>
        ) : null}
      </View>

      {going.length > 0 ? (
        <View className="flex-row items-center">
          {going.slice(0, 5).map((member, index) => (
            <View key={member.user_id} style={{ marginLeft: index === 0 ? 0 : -8 }}>
              <Avatar
                name={member.profile.display_name}
                src={member.profile.avatar_url}
                size="sm"
                className="border-2 border-surface dark:border-surface-dark"
              />
            </View>
          ))}
          {going.length > 5 ? (
            <Text className="ml-2 text-xs font-semibold text-text-muted dark:text-text-muted-dark">
              +{going.length - 5}
            </Text>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  )
}

function EventsCalendar({
  events,
  onOpen,
}: {
  events: EventSummary[]
  onOpen: (event: EventSummary) => void
}) {
  const { t, locale } = useI18n()
  const colors = useThemeColors()
  const timeZone = useTimeZone()
  const today = todayKey(timeZone)

  const [month, setMonth] = useState<CalendarMonth>(() => monthOf(today))
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  const grid = useMemo(() => buildMonthGrid(month, today), [month, today])
  const byDate = useMemo(() => eventsByDateKey(events, timeZone), [events, timeZone])
  const labels = weekdayLabels(locale)

  const dayEvents = selectedDay ? (byDate.get(selectedDay) ?? []) : []

  return (
    <View className="gap-3 px-4">
      <View className="flex-row items-center justify-between">
        <IconButton label={t('events.calendarPrevMonth')} onPress={() => setMonth((m) => shiftMonth(m, -1))}>
          <ChevronLeft size={20} color={colors.textMuted} />
        </IconButton>
        <Text className="text-base font-bold capitalize text-text dark:text-text-dark">
          {formatMonthYear(monthLabelDate(month), locale)}
        </Text>
        <IconButton label={t('events.calendarNextMonth')} onPress={() => setMonth((m) => shiftMonth(m, 1))}>
          <ChevronRight size={20} color={colors.textMuted} />
        </IconButton>
      </View>

      <View style={SHADOW_TILE} className="rounded-3xl border border-border bg-surface p-3 dark:border-border-dark dark:bg-surface-dark">
        <View className="flex-row">
          {labels.map((label, index) => (
            <Text
              key={index}
              className="flex-1 text-center text-[10px] font-bold uppercase text-text-subtle dark:text-text-subtle-dark"
            >
              {label}
            </Text>
          ))}
        </View>
        <View className="flex-row flex-wrap pt-1">
          {grid.map((day) => {
            const hasEvents = (byDate.get(day.key)?.length ?? 0) > 0
            const isSelected = selectedDay === day.key
            return (
              <Pressable
                key={day.key}
                accessibilityRole="button"
                onPress={() => setSelectedDay(isSelected ? null : day.key)}
                className="items-center py-1 active:opacity-70"
                style={{ width: `${100 / 7}%` }}
              >
                <View
                  className={
                    isSelected
                      ? 'h-9 w-9 items-center justify-center rounded-full bg-brand'
                      : day.isToday
                        ? 'h-9 w-9 items-center justify-center rounded-full bg-brand-soft dark:bg-brand-soft-dark'
                        : 'h-9 w-9 items-center justify-center rounded-full'
                  }
                >
                  <Text
                    maxFontSizeMultiplier={1.2}
                    className="text-sm font-semibold"
                    style={{
                      color: isSelected
                        ? '#fff'
                        : day.inMonth
                          ? day.isToday
                            ? colors.brand
                            : colors.text
                          : colors.textSubtle,
                    }}
                  >
                    {day.dayOfMonth}
                  </Text>
                </View>
                <View
                  className="mt-0.5 h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: hasEvents ? colors.brand : 'transparent' }}
                />
              </Pressable>
            )
          })}
        </View>
      </View>

      {dayEvents.map((event) => (
        <EventCard key={event.id} event={event} past={false} onOpen={() => onOpen(event)} />
      ))}
    </View>
  )
}
