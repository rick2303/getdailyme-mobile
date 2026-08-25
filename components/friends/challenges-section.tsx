import { Check, History, Pencil, Plus, RotateCcw, Trophy } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { TextInput } from '@/components/ui/field'
import { Spinner } from '@/components/ui/feedback'
import { Sheet } from '@/components/ui/sheet'
import { useToast } from '@/components/ui/toast'
import { useThemeColors } from '@/constants/colors'
import { useI18n } from '@/i18n/provider'
import { challengeDaysLeft, type ChallengeMembership } from '@/lib/api/challenges'
import { useCurrentUserId, useTimeZone } from '@/lib/auth/provider'
import { useActiveActivities } from '@/lib/hooks/use-activities'
import {
  useChallengeStandings,
  useChallenges,
  useCreateChallenge,
  useJoinChallenge,
  useLeaveChallenge,
  useUpdateChallenge,
} from '@/lib/hooks/use-challenges'
import { useFriends } from '@/lib/hooks/use-friends'
import { daysBetweenKeys, shiftDateKey, todayKey } from '@/lib/utils/dates'
import { haptic } from '@/lib/utils/haptics'

// Retos en version movil: activos con clasificacion, invitaciones con eleccion
// de actividad, y creacion con duracion en dias. El historico con revancha
// llega en la fase de pulido.
export function ChallengesSection() {
  const { t } = useI18n()
  const timeZone = useTimeZone()
  const { active, invitations, isLoading } = useChallenges()
  const [creator, setCreator] = useState<{ open: boolean; prefill: ChallengePrefill | null }>({
    open: false,
    prefill: null,
  })
  const [showFinished, setShowFinished] = useState(false)

  const today = todayKey(timeZone)
  const running = active.filter((challenge) => challengeDaysLeft(challenge.ends_on, today) >= 0)
  const finished = active
    .filter((challenge) => challengeDaysLeft(challenge.ends_on, today) < 0)
    .sort((a, b) => b.ends_on.localeCompare(a.ends_on))
    .slice(0, 5)

  const isEmpty = running.length === 0 && invitations.length === 0

  // El historico se pinta tambien cuando no queda ningun reto vivo: antes
  // colgaba solo de la rama con retos activos, asi que al terminarse el ultimo
  // desaparecian el historial y la revancha.
  return (
    <View className="gap-2">
      <SectionHeader onCreate={() => setCreator({ open: true, prefill: null })} />
      {isLoading && isEmpty ? (
        <Spinner className="py-6" />
      ) : isEmpty ? (
        <Text className="px-1 text-sm text-text-muted dark:text-text-muted-dark">
          {t('challenges.empty')}
        </Text>
      ) : null}
      {invitations.map((challenge) => (
        <InvitationCard key={challenge.id} challenge={challenge} />
      ))}
      {running.map((challenge) => (
        <ChallengeCard key={challenge.id} challenge={challenge} />
      ))}

      {finished.length > 0 ? (
        <FinishedChallenges
          finished={finished}
          show={showFinished}
          onToggle={() => setShowFinished((value) => !value)}
          onRematch={(prefill) => setCreator({ open: true, prefill })}
        />
      ) : null}
      <CreateChallengeSheet
        open={creator.open}
        prefill={creator.prefill}
        onClose={() => setCreator({ open: false, prefill: null })}
      />
    </View>
  )
}

function FinishedChallenges({
  finished,
  show,
  onToggle,
  onRematch,
}: {
  finished: ChallengeMembership[]
  show: boolean
  onToggle: () => void
  onRematch: (prefill: ChallengePrefill) => void
}) {
  const { t } = useI18n()
  const colors = useThemeColors()

  return (
    <View className="gap-2">
      <Pressable
        accessibilityRole="button"
        onPress={onToggle}
        hitSlop={{ top: 6, bottom: 6 }}
        className="min-h-10 flex-row items-center gap-2 px-1 active:opacity-70"
      >
        <History size={14} color={colors.textSubtle} />
        <Text className="text-xs font-bold text-text-subtle dark:text-text-subtle-dark">
          {show ? t('challenges.hideFinished') : t('challenges.showFinished', { count: finished.length })}
        </Text>
      </Pressable>
      {show
        ? finished.map((challenge) => (
            <FinishedCard key={challenge.id} challenge={challenge} onRematch={onRematch} />
          ))
        : null}
    </View>
  )
}

