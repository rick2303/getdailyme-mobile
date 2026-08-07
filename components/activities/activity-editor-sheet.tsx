import DateTimePicker from '@react-native-community/datetimepicker'
import { BellOff, Check, Lock, Trash2, UserRoundCheck, Users } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'

import { ActivityIcon } from '@/components/activities/activity-icon'
import { IconPickerSheet } from '@/components/activities/icon-picker'
import { Avatar } from '@/components/ui/avatar'
import { Button, IconButton } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { TextInput } from '@/components/ui/field'
import { Sheet } from '@/components/ui/sheet'
import { useToast } from '@/components/ui/toast'
import { useActivityHex, useThemeColors } from '@/constants/colors'
import { useI18n } from '@/i18n/provider'
import type { TranslationKey } from '@/i18n/translate'
import { ACTIVITY_COLORS, DEFAULT_ACTIVITY_COLOR, type ActivityColor } from '@/lib/activities/colors'
import {
  ACTIVITY_INPUT_MODES,
  defaultModeForUnit,
  defaultQuickValues,
  formatQuickValues,
  parseQuickValues,
  resolveQuickValues,
} from '@/lib/activities/input-modes'
import { ACTIVITY_UNITS, DEFAULT_ACTIVITY_UNIT, type ActivityUnit } from '@/lib/activities/units'
import type { ActivityInput } from '@/lib/api/activities'
import type { Activity, ActivityVisibility } from '@/lib/api/types'
import { useCurrentUserId } from '@/lib/auth/provider'
import {
  useActivities,
  useActivityShares,
  useCreateActivity,
  useDeleteActivity,
  useReplaceActivityShares,
  useUpdateActivity,
} from '@/lib/hooks/use-activities'
import { useFriends } from '@/lib/hooks/use-friends'
import { DEFAULT_ICON } from '@/lib/icons/catalog'
import { haptic } from '@/lib/utils/haptics'

// El editor completo de la web: icono con buscador, color, unidad, modo de
// registro, valores rapidos, meta con periodo, recordatorio y visibilidad.
const VISIBILITIES: ActivityVisibility[] = ['private', 'friends', 'custom']

const VISIBILITY_ICONS = { private: Lock, friends: Users, custom: UserRoundCheck } as const

type ActivityDraft = ActivityInput & { sharedWith: string[] }

function draftFrom(activity: Activity | null, sharedWith: string[]): ActivityDraft {
  return {
    name: activity?.name ?? '',
    icon: activity?.icon ?? DEFAULT_ICON,
    color: activity?.color ?? DEFAULT_ACTIVITY_COLOR,
    unit: activity?.unit ?? DEFAULT_ACTIVITY_UNIT,
    step: activity?.step ?? 1,
    daily_target: activity?.daily_target ?? null,
    target_period: activity?.target_period ?? 'day',
    reminder_at: activity?.reminder_at ?? null,
    visibility: activity?.visibility ?? 'friends',
    input_mode: activity?.input_mode ?? 'counter',
    quick_values: activity?.quick_values ?? [],
    sharedWith,
  }
}

function reminderToDate(value: string | null): Date {
  const date = new Date(2000, 0, 1, 20, 0, 0)
  if (value) {
    const [hours, minutes] = value.split(':').map(Number)
    if (Number.isFinite(hours) && Number.isFinite(minutes)) date.setHours(hours, minutes)
  }
  return date
}

