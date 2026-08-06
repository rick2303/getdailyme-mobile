import { useQuery } from '@tanstack/react-query'
import { CalendarDays, Flame, ListChecks, Trophy, type LucideIcon } from 'lucide-react-native'
import { useState } from 'react'
import { Text, View } from 'react-native'

import type { ReportSheetTarget } from '@/components/feed/report-sheet'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Spinner } from '@/components/ui/feedback'
import { Sheet } from '@/components/ui/sheet'
import { useToast } from '@/components/ui/toast'
import { useThemeColors } from '@/constants/colors'
import { useI18n } from '@/i18n/provider'
import { fetchProfileCard } from '@/lib/api/profile'
import { useCurrentUserId } from '@/lib/auth/provider'
import { useBlockUser } from '@/lib/hooks/use-friends'
import { queryKeys } from '@/lib/query/keys'
import { getSupabaseBrowserClient, isSupabaseConfigured } from '@/lib/supabase/client'
import { haptic } from '@/lib/utils/haptics'

// La misma ficha que la web: identidad, miembro desde, racha del servidor, y
// las salidas de denunciar y bloquear.
export function ProfileCardSheet({
  userId,
  onClose,
  onReport,
}: {
  userId: string | null
  onClose: () => void
  onReport: (target: ReportSheetTarget) => void
}) {
  const { t, locale } = useI18n()
  const { showToast } = useToast()
  const currentUserId = useCurrentUserId()
  const blockUser = useBlockUser()
  const [confirmingBlock, setConfirmingBlock] = useState(false)

  const { data: card, isLoading } = useQuery({
    queryKey: queryKeys.profileCard(userId ?? 'none'),
    enabled: isSupabaseConfigured() && userId !== null,
    queryFn: () => fetchProfileCard(getSupabaseBrowserClient(), userId!),
  })

  const memberSince = card
    ? new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(
        new Date(card.created_at),
      )
    : null

  return (
    <Sheet
      open={userId !== null}
      onClose={onClose}
      title={card?.display_name ?? t('profileCard.title')}
      closeLabel={t('common.close')}
    >
      <View className="items-center gap-4 pb-2 pt-1">
        {isLoading && !card ? (
          <Spinner className="py-16" />
        ) : !card ? (
          <Text className="py-10 text-center text-sm text-text-muted dark:text-text-muted-dark">
            {t('profileCard.hidden')}
          </Text>
        ) : (
          <>
            <Avatar name={card.display_name} src={card.avatar_url} size="lg" />

            <View className="items-center gap-0.5">
              <Text className="text-xl font-extrabold text-text dark:text-text-dark">
                {card.display_name}
              </Text>
              <Text className="text-sm font-medium text-text-muted dark:text-text-muted-dark">
                @{card.username}
              </Text>
              {memberSince ? (
                <Text className="mt-1 text-xs font-medium text-text-subtle dark:text-text-subtle-dark">
                  {t('profileCard.memberSince', { date: memberSince })}
                </Text>
              ) : null}
            </View>

            <View className="w-full flex-row flex-wrap gap-3">
              <CardStat
                icon={Flame}
                label={t('stats.currentStreak')}
                value={t('stats.days', { count: card.current_streak })}
                highlighted={card.current_streak > 0}
              />
              <CardStat
                icon={Trophy}
                label={t('stats.longestStreak')}
                value={t('stats.days', { count: card.longest_streak })}
              />
              <CardStat icon={ListChecks} label={t('stats.totalLogs')} value={String(card.total_logs)} />
              <CardStat
                icon={CalendarDays}
                label={t('stats.activeDays')}
                value={String(card.active_days)}
              />
            </View>

            {card.id !== currentUserId ? (
              <View className="flex-row gap-2">
                <Button
                  title={t('report.profile')}
                  variant="ghost"
                  size="sm"
                  onPress={() => onReport({ type: 'profile', userId: card.id })}
                />
                <Button
                  title={t('block.cta')}
                  variant="ghost"
                  size="sm"
                  className="opacity-90"
                  onPress={() => setConfirmingBlock(true)}
                />
              </View>
            ) : null}

            <ConfirmDialog
              open={confirmingBlock}
              title={t('block.confirmTitle', { name: card.display_name })}
              body={t('block.confirmBody')}
              confirmLabel={t('block.confirm')}
              pending={blockUser.isPending}
              onConfirm={() => {
                haptic('warning')
                blockUser.mutate(card.id, {
                  onSuccess: () => {
                    setConfirmingBlock(false)
                    onClose()
                    showToast(t('block.done', { name: card.display_name }), 'success')
                  },
                  onError: () => {
                    setConfirmingBlock(false)
                    showToast(t('common.genericError'), 'error')
                  },
                })
              }}
              onCancel={() => setConfirmingBlock(false)}
            />
          </>
        )}
      </View>
    </Sheet>
  )
}

function CardStat({
  icon: Icon,
  label,
  value,
  highlighted = false,
}: {
  icon: LucideIcon
  label: string
  value: string
  highlighted?: boolean
}) {
  const colors = useThemeColors()

  return (
    <View className="min-w-[45%] flex-1 gap-1 rounded-2xl bg-surface-sunken px-3.5 py-3 dark:bg-surface-sunken-dark">
      <Icon size={20} color={highlighted ? colors.brand : colors.textSubtle} />
      <Text className="text-lg font-extrabold text-text dark:text-text-dark" numberOfLines={1}>
        {value}
      </Text>
      <Text className="text-xs font-medium text-text-muted dark:text-text-muted-dark" numberOfLines={1}>
        {label}
      </Text>
    </View>
  )
}