function FinishedCard({
  challenge,
  onRematch,
}: {
  challenge: ChallengeMembership
  onRematch: (prefill: ChallengePrefill) => void
}) {
  const { t } = useI18n()
  const colors = useThemeColors()
  const userId = useCurrentUserId()
  const { data: standings } = useChallengeStandings(challenge.id)

  const rows = standings ?? []
  const winner = rows[0]
  const anyoneReached = rows.some((row) => row.total >= challenge.target)

  return (
    <View className="gap-3 rounded-3xl border border-border bg-surface-sunken p-4 dark:border-border-dark dark:bg-surface-sunken-dark">
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text className="text-sm font-bold text-text dark:text-text-dark" numberOfLines={1}>
            {challenge.title}
          </Text>
          <Text className="text-xs text-text-muted dark:text-text-muted-dark">
            {t('challenges.goal', { target: challenge.target })} · {t('challenges.finished')}
          </Text>
        </View>
        <Trophy size={18} color={colors.textSubtle} />
      </View>

      {winner ? (
        <View className="flex-row items-center gap-2.5">
          <Avatar name={winner.display_name} src={winner.avatar_url} size="sm" />
          <Text className="min-w-0 flex-1 text-sm text-text-muted dark:text-text-muted-dark" numberOfLines={1}>
            {anyoneReached
              ? t('challenges.wonBy', {
                  name: winner.user_id === userId ? t('challenges.you') : winner.display_name,
                  total: winner.total,
                })
              : t('challenges.nobodyReached')}
          </Text>
        </View>
      ) : null}

      <Button
        title={t('challenges.rematch')}
        size="sm"
        variant="secondary"
        icon={<RotateCcw size={16} color={colors.text} />}
        onPress={() =>
          onRematch({
            title: challenge.title,
            target: challenge.target,
            days: daysBetweenKeys(challenge.starts_on, challenge.ends_on) + 1,
            activityId: challenge.activity_id,
            friendIds: rows.map((row) => row.user_id).filter((id) => id !== userId),
          })
        }
      />
    </View>
  )
}

function SectionHeader({ onCreate }: { onCreate: () => void }) {
  const { t } = useI18n()
  const colors = useThemeColors()

  return (
    <View className="flex-row items-center justify-between px-1">
      <Text className="text-sm font-bold uppercase tracking-wide text-text dark:text-text-dark">
        {t('challenges.title')}
      </Text>
      <Button
        title={t('challenges.create')}
        size="sm"
        variant="secondary"
        icon={<Plus size={16} color={colors.text} />}
        onPress={onCreate}
      />
    </View>
  )
}

function useDaysLeftLabel(endsOn: string) {
  const { t } = useI18n()
  const timeZone = useTimeZone()
  const left = challengeDaysLeft(endsOn, todayKey(timeZone))

  if (left < 0) return t('challenges.finished')
  if (left === 0) return t('challenges.lastDay')
  return t('challenges.daysLeft', { count: left })
}

