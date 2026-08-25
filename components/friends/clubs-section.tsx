import { Crown, Plus, Share2, Ticket, Trophy, Users } from 'lucide-react-native'
import { useState } from 'react'
import { Keyboard, Pressable, Share, Text, View } from 'react-native'

import { ActivityIcon } from '@/components/activities/activity-icon'
import {
  CreateChallengeSheet,
  type ChallengePrefill,
} from '@/components/friends/challenges-section'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { TextInput } from '@/components/ui/field'
import { Sheet } from '@/components/ui/sheet'
import { useToast } from '@/components/ui/toast'
import { SHADOW_TILE, useThemeColors } from '@/constants/colors'
import { useI18n } from '@/i18n/provider'
import type { Club } from '@/lib/api/clubs'
import { useCurrentUserId } from '@/lib/auth/provider'
import {
  useClubRanking,
  useClubs,
  useCreateClub,
  useDeleteClub,
  useJoinClub,
  useLeaveClub,
} from '@/lib/hooks/use-clubs'
import { haptic } from '@/lib/utils/haptics'

// Los clubes: tu gente en un grupo con ranking semanal (solo conteos, la
// privacidad de los registros no cambia) y retos que nacen con todo el club.
export function ClubsSection() {
  const { t } = useI18n()
  const colors = useThemeColors()
  const { data: clubs } = useClubs()

  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)
  const [selected, setSelected] = useState<Club | null>(null)

  const list = clubs ?? []
  const selectedFresh = selected ? (list.find((club) => club.id === selected.id) ?? null) : null

  return (
    <View className="gap-2.5 px-4">
      <Text className="px-1 text-sm font-bold uppercase tracking-wide text-text dark:text-text-dark">
        {t('clubs.title')}
      </Text>

      {list.length === 0 ? (
        <Text className="px-1 text-sm text-text-muted dark:text-text-muted-dark">
          {t('clubs.empty')}
        </Text>
      ) : (
        list.map((club) => (
          <Pressable
            key={club.id}
            accessibilityRole="button"
            accessibilityLabel={club.name}
            onPress={() => setSelected(club)}
            style={({ pressed }) => [SHADOW_TILE, pressed ? { transform: [{ scale: 0.98 }] } : null]}
            className="flex-row items-center gap-3 rounded-3xl border border-border bg-surface p-4 dark:border-border-dark dark:bg-surface-dark"
          >
            <ActivityIcon icon={club.icon} color={club.color} size="md" />
            <View className="min-w-0 flex-1">
              <Text className="text-[15px] font-bold text-text dark:text-text-dark" numberOfLines={1}>
                {club.name}
              </Text>
              <Text className="mt-0.5 text-xs text-text-muted dark:text-text-muted-dark">
                {t('clubs.membersCount', { count: club.members.length })}
              </Text>
            </View>
            <View className="flex-row">
              {club.members.slice(0, 4).map((member, index) => (
                <View key={member.user_id} style={{ marginLeft: index === 0 ? 0 : -8 }}>
                  <Avatar
                    name={member.profile.display_name}
                    src={member.profile.avatar_url}
                    size="sm"
                    className="border-2 border-surface dark:border-surface-dark"
                  />
                </View>
              ))}
            </View>
          </Pressable>
        ))
      )}

      <View className="flex-row gap-2">
        <View className="flex-1">
          <Button
            title={t('clubs.create')}
            variant="secondary"
            size="sm"
            fullWidth
            icon={<Plus size={16} color={colors.text} />}
            onPress={() => setCreating(true)}
          />
        </View>
        <View className="flex-1">
          <Button
            title={t('clubs.join')}
            variant="secondary"
            size="sm"
            fullWidth
            icon={<Ticket size={16} color={colors.text} />}
            onPress={() => setJoining(true)}
          />
        </View>
      </View>

      <CreateClubSheet open={creating} onClose={() => setCreating(false)} />
      <JoinClubSheet open={joining} onClose={() => setJoining(false)} />
      <ClubDetailSheet club={selectedFresh} onClose={() => setSelected(null)} />
    </View>
  )
}

function CreateClubSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n()
  const { showToast } = useToast()
  const create = useCreateClub()

  const [name, setName] = useState('')

  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setName('')
  }

  const save = () => {
    if (name.trim().length === 0) return
    Keyboard.dismiss()
    create.mutate(
      { name: name.trim(), icon: 'users', color: 'blue' },
      {
        onSuccess: () => {
          haptic('success')
          showToast(t('clubs.created'), 'success')
          setName('')
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
      title={t('clubs.create')}
      closeLabel={t('common.close')}
      footer={
        <Button
          title={create.isPending ? t('common.saving') : t('common.save')}
          size="lg"
          fullWidth
          disabled={name.trim().length === 0 || create.isPending}
          loading={create.isPending}
          onPress={save}
        />
      }
    >
      <View className="gap-4 pt-2">
        <TextInput
          label={t('clubs.nameLabel')}
          placeholder={t('clubs.namePlaceholder')}
          value={name}
          maxLength={40}
          onChangeText={setName}
        />
      </View>
    </Sheet>
  )
}

function JoinClubSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n()
  const colors = useThemeColors()
  const { showToast } = useToast()
  const join = useJoinClub()

  const [code, setCode] = useState('')

  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setCode('')
  }

  const submit = () => {
    if (code.trim().length === 0) return
    Keyboard.dismiss()
    join.mutate(code, {
      onSuccess: () => {
        haptic('success')
        showToast(t('clubs.joined'), 'success')
        setCode('')
        onClose()
      },
      onError: () => showToast(t('clubs.badCode'), 'error'),
    })
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('clubs.join')}
      closeLabel={t('common.close')}
      footer={
        <Button
          title={join.isPending ? t('common.loading') : t('clubs.join')}
          size="lg"
          fullWidth
          disabled={code.trim().length === 0 || join.isPending}
          loading={join.isPending}
          onPress={submit}
        />
      }
    >
      <View className="gap-4 pt-2">
        <TextInput
          label={t('clubs.codeLabel')}
          placeholder={t('clubs.codePlaceholder')}
          value={code}
          autoCapitalize="none"
          autoCorrect={false}
          leading={<Ticket size={18} color={colors.textSubtle} />}
          onChangeText={setCode}
        />
      </View>
    </Sheet>
  )
}

