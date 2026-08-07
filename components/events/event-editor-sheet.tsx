import DateTimePicker from '@react-native-community/datetimepicker'
import { Check } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, Switch, Text, View } from 'react-native'

import { ActivityIcon } from '@/components/activities/activity-icon'
import { Button } from '@/components/ui/button'
import { TextArea, TextInput } from '@/components/ui/field'
import { Sheet } from '@/components/ui/sheet'
import { useToast } from '@/components/ui/toast'
import { useActivityHex, useThemeColors } from '@/constants/colors'
import { useI18n } from '@/i18n/provider'
import { ACTIVITY_COLORS, type ActivityColor } from '@/lib/activities/colors'
import type { EventSummary } from '@/lib/api/types'
import { useCurrentUserId, useTimeZone } from '@/lib/auth/provider'
import { ICON_CATALOG } from '@/lib/icons/catalog'
import { useCreateEvent, useUpdateEvent } from '@/lib/hooks/use-events'
import { useFriends } from '@/lib/hooks/use-friends'
import { isoToZonedDateKey, isoToZonedTime, todayKey, zonedDateTimeToIso } from '@/lib/utils/dates'
import { haptic } from '@/lib/utils/haptics'

// El editor de eventos de la web: titulo con icono y color, descripcion, todo
// el dia, inicio y fin opcionales, e invitaciones a amistades.
const ICON_CHOICES = ICON_CATALOG.filter((entry) =>
  ['social', 'travel', 'hobby', 'fitness', 'food'].includes(entry.category),
).slice(0, 18)

type PickerTarget = 'startDate' | 'startTime' | 'endDate' | 'endTime' | null