function ChallengeCard({ challenge }: { challenge: ChallengeMembership }) {
  const { t } = useI18n()
  const { showToast } = useToast()
  const colors = useThemeColors()
  const userId = useCurrentUserId()
  const { data: standings } = useChallengeStandings(challenge.id)
  const leave = useLeaveChallenge()
  const daysLeft = useDaysLeftLabel(challenge.ends_on)

  const [confirmingLeave, setConfirmingLeave] = useState(false)
  const [editing, setEditing] = useState(false)
  const isCreator = challenge.creator_id === userId

  return (
    <View className="gap-3 rounded-3xl border border-border bg-surface p-4 dark:border-border-dark dark:bg-surface-dark">
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text className="text-sm font-bold text-text dark:text-text-dark" numberOfLines={1}>
            {challenge.title}
          </Text>
          <Text className="text-xs text-text-muted dark:text-text-muted-dark">
            {t('challenges.goal', { target: challenge.target })} · {daysLeft}
          </Text>
        </View>
        {isCreator ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('challenges.editTitle')}
            onPress={() => setEditing(true)}
            hitSlop={8}
            className="h-9 w-9 items-center justify-center rounded-full active:opacity-70"
          >
            <Pencil size={16} color={colors.textMuted} />
          </Pressable>
        ) : null}
        <Trophy size={20} color="#D97706" />
      </View>

      <View className="gap-2">
        {(standings ?? []).map((row, index) => {
          const progress = Math.min(row.total / challenge.target, 1)
          const done = row.total >= challenge.target
          return (
            <View key={row.user_id} className="flex-row items-center gap-3">
              <Text className="w-4 text-xs font-bold text-text-subtle dark:text-text-subtle-dark">
                {index + 1}
              </Text>
              <Avatar name={row.display_name} src={row.avatar_url} size="sm" />
              <View className="min-w-0 flex-1">
                <View className="flex-row items-center gap-1">
                  <Text className="text-xs font-semibold text-text dark:text-text-dark" numberOfLines={1}>
                    {row.user_id === userId ? t('challenges.you') : row.display_name}
                  </Text>
                  {done ? <Check size={14} color={colors.success} strokeWidth={3} /> : null}
                </View>
                <View className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-sunken dark:bg-surface-sunken-dark">
                  <View
                    className={done ? 'h-full bg-success' : 'h-full bg-brand'}
                    style={{ width: `${Math.round(progress * 100)}%` }}
                  />
                </View>
              </View>
              <Text className="text-xs font-bold text-text-muted dark:text-text-muted-dark">
                {row.total}/{challenge.target}
              </Text>
            </View>
          )
        })}
      </View>

      <Button
        title={t('challenges.leave')}
        variant="ghost"
        size="sm"
        disabled={leave.isPending}
        onPress={() => setConfirmingLeave(true)}
      />

      <ConfirmDialog
        open={confirmingLeave}
        title={t('challenges.leaveConfirmTitle')}
        body={t('challenges.leaveConfirmBody')}
        confirmLabel={t('challenges.leave')}
        onConfirm={() => {
          setConfirmingLeave(false)
          leave.mutate(challenge.id, {
            onError: () => showToast(t('common.genericError'), 'error'),
          })
        }}
        onCancel={() => setConfirmingLeave(false)}
      />

      <EditChallengeSheet
        open={editing}
        challenge={challenge}
        onClose={() => setEditing(false)}
      />
    </View>
  )
}

function EditChallengeSheet({
  open,
  challenge,
  onClose,
}: {
  open: boolean
  challenge: ChallengeMembership
  onClose: () => void
}) {
  const { t } = useI18n()
  const { showToast } = useToast()
  const timeZone = useTimeZone()
  const update = useUpdateChallenge()

  const today = todayKey(timeZone)
  const [title, setTitle] = useState(challenge.title)
  const [target, setTarget] = useState(String(challenge.target))
  const [days, setDays] = useState(String(Math.max(1, challengeDaysLeft(challenge.ends_on, today) + 1)))

  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setTitle(challenge.title)
      setTarget(String(challenge.target))
      setDays(String(Math.max(1, challengeDaysLeft(challenge.ends_on, today) + 1)))
    }
  }

  const parsedTarget = Math.max(1, Number(target) || 0)
  const parsedDays = Math.max(1, Number(days) || 0)
  const canSave = title.trim().length > 0 && parsedTarget > 0

  const save = () => {
    if (!canSave) return
    update.mutate(
      {
        challengeId: challenge.id,
        patch: {
          title: title.trim(),
          target: parsedTarget,
          ends_on: shiftDateKey(today, parsedDays - 1),
        },
      },
      {
        onSuccess: () => {
          showToast(t('challenges.edited'), 'success')
          onClose()
        },
        onError: () => showToast(t('common.genericError'), 'error'),
      },
    )
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('challenges.editTitle')}
      closeLabel={t('common.close')}
      footer={
        <Button
          title={update.isPending ? t('common.saving') : t('common.save')}
          size="lg"
          fullWidth
          disabled={!canSave || update.isPending}
          loading={update.isPending}
          onPress={save}
        />
      }
    >
      <View className="gap-4 pt-2">
        <TextInput
          label={t('challenges.titleLabel')}
          value={title}
          maxLength={60}
          onChangeText={setTitle}
        />
        <TextInput
          label={t('challenges.targetLabel')}
          keyboardType="number-pad"
          value={target}
          onChangeText={setTarget}
        />
        <TextInput
          label={t('challenges.daysFromToday')}
          keyboardType="number-pad"
          value={days}
          onChangeText={setDays}
        />
      </View>
    </Sheet>
  )
}