function ClubDetailSheet({ club, onClose }: { club: Club | null; onClose: () => void }) {
  const { t } = useI18n()
  const { showToast } = useToast()
  const colors = useThemeColors()
  const userId = useCurrentUserId()

  const ranking = useClubRanking(club?.id ?? null)
  const leave = useLeaveClub()
  const remove = useDeleteClub()

  const [confirming, setConfirming] = useState<'leave' | 'delete' | null>(null)
  const [challenge, setChallenge] = useState<ChallengePrefill | null>(null)

  if (!club) return null

  const isOwner = club.creator_id === userId
  const byUser = new Map(club.members.map((member) => [member.user_id, member]))
  // El ranking se cruza con la lista de miembros en vez de sustituirla: si la
  // consulta solo devuelve a quien registro algo esta semana, el resto seguia
  // sin aparecer, y quien entra hoy al club no se veia en su propio club.
  const counts = new Map((ranking.data ?? []).map((row) => [row.user_id, row.log_count]))
  const rows = club.members
    .map((member) => ({ user_id: member.user_id, log_count: counts.get(member.user_id) ?? 0 }))
    .sort(
      (a, b) =>
        b.log_count - a.log_count ||
        (byUser.get(a.user_id)?.profile.display_name ?? '').localeCompare(
          byUser.get(b.user_id)?.profile.display_name ?? '',
        ),
    )

  const shareCode = async () => {
    haptic('tap')
    try {
      await Share.share({
        message: t('clubs.shareMessage', { name: club.name, code: club.invite_code }),
      })
    } catch {
      // cancelar el menu no es un error
    }
  }

  const clubChallenge = () => {
    setChallenge({
      title: `${club.name}`,
      target: 5,
      days: 7,
      activityId: null,
      friendIds: club.members
        .map((member) => member.user_id)
        .filter((id) => id !== userId),
    })
  }

  return (
    <>
      <Sheet
        open={club !== null}
        onClose={onClose}
        title={club.name}
        description={t('clubs.membersCount', { count: club.members.length })}
        closeLabel={t('common.close')}
        footer={
          <View className="gap-2">
            <Button
              title={t('clubs.clubChallenge')}
              size="lg"
              fullWidth
              icon={<Trophy size={18} color="#fff" />}
              onPress={clubChallenge}
            />
            <View className="flex-row gap-2">
              <View className="flex-1">
                <Button
                  title={t('clubs.shareCode')}
                  variant="secondary"
                  size="sm"
                  fullWidth
                  icon={<Share2 size={16} color={colors.text} />}
                  onPress={() => void shareCode()}
                />
              </View>
              <View className="flex-1">
                <Button
                  title={isOwner ? t('common.delete') : t('clubs.leave')}
                  variant="ghost"
                  size="sm"
                  fullWidth
                  onPress={() => setConfirming(isOwner ? 'delete' : 'leave')}
                />
              </View>
            </View>
          </View>
        }
      >
        <View className="gap-4 pb-2 pt-1">
          <View className="gap-2">
            <Text className="px-1 text-sm font-bold uppercase tracking-wide text-text-muted dark:text-text-muted-dark">
              {t('clubs.rankingTitle')}
            </Text>
            {rows.map(
              (row, index) => {
                const member = byUser.get(row.user_id)
                if (!member) return null
                const isMe = row.user_id === userId
                return (
                  <View key={row.user_id} className="flex-row items-center gap-3">
                    <Text className="w-5 text-center text-sm font-extrabold text-text-subtle dark:text-text-subtle-dark">
                      {index + 1}
                    </Text>
                    <Avatar
                      name={member.profile.display_name}
                      src={member.profile.avatar_url}
                      size="sm"
                    />
                    <View className="min-w-0 flex-1 flex-row items-center gap-1.5">
                      <Text
                        className="text-sm font-bold text-text dark:text-text-dark"
                        numberOfLines={1}
                      >
                        {isMe ? t('clubs.you') : member.profile.display_name}
                      </Text>
                      {member.role === 'owner' ? (
                        <Crown size={13} color="#C08A2D" />
                      ) : null}
                    </View>
                    <Text className="text-sm font-bold text-text-muted dark:text-text-muted-dark">
                      {t('clubs.rankingLogs', { count: row.log_count })}
                    </Text>
                  </View>
                )
              },
            )}
          </View>

          <View className="flex-row items-center gap-2 rounded-2xl bg-surface-sunken px-3.5 py-2.5 dark:bg-surface-sunken-dark">
            <Users size={14} color={colors.textSubtle} />
            <Text className="flex-1 text-xs text-text-muted dark:text-text-muted-dark">
              {t('clubs.codeLabel')}: {club.invite_code}
            </Text>
          </View>
        </View>

        <CreateChallengeSheet
          open={challenge !== null}
          prefill={challenge}
          clubId={club.id}
          onClose={() => setChallenge(null)}
        />

        <ConfirmDialog
          open={confirming !== null}
          title={
            confirming === 'delete'
              ? t('clubs.deleteTitle', { name: club.name })
              : t('clubs.leaveTitle')
          }
          body={confirming === 'delete' ? t('clubs.deleteBody') : t('clubs.leaveBody')}
          confirmLabel={confirming === 'delete' ? t('common.delete') : t('clubs.leave')}
          onConfirm={() => {
            haptic('warning')
            const onError = () => showToast(t('common.genericError'), 'error')
            if (confirming === 'delete') {
              remove.mutate(club.id, { onError })
              showToast(t('clubs.deleted'), 'success')
            } else if (userId) {
              leave.mutate({ clubId: club.id, userId }, { onError })
              showToast(t('clubs.left'), 'success')
            }
            setConfirming(null)
            onClose()
          }}
          onCancel={() => setConfirming(null)}
        />
      </Sheet>

    </>
  )
}
