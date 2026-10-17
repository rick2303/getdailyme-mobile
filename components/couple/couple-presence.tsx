import { HeartHandshake } from 'lucide-react-native'
import { Pressable, Text, View } from 'react-native'

import { CoupleGroup } from '@/components/couple/couple-group'
import { Avatar } from '@/components/ui/avatar'
import { useToast } from '@/components/ui/toast'
import { useThemeColors } from '@/constants/colors'
import { useI18n } from '@/i18n/provider'
import type { TranslationKey } from '@/i18n/translate'
import type { Couple } from '@/lib/api/couple'
import { useCurrentUserId, useTimeZone } from '@/lib/auth/provider'
import { COUPLE_MOODS, isMoodFresh, type CoupleMood } from '@/lib/couple/moods'
import {
  useCoupleMoods,
  usePingTally,
  useSendPing,
  useSetMood,
} from '@/lib/hooks/use-couple-presence'
import { ICON_STROKE } from '@/lib/icons/tokens'
import { cn } from '@/lib/utils/cn'
import { formatTime, zonedDateTimeToIso } from '@/lib/utils/dates'
import { haptic } from '@/lib/utils/haptics'

import { MOOD_ICONS } from './mood-icons'

// Estar sin escribir: como esta la otra persona, "pienso en ti" de un toque y
// como estas tu. Es lo mismo que pinta el widget de pareja, con la misma forma.
export function CouplePresence({ couple, today }: { couple: Couple; today: string }) {
  const { t, locale } = useI18n()
  const { showToast } = useToast()
  const colors = useThemeColors()
  const userId = useCurrentUserId()
  const timeZone = useTimeZone()
  const since = zonedDateTimeToIso(today, '00:00', timeZone)

  const { data: moods } = useCoupleMoods(couple.id)
  const { data: tally } = usePingTally(couple.id, since)
  const setMood = useSetMood(couple.id)
  const sendPing = useSendPing(couple.id)

  const partner = couple.partner
  const theirs = moods?.find((entry) => entry.userId === partner.id) ?? null
  const mine = moods?.find((entry) => entry.userId === userId) ?? null
  const theirMood = theirs && isMoodFresh(theirs.updatedAt) ? theirs : null
  const myMood = mine && isMoodFresh(mine.updatedAt) ? mine.mood : null
  const TheirIcon = theirMood ? MOOD_ICONS[theirMood.mood] : null

  const ping = () => {
    haptic('success')
    sendPing.mutate(undefined, {
      onSuccess: (result) => {
        if (result.outcome === 'sent') {
          showToast(t('presence.pingSent', { name: partner.displayName }), 'success')
        } else if (result.outcome === 'too_soon') {
          showToast(t('presence.pingTooSoon'), 'success')
        } else {
          showToast(t('common.genericError'), 'error')
        }
      },
      onError: () => showToast(t('common.genericError'), 'error'),
    })
  }

  const choose = (mood: CoupleMood) => {
    haptic('tap')
    // Tocar el que ya llevas lo quita.
    const next = mood === myMood ? null : mood
    setMood.mutate(next, {
      onSuccess: () => {
        if (next) showToast(t('presence.moodSaved', { name: partner.displayName }), 'success')
      },
      onError: () => showToast(t('common.genericError'), 'error'),
    })
  }

  const received = tally?.received ?? 0
  const sent = tally?.sent ?? 0

  return (
    <CoupleGroup header={t('presence.header')} footer={t('presence.widgetHint')}>
      <View className="flex-row items-center gap-3 p-4">
        <Avatar name={partner.displayName} src={partner.avatarUrl} size="md" />
        <View className="min-w-0 flex-1">
          <Text
            className="text-[15px] font-bold text-text dark:text-text-dark"
            numberOfLines={1}
          >
            {partner.displayName}
          </Text>
          {theirMood && TheirIcon ? (
            <View className="flex-row items-center gap-1.5">
              <TheirIcon size={16} color={colors.brand} strokeWidth={ICON_STROKE.emphasis} />
              <Text
                className="flex-1 text-sm text-text-muted dark:text-text-muted-dark"
                numberOfLines={1}
              >
                {t(`presence.mood.${theirMood.mood}` as TranslationKey)} ·{' '}
                {t('presence.moodAt', {
                  time: formatTime(new Date(theirMood.updatedAt), locale, timeZone),
                })}
              </Text>
            </View>
          ) : (
            <Text className="text-sm text-text-subtle dark:text-text-subtle-dark">
              {t('presence.partnerNoMood')}
            </Text>
          )}
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('presence.pingAction')}
          disabled={sendPing.isPending}
          onPress={ping}
          className="min-h-14 items-center justify-center gap-1 rounded-2xl bg-brand px-3 py-2 active:scale-95 active:opacity-80"
        >
          <HeartHandshake size={24} color="#fff" strokeWidth={ICON_STROKE.emphasis} />
          <Text className="text-[11px] font-bold text-white">{t('presence.pingAction')}</Text>
        </Pressable>
      </View>

      <View className="border-t border-border px-4 py-3 dark:border-border-dark">
        <Text className="text-xs text-text-muted dark:text-text-muted-dark">
          {received > 0
            ? t('presence.pingsReceived', { name: partner.displayName, count: received })
            : t('presence.pingsNone')}
          {sent > 0 ? ` · ${t('presence.pingsSent', { count: sent })}` : ''}
        </Text>
      </View>

      <View className="gap-2 border-t border-border p-4 dark:border-border-dark">
        <Text className="text-xs text-text-subtle dark:text-text-subtle-dark">
          {t('presence.yourMood')}
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {COUPLE_MOODS.map((mood) => {
            const Icon = MOOD_ICONS[mood]
            const selected = mood === myMood
            return (
              <Pressable
                key={mood}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => choose(mood)}
                style={{ width: '23%' }}
                className={cn(
                  'min-h-16 items-center justify-center gap-1 rounded-2xl px-1 py-2 active:opacity-70',
                  selected ? 'bg-brand' : 'bg-surface-sunken dark:bg-surface-sunken-dark',
                )}
              >
                <Icon
                  size={20}
                  color={selected ? '#fff' : colors.text}
                  strokeWidth={selected ? ICON_STROKE.emphasis : undefined}
                />
                <Text
                  className={cn(
                    'text-center text-[11px] font-semibold leading-tight',
                    selected ? 'text-white' : 'text-text dark:text-text-dark',
                  )}
                  numberOfLines={1}
                >
                  {t(`presence.mood.${mood}` as TranslationKey)}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </View>
    </CoupleGroup>
  )
}