function InvitationCard({ challenge }: { challenge: ChallengeMembership }) {
  const { t } = useI18n()
  const { showToast } = useToast()
  const { data: activities } = useActiveActivities()
  const join = useJoinChallenge()
  const [picking, setPicking] = useState(false)
  const daysLeft = useDaysLeftLabel(challenge.ends_on)

  return (
    <View className="gap-3 rounded-3xl border border-brand bg-brand-soft p-4 dark:bg-brand-soft-dark">
      <View>
        <Text className="text-sm font-bold text-text dark:text-text-dark" numberOfLines={1}>
          {challenge.title}
        </Text>
        <Text className="text-xs text-text-muted dark:text-text-muted-dark">
          {t('challenges.goal', { target: challenge.target })} · {daysLeft}
        </Text>
      </View>

      <Button title={t('challenges.join')} size="sm" onPress={() => setPicking(true)} />

      <Sheet
        open={picking}
        onClose={() => setPicking(false)}
        title={t('challenges.pickActivityTitle')}
        description={t('challenges.pickActivityBody')}
        closeLabel={t('common.close')}
      >
        <View className="gap-1.5 pt-2">
          {(activities ?? []).map((activity) => (
            <Button
              key={activity.id}
              title={activity.name}
              variant="secondary"
              size="lg"
              fullWidth
              disabled={join.isPending}
              onPress={() =>
                join.mutate(
                  { challengeId: challenge.id, activityId: activity.id },
                  {
                    onSuccess: () => setPicking(false),
                    onError: () => showToast(t('common.genericError'), 'error'),
                  },
                )
              }
            />
          ))}
        </View>
      </Sheet>
    </View>
  )
}

const DURATION_PRESETS = [7, 14, 30]

export type ChallengePrefill = {
  title: string
  target: number
  days: number
  activityId: string | null
  friendIds: string[]
}

