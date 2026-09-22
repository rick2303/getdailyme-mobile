import { Heart } from 'lucide-react-native'
import { Text, View } from 'react-native'

import { Avatar } from '@/components/ui/avatar'
import { useThemeColors } from '@/constants/colors'
import { useI18n } from '@/i18n/provider'
import { daysTogether, type Couple } from '@/lib/api/couple'
import type { Profile } from '@/lib/api/types'
import { formatLongDate } from '@/lib/utils/dates'

export function CoupleHeader({
  couple,
  profile,
  today,
}: {
  couple: Couple
  profile: Profile
  today: string
}) {
  const { t, locale } = useI18n()
  const colors = useThemeColors()
  const days = daysTogether(couple.startedOn, today)

  return (
    <View className="items-center gap-4 px-4">
      <View className="flex-row items-center">
        <Avatar name={profile.display_name} src={profile.avatar_url} size="lg" />
        <View className="z-10 -mx-3 h-10 w-10 items-center justify-center rounded-full border-4 border-bg bg-brand-soft dark:border-bg-dark dark:bg-brand-soft-dark">
          <Heart size={16} color={colors.brand} fill={colors.brand} />
        </View>
        <Avatar name={couple.partner.displayName} src={couple.partner.avatarUrl} size="lg" />
      </View>

      <View className="flex-row items-baseline gap-2">
        <Text
          className="text-5xl font-extrabold tracking-tight text-text dark:text-text-dark"
          style={{ fontVariant: ['tabular-nums'] }}
        >
          {days}
        </Text>
        <Text className="text-lg font-semibold text-text-muted dark:text-text-muted-dark">
          {t('couple.dayUnit', { count: days })}
        </Text>
      </View>

      <Text className="text-xs text-text-subtle dark:text-text-subtle-dark">
        {t('couple.since', {
          date: formatLongDate(new Date(`${couple.startedOn}T00:00:00Z`), locale),
        })}
      </Text>
    </View>
  )
}