export function EventEditorSheet({
  open,
  event,
  onClose,
}: {
  open: boolean
  event: EventSummary | null
  onClose: () => void
}) {
  const { t, locale } = useI18n()
  const { showToast } = useToast()
  const colors = useThemeColors()
  const userId = useCurrentUserId()
  const timeZone = useTimeZone()
  const { friends } = useFriends()
  const create = useCreateEvent()
  const update = useUpdateEvent()

  const today = todayKey(timeZone)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState('cake')
  const [color, setColor] = useState<ActivityColor>('pink')
  const [allDay, setAllDay] = useState(true)
  const [startDate, setStartDate] = useState(today)
  const [startTime, setStartTime] = useState('18:00')
  const [hasEnd, setHasEnd] = useState(false)
  const [endDate, setEndDate] = useState(today)
  const [endTime, setEndTime] = useState('20:00')
  const [invitees, setInvitees] = useState<string[]>([])
  const [picker, setPicker] = useState<PickerTarget>(null)

  const [lastSession, setLastSession] = useState<string | null>(null)
  const sessionToken = open ? (event?.id ?? 'new') : 'closed'
  if (sessionToken !== lastSession) {
    setLastSession(sessionToken)
    if (open) {
      setTitle(event?.title ?? '')
      setDescription(event?.description ?? '')
      setIcon(event?.icon ?? 'cake')
      setColor(event?.color ?? 'pink')
      setAllDay(event?.all_day ?? true)
      setStartDate(event ? isoToZonedDateKey(event.starts_at, timeZone) : today)
      setStartTime(event && !event.all_day ? isoToZonedTime(event.starts_at, timeZone) : '18:00')
      setHasEnd(Boolean(event?.ends_at))
      setEndDate(event?.ends_at ? isoToZonedDateKey(event.ends_at, timeZone) : today)
      setEndTime(
        event?.ends_at && !event.all_day ? isoToZonedTime(event.ends_at, timeZone) : '20:00',
      )
      setInvitees(
        event
          ? event.members
              .filter((member) => member.user_id !== event.creator_id)
              .map((member) => member.user_id)
          : [],
      )
    }
  }

  const canSave = title.trim().length > 0

  const save = () => {
    if (!canSave || !userId) return

    const starts_at = zonedDateTimeToIso(startDate, allDay ? '00:00' : startTime, timeZone)
    const ends_at = hasEnd
      ? zonedDateTimeToIso(endDate, allDay ? '23:59' : endTime, timeZone)
      : null

    if (ends_at && ends_at < starts_at) {
      showToast(t('events.endBeforeStart'), 'error')
      return
    }

    const input = {
      title: title.trim(),
      description: description.trim() || null,
      icon,
      color,
      starts_at,
      ends_at,
      all_day: allDay,
    }

    haptic('success')
    if (event) {
      update.mutate({
        eventId: event.id,
        userId,
        patch: input,
        invitees,
        currentInvitees: event.members
          .filter((member) => member.user_id !== event.creator_id)
          .map((member) => member.user_id),
      })
    } else if (!create.createEvent(input, invitees)) {
      showToast(t('events.saveError'), 'error')
      return
    }

    showToast(t('events.saved'), 'success')
    onClose()
  }

  const pickerValue = () => {
    if (picker === 'startDate') return new Date(`${startDate}T12:00:00`)
    if (picker === 'endDate') return new Date(`${endDate}T12:00:00`)
    if (picker === 'startTime') return new Date(`2000-01-01T${startTime}:00`)
    return new Date(`2000-01-01T${endTime}:00`)
  }

  const onPicked = (selected: Date | undefined) => {
    const target = picker
    setPicker(null)
    if (!selected || !target) return
    const dateKey = `${selected.getFullYear()}-${String(selected.getMonth() + 1).padStart(2, '0')}-${String(selected.getDate()).padStart(2, '0')}`
    const time = `${String(selected.getHours()).padStart(2, '0')}:${String(selected.getMinutes()).padStart(2, '0')}`
    if (target === 'startDate') setStartDate(dateKey)
    if (target === 'endDate') setEndDate(dateKey)
    if (target === 'startTime') setStartTime(time)
    if (target === 'endTime') setEndTime(time)
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={event ? t('events.editTitle') : t('events.newTitle')}
      closeLabel={t('common.close')}
      footer={
        <Button
          title={t('common.save')}
          size="lg"
          fullWidth
          disabled={!canSave}
          onPress={save}
        />
      }
    >
      <View className="gap-5 pt-2">
        <View className="flex-row items-center gap-3">
          <ActivityIcon icon={icon} color={color} size="md" />
          <View className="flex-1">
            <TextInput
              label={t('events.titleLabel')}
              placeholder={t('events.titlePlaceholder')}
              value={title}
              maxLength={80}
              onChangeText={setTitle}
            />
          </View>
        </View>

        <View className="gap-2">
          <Text className="px-1 text-sm font-semibold text-text-muted dark:text-text-muted-dark">
            {t('events.iconChange')}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {ICON_CHOICES.map((entry) => (
              <Pressable
                key={entry.name}
                accessibilityRole="button"
                accessibilityState={{ selected: icon === entry.name }}
                onPress={() => setIcon(entry.name)}
                className={
                  icon === entry.name
                    ? 'rounded-2xl border-2 border-brand'
                    : 'rounded-2xl border-2 border-transparent'
                }
              >
                <ActivityIcon icon={entry.name} color={color} size="sm" />
              </Pressable>
            ))}
          </View>
        </View>

        <View className="gap-2">
          <Text className="px-1 text-sm font-semibold text-text-muted dark:text-text-muted-dark">
            {t('events.colorLabel')}
          </Text>
          <View className="flex-row flex-wrap gap-2.5">
            {ACTIVITY_COLORS.map((value) => (
              <ColorDot key={value} color={value} selected={color === value} onPress={() => setColor(value)} />
            ))}
          </View>
        </View>

        <TextArea
          label={t('events.descriptionLabel')}
          placeholder={t('events.descriptionPlaceholder')}
          value={description}
          maxLength={280}
          onChangeText={setDescription}
        />

        <View className="flex-row items-center justify-between rounded-2xl bg-surface-sunken px-4 py-3 dark:bg-surface-sunken-dark">
          <Text className="text-sm font-semibold text-text dark:text-text-dark">
            {t('events.allDayLabel')}
          </Text>
          <Switch
            value={allDay}
            onValueChange={setAllDay}
            trackColor={{ true: colors.brand }}
          />
        </View>

        <View className="gap-2">
          <Text className="px-1 text-sm font-semibold text-text-muted dark:text-text-muted-dark">
            {t('events.startLabel')}
          </Text>
          <View className="flex-row gap-2">
            <FieldChip label={startDate} onPress={() => setPicker('startDate')} />
            {!allDay ? <FieldChip label={startTime} onPress={() => setPicker('startTime')} /> : null}
          </View>
        </View>

        <View className="flex-row items-center justify-between rounded-2xl bg-surface-sunken px-4 py-3 dark:bg-surface-sunken-dark">
          <Text className="text-sm font-semibold text-text dark:text-text-dark">
            {t('events.endToggle')}
          </Text>
          <Switch value={hasEnd} onValueChange={setHasEnd} trackColor={{ true: colors.brand }} />
        </View>

        {hasEnd ? (
          <View className="gap-2">
            <Text className="px-1 text-sm font-semibold text-text-muted dark:text-text-muted-dark">
              {t('events.endLabel')}
            </Text>
            <View className="flex-row gap-2">
              <FieldChip label={endDate} onPress={() => setPicker('endDate')} />
              {!allDay ? <FieldChip label={endTime} onPress={() => setPicker('endTime')} /> : null}
            </View>
          </View>
        ) : null}

        {picker ? (
          <DateTimePicker
            value={pickerValue()}
            mode={picker === 'startDate' || picker === 'endDate' ? 'date' : 'time'}
            onChange={(_event, selected) => onPicked(selected)}
          />
        ) : null}

        <View className="gap-2">
          <Text className="px-1 text-sm font-semibold text-text-muted dark:text-text-muted-dark">
            {t('events.inviteLabel')}
          </Text>
          {friends.length === 0 ? (
            <Text className="px-1 text-sm text-text-muted dark:text-text-muted-dark">
              {t('events.inviteEmpty')}
            </Text>
          ) : (
            <View className="gap-1.5">
              {friends.map((edge) => {
                const selected = invitees.includes(edge.profile.id)
                return (
                  <Pressable
                    key={edge.profile.id}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    onPress={() =>
                      setInvitees((current) =>
                        selected
                          ? current.filter((id) => id !== edge.profile.id)
                          : [...current, edge.profile.id],
                      )
                    }
                    className={
                      selected
                        ? 'min-h-11 flex-row items-center justify-between rounded-2xl border border-brand bg-brand-soft px-3 dark:bg-brand-soft-dark'
                        : 'min-h-11 flex-row items-center justify-between rounded-2xl border border-border bg-surface-sunken px-3 dark:border-border-dark dark:bg-surface-sunken-dark'
                    }
                  >
                    <Text
                      className={
                        selected
                          ? 'text-sm font-semibold text-brand dark:text-brand-dark'
                          : 'text-sm font-semibold text-text-muted dark:text-text-muted-dark'
                      }
                      numberOfLines={1}
                    >
                      {edge.profile.display_name}
                    </Text>
                    {selected ? <Check size={16} color={colors.brand} strokeWidth={3} /> : null}
                  </Pressable>
                )
              })}
            </View>
          )}
        </View>
      </View>
    </Sheet>
  )
}

function FieldChip({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="h-11 flex-1 items-center justify-center rounded-2xl border border-border bg-surface-sunken dark:border-border-dark dark:bg-surface-sunken-dark"
    >
      <Text className="text-sm font-semibold text-text dark:text-text-dark">{label}</Text>
    </Pressable>
  )
}

function ColorDot({
  color,
  selected,
  onPress,
}: {
  color: ActivityColor
  selected: boolean
  onPress: () => void
}) {
  const hex = useActivityHex(color)

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={color}
      accessibilityState={{ selected }}
      onPress={onPress}
      className="h-11 w-11 items-center justify-center rounded-full"
      style={{ backgroundColor: hex }}
    >
      {selected ? <Check size={18} color="#fff" strokeWidth={3} /> : null}
    </Pressable>
  )
}