export function CreateChallengeSheet({
  open,
  prefill,
  clubId = null,
  onClose,
}: {
  open: boolean
  prefill?: ChallengePrefill | null
  clubId?: string | null
  onClose: () => void
}) {
  const { t } = useI18n()
  const { showToast } = useToast()
  const timeZone = useTimeZone()
  const { data: activities } = useActiveActivities()
  const { friends } = useFriends()
  const create = useCreateChallenge()

  const today = todayKey(timeZone)
  const [title, setTitle] = useState('')
  const [target, setTarget] = useState('4')
  const [days, setDays] = useState(7)
  const [activityId, setActivityId] = useState<string | null>(null)
  const [invited, setInvited] = useState<string[]>([])

  // Cada apertura arranca de cero salvo que venga una revancha. Comparando solo
  // el prefill, abrir "crear reto" despues de una revancha reabria la hoja con
  // los datos de la revancha, porque sin prefill no se limpiaba nada.
  const session = open ? (prefill ?? 'blank') : 'closed'
  const [lastSession, setLastSession] = useState<typeof session>('closed')
  if (session !== lastSession) {
    setLastSession(session)
    if (open) {
      setTitle(prefill?.title ?? '')
      setTarget(String(prefill?.target ?? 4))
      setDays(Math.max(1, prefill?.days ?? 7))
      setActivityId(prefill?.activityId ?? null)
      setInvited(prefill?.friendIds ?? [])
    }
  }

  const parsedTarget = Math.max(1, Number(target) || 0)
  const canSave = title.trim().length > 0 && parsedTarget > 0 && activityId !== null

  const submit = () => {
    if (!canSave) return
    create.mutate(
      {
        title: title.trim(),
        target: parsedTarget,
        endsOn: shiftDateKey(today, days - 1),
        activityId: activityId!,
        friendIds: invited,
        clubId,
      },
      {
        onSuccess: () => {
          setTitle('')
          setTarget('4')
          setDays(7)
          setActivityId(null)
          setInvited([])
          onClose()
        },
        onError: () => showToast(t('common.genericError'), 'error'),
      },
    )
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('challenges.createTitle')}
      closeLabel={t('common.close')}
      footer={
        <Button
          title={t('challenges.createCta')}
          size="lg"
          fullWidth
          disabled={!canSave || create.isPending}
          loading={create.isPending}
          onPress={submit}
        />
      }
    >
      <View className="gap-4 pt-2">
        <TextInput
          label={t('challenges.titleLabel')}
          placeholder={t('challenges.titlePlaceholder')}
          value={title}
          onChangeText={setTitle}
        />

        <TextInput
          label={t('challenges.targetLabel')}
          hint={t('challenges.targetHelp')}
          keyboardType="number-pad"
          value={target}
          onChangeText={setTarget}
        />

        <View className="gap-2">
          <Text className="px-1 text-sm font-semibold text-text-muted dark:text-text-muted-dark">
            {t('challenges.endsOnLabel')}
          </Text>
          <View className="flex-row gap-2">
            {DURATION_PRESETS.map((value) => (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityState={{ selected: days === value }}
                onPress={() => setDays(value)}
                className={
                  days === value
                    ? 'h-11 flex-1 items-center justify-center rounded-2xl border border-brand bg-brand-soft dark:bg-brand-soft-dark active:opacity-70'
                    : 'h-11 flex-1 items-center justify-center rounded-2xl border border-border bg-surface-sunken dark:border-border-dark dark:bg-surface-sunken-dark active:opacity-70'
                }
              >
                <Text
                  maxFontSizeMultiplier={1.2}
                  className={
                    days === value
                      ? 'text-sm font-semibold text-brand dark:text-brand-dark'
                      : 'text-sm font-semibold text-text-muted dark:text-text-muted-dark'
                  }
                >
                  {t('challenges.durationPreset', { count: value })}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View className="gap-2">
          <Text className="px-1 text-sm font-semibold text-text-muted dark:text-text-muted-dark">
            {t('challenges.activityLabel')}
          </Text>
          <View className="gap-1.5">
            {(activities ?? []).map((activity) => (
              <SelectRow
                key={activity.id}
                label={activity.name}
                selected={activityId === activity.id}
                onPress={() => setActivityId(activity.id)}
              />
            ))}
          </View>
        </View>

        {friends.length > 0 ? (
          <View className="gap-2">
            <Text className="px-1 text-sm font-semibold text-text-muted dark:text-text-muted-dark">
              {t('challenges.inviteLabel')}
            </Text>
            <View className="gap-1.5">
              {friends.map((edge) => (
                <SelectRow
                  key={edge.profile.id}
                  label={edge.profile.display_name}
                  selected={invited.includes(edge.profile.id)}
                  onPress={() =>
                    setInvited((current) =>
                      current.includes(edge.profile.id)
                        ? current.filter((id) => id !== edge.profile.id)
                        : [...current, edge.profile.id],
                    )
                  }
                />
              ))}
            </View>
          </View>
        ) : null}
      </View>
    </Sheet>
  )
}

function SelectRow({
  label,
  selected,
  onPress,
}: {
  label: string
  selected: boolean
  onPress: () => void
}) {
  const colors = useThemeColors()

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => {
        haptic('tap')
        onPress()
      }}
      className={
        selected
          ? 'min-h-11 flex-row items-center justify-between rounded-2xl border border-brand bg-brand-soft px-3 dark:bg-brand-soft-dark active:opacity-70'
          : 'min-h-11 flex-row items-center justify-between rounded-2xl border border-border bg-surface-sunken px-3 dark:border-border-dark dark:bg-surface-sunken-dark active:opacity-70'
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
        {label}
      </Text>
      {selected ? <Check size={16} color={colors.brand} strokeWidth={3} /> : null}
    </Pressable>
  )
}