export function ActivityEditorSheet({
  open,
  activity = null,
  onClose,
}: {
  open: boolean
  activity?: Activity | null
  onClose: () => void
}) {
  const { t, locale } = useI18n()
  const userId = useCurrentUserId()
  const { showToast } = useToast()
  const colors = useThemeColors()
  const { data: activities } = useActivities()
  const { friends } = useFriends()
  const { data: shares } = useActivityShares(activity?.id ?? null)
  const create = useCreateActivity()
  const update = useUpdateActivity()
  const remove = useDeleteActivity()
  const replaceShares = useReplaceActivityShares()

  const [draft, setDraft] = useState<ActivityDraft>(() => draftFrom(activity, shares ?? []))
  const [error, setError] = useState<string | null>(null)
  const [iconPickerOpen, setIconPickerOpen] = useState(false)
  const [timePickerOpen, setTimePickerOpen] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const sessionToken = open ? (activity?.id ?? 'new') : 'closed'
  const sharesToken = shares?.join(',') ?? ''
  const [lastSession, setLastSession] = useState(sessionToken)
  const [lastShares, setLastShares] = useState(sharesToken)

  if (sessionToken !== lastSession) {
    setLastSession(sessionToken)
    setLastShares(sharesToken)
    setDraft(draftFrom(activity, shares ?? []))
    setError(null)
    setTimePickerOpen(false)
  } else if (sharesToken !== lastShares) {
    setLastShares(sharesToken)
    setDraft((current) => ({ ...current, sharedWith: shares ?? [] }))
  }

  const patch = <K extends keyof ActivityDraft>(key: K, value: ActivityDraft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }))

  const save = () => {
    if (draft.name.trim().length === 0) {
      setError(t('activity.nameRequired'))
      return
    }
    if (!userId) return

    const { sharedWith, ...input } = draft
    const cleanInput = { ...input, name: draft.name.trim() }

    let activityId: string | null = activity?.id ?? null

    if (activity) {
      update.mutate({ userId, activityId: activity.id, patch: cleanInput })
    } else {
      const position =
        (activities ?? []).reduce((max, item) => Math.max(max, item.position), -1) + 1
      activityId = create.createActivity(cleanInput, position)
    }

    if (!activityId) {
      showToast(t('common.genericError'), 'error')
      return
    }

    if (cleanInput.visibility === 'custom') {
      replaceShares.mutate({ activityId, friendIds: sharedWith })
    } else if (activity?.visibility === 'custom') {
      replaceShares.mutate({ activityId, friendIds: [] })
    }

    showToast(t('activity.saved'), 'success')
    onClose()
  }

  const confirmDelete = () => {
    if (!activity || !userId) return
    remove.mutate(
      { activityId: activity.id, userId },
      { onError: () => showToast(t('activity.deleteFailed'), 'error') },
    )
    setConfirmingDelete(false)
    onClose()
  }

  const reminderLabel = draft.reminder_at
    ? draft.reminder_at.slice(0, 5)
    : t('activity.reminderEmpty')

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title={activity ? t('activity.editTitle') : t('activity.newTitle')}
        closeLabel={t('common.close')}
        footer={
          <View className="gap-2">
            <Button title={t('common.save')} size="lg" fullWidth onPress={save} />
            {activity ? (
              <Button
                title={t('common.delete')}
                variant="ghost"
                fullWidth
                icon={<Trash2 size={16} color={colors.danger} />}
                onPress={() => setConfirmingDelete(true)}
              />
            ) : null}
          </View>
        }
      >
        <View className="gap-5 pt-2">
          <View className="flex-row items-center gap-3">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('activity.iconChange')}
              onPress={() => setIconPickerOpen(true)}
            >
              <ActivityIcon icon={draft.icon} color={draft.color} size="lg" />
            </Pressable>
            <View className="min-w-0 flex-1">
              <TextInput
                label={t('activity.nameLabel')}
                placeholder={t('activity.namePlaceholder')}
                value={draft.name}
                error={error ?? undefined}
                maxLength={40}
                onChangeText={(text) => {
                  patch('name', text)
                  setError(null)
                }}
              />
            </View>
          </View>

          <View className="gap-2">
            <FieldLabel text={t('activity.colorLabel')} />
            <View className="flex-row flex-wrap gap-2.5">
              {ACTIVITY_COLORS.map((value) => (
                <ColorSwatch
                  key={value}
                  color={value}
                  selected={draft.color === value}
                  onPress={() => {
                    haptic('tap')
                    patch('color', value)
                  }}
                />
              ))}
            </View>
          </View>

          <View className="gap-2">
            <FieldLabel text={t('activity.unitLabel')} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
              {ACTIVITY_UNITS.map((value) => {
                const selected = draft.unit === value
                return (
                  <Pressable
                    key={value}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => {
                      const nextUnit = value as ActivityUnit
                      setDraft((current) => ({
                        ...current,
                        unit: nextUnit,
                        input_mode: defaultModeForUnit(nextUnit),
                        quick_values: defaultQuickValues(nextUnit),
                      }))
                    }}
                    className={
                      selected
                        ? 'rounded-full bg-brand px-3.5 py-2'
                        : 'rounded-full bg-surface-sunken px-3.5 py-2 dark:bg-surface-sunken-dark'
                    }
                  >
                    <Text
                      className={
                        selected
                          ? 'text-sm font-semibold text-white'
                          : 'text-sm font-semibold text-text-muted dark:text-text-muted-dark'
                      }
                    >
                      {t(`units.${value}` as TranslationKey, { count: 2 })}
                    </Text>
                  </Pressable>
                )
              })}
            </ScrollView>
          </View>

          <View className="gap-2">
            <FieldLabel text={t('activity.modeLabel')} />
            <View className="flex-row flex-wrap gap-2">
              {ACTIVITY_INPUT_MODES.map((mode) => {
                const selected = draft.input_mode === mode
                return (
                  <Pressable
                    key={mode}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => patch('input_mode', mode)}
                    className={
                      selected
                        ? 'min-w-[45%] flex-1 rounded-2xl border border-brand bg-brand-soft px-3.5 py-3 dark:bg-brand-soft-dark'
                        : 'min-w-[45%] flex-1 rounded-2xl border border-border bg-surface px-3.5 py-3 dark:border-border-dark dark:bg-surface-dark'
                    }
                  >
                    <Text className="text-sm font-bold text-text dark:text-text-dark">
                      {t(`activity.modes.${mode}` as TranslationKey)}
                    </Text>
                    <Text className="mt-0.5 text-xs leading-snug text-text-muted dark:text-text-muted-dark">
                      {t(`activity.modes.${mode}Help` as TranslationKey)}
                    </Text>
                  </Pressable>
                )
              })}
            </View>
          </View>

          {draft.input_mode === 'duration' || draft.input_mode === 'amount' ? (
            <TextInput
              label={t('activity.quickValuesLabel')}
              hint={t('activity.quickValuesHelp')}
              placeholder={t('activity.quickValuesPlaceholder')}
              keyboardType="numbers-and-punctuation"
              value={formatQuickValues(
                draft.quick_values.length > 0
                  ? draft.quick_values
                  : resolveQuickValues([], draft.unit),
              )}
              onChangeText={(text) => patch('quick_values', parseQuickValues(text))}
            />
          ) : null}

          <View className="flex-row gap-3">
            {draft.input_mode === 'counter' ? (
              <View className="flex-1">
                <TextInput
                  label={t('activity.stepLabel')}
                  keyboardType="number-pad"
                  value={String(draft.step)}
                  onChangeText={(text) => patch('step', Math.max(1, Number(text) || 1))}
                />
              </View>
            ) : null}
            {draft.input_mode === 'check' ? null : (
              <View className="flex-1">
                <TextInput
                  label={t('activity.targetLabel')}
                  keyboardType="number-pad"
                  placeholder={t('activity.noTarget')}
                  value={draft.daily_target ? String(draft.daily_target) : ''}
                  onChangeText={(text) => {
                    const parsed = Number(text)
                    patch('daily_target', text === '' || parsed < 1 ? null : parsed)
                  }}
                />
              </View>
            )}
          </View>

          {draft.input_mode !== 'check' && draft.daily_target ? (
            <View className="gap-2">
              <FieldLabel text={t('activity.targetPeriodLabel')} />
              <View className="flex-row gap-2">
                {(['day', 'week'] as const).map((period) => {
                  const selected = draft.target_period === period
                  return (
                    <Pressable
                      key={period}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => patch('target_period', period)}
                      className={
                        selected
                          ? 'h-11 flex-1 items-center justify-center rounded-2xl border border-brand bg-brand-soft dark:bg-brand-soft-dark'
                          : 'h-11 flex-1 items-center justify-center rounded-2xl border border-border bg-surface-sunken dark:border-border-dark dark:bg-surface-sunken-dark'
                      }
                    >
                      <Text
                        className={
                          selected
                            ? 'text-sm font-semibold text-brand dark:text-brand-dark'
                            : 'text-sm font-semibold text-text-muted dark:text-text-muted-dark'
                        }
                      >
                        {t(period === 'day' ? 'activity.perDay' : 'activity.perWeek')}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            </View>
          ) : null}

          <View className="gap-2">
            <FieldLabel text={t('activity.reminderLabel')} />
            <Text className="px-1 text-xs text-text-subtle dark:text-text-subtle-dark">
              {t('activity.reminderHelp')}
            </Text>
            <View className="flex-row items-center gap-2">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('activity.reminderLabel')}
                onPress={() => setTimePickerOpen(true)}
                className="h-12 flex-1 justify-center rounded-2xl border border-border bg-surface px-4 dark:border-border-dark dark:bg-surface-dark"
              >
                <Text
                  className={
                    draft.reminder_at
                      ? 'text-base font-semibold text-text dark:text-text-dark'
                      : 'text-base text-text-subtle dark:text-text-subtle-dark'
                  }
                >
                  {reminderLabel}
                </Text>
              </Pressable>
              {draft.reminder_at ? (
                <IconButton
                  label={t('activity.reminderClear')}
                  onPress={() => patch('reminder_at', null)}
                >
                  <BellOff size={20} color={colors.textMuted} />
                </IconButton>
              ) : null}
            </View>
            {timePickerOpen ? (
              <DateTimePicker
                value={reminderToDate(draft.reminder_at)}
                mode="time"
                locale={locale}
                onChange={(_event, selected) => {
                  setTimePickerOpen(false)
                  if (selected) {
                    const hours = String(selected.getHours()).padStart(2, '0')
                    const minutes = String(selected.getMinutes()).padStart(2, '0')
                    patch('reminder_at', `${hours}:${minutes}`)
                  }
                }}
              />
            ) : null}
          </View>

          <View className="gap-2">
            <FieldLabel text={t('activity.visibilityLabel')} />
            {VISIBILITIES.map((option) => {
              const Icon = VISIBILITY_ICONS[option]
              const selected = draft.visibility === option
              return (
                <Pressable
                  key={option}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => patch('visibility', option)}
                  className={
                    selected
                      ? 'flex-row items-center gap-3 rounded-2xl border border-brand bg-brand-soft px-4 py-3 dark:bg-brand-soft-dark'
                      : 'flex-row items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 dark:border-border-dark dark:bg-surface-dark'
                  }
                >
                  <Icon size={20} color={selected ? colors.brand : colors.textSubtle} />
                  <View className="min-w-0 flex-1">
                    <Text className="text-sm font-bold text-text dark:text-text-dark">
                      {t(`visibility.${option}` as TranslationKey)}
                    </Text>
                    <Text className="text-xs text-text-muted dark:text-text-muted-dark">
                      {t(`visibility.${option}Help` as TranslationKey)}
                    </Text>
                  </View>
                  {selected ? <Check size={20} color={colors.brand} /> : null}
                </Pressable>
              )
            })}

            {draft.visibility === 'custom' ? (
              <View className="mt-1 gap-1 rounded-2xl bg-surface-sunken p-2 dark:bg-surface-sunken-dark">
                {friends.length === 0 ? (
                  <Text className="px-2 py-3 text-center text-sm text-text-muted dark:text-text-muted-dark">
                    {t('friends.emptyTitle')}
                  </Text>
                ) : (
                  friends.map((edge) => {
                    const checked = draft.sharedWith.includes(edge.profile.id)
                    return (
                      <Pressable
                        key={edge.profile.id}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked }}
                        onPress={() =>
                          patch(
                            'sharedWith',
                            checked
                              ? draft.sharedWith.filter((id) => id !== edge.profile.id)
                              : [...draft.sharedWith, edge.profile.id],
                          )
                        }
                        className="flex-row items-center gap-3 rounded-xl px-2 py-2"
                      >
                        <Avatar name={edge.profile.display_name} src={edge.profile.avatar_url} size="sm" />
                        <View className="min-w-0 flex-1">
                          <Text
                            className="text-sm font-semibold text-text dark:text-text-dark"
                            numberOfLines={1}
                          >
                            {edge.profile.display_name}
                          </Text>
                          <Text
                            className="text-xs text-text-subtle dark:text-text-subtle-dark"
                            numberOfLines={1}
                          >
                            @{edge.profile.username}
                          </Text>
                        </View>
                        <View
                          className={
                            checked
                              ? 'h-5 w-5 items-center justify-center rounded-md bg-brand'
                              : 'h-5 w-5 items-center justify-center rounded-md border border-border-strong dark:border-border-strong-dark'
                          }
                        >
                          {checked ? <Check size={14} color="#fff" strokeWidth={3} /> : null}
                        </View>
                      </Pressable>
                    )
                  })
                )}
                <Text className="px-2 pb-1 pt-1 text-xs text-text-subtle dark:text-text-subtle-dark">
                  {draft.sharedWith.length > 0
                    ? t('visibility.selectedCount', { count: draft.sharedWith.length })
                    : t('visibility.noneSelected')}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </Sheet>

      <IconPickerSheet
        open={iconPickerOpen}
        value={draft.icon}
        color={draft.color}
        onSelect={(icon) => {
          patch('icon', icon)
          setIconPickerOpen(false)
        }}
        onClose={() => setIconPickerOpen(false)}
      />

      <ConfirmDialog
        open={confirmingDelete}
        title={t('activity.deleteTitle', { name: activity?.name ?? '' })}
        body={t('activity.deleteBody')}
        confirmLabel={t('common.delete')}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </>
  )
}

function FieldLabel({ text }: { text: string }) {
  return (
    <Text className="px-1 text-sm font-semibold text-text-muted dark:text-text-muted-dark">
      {text}
    </Text>
  )
}

function ColorSwatch({
  color,
  selected,
  onPress,
}: {
  color: ActivityColor
  selected: boolean
  onPress: () => void
}) {
  const colors = useThemeColors()
  const hex = useActivityHex(color)

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={color}
      accessibilityState={{ selected }}
      onPress={onPress}
      className="h-12 w-12 items-center justify-center rounded-2xl"
      style={{
        backgroundColor: hex,
        borderWidth: selected ? 2 : 0,
        borderColor: colors.text,
      }}
    >
      {selected ? <Check size={20} color="#fff" strokeWidth={3} /> : null}
    </Pressable>
  )
}
