import { useRouter } from 'expo-router'
import { ChevronRight, Heart } from 'lucide-react-native'
import { Pressable, Text, View } from 'react-native'

import { CoupleGroup } from '@/components/couple/couple-group'
import { Avatar } from '@/components/ui/avatar'
import { useThemeColors } from '@/constants/colors'
import { useI18n } from '@/i18n/provider'
import { daysTogether } from '@/lib/api/couple'
import { useTimeZone } from '@/lib/auth/provider'
import { useCouple } from '@/lib/hooks/use-couple'
import { todayKey } from '@/lib/utils/dates'
import { haptic } from '@/lib/utils/haptics'

export function CoupleCard() {
  const { t } = useI18n()
  const router = useRouter()
  const colors = useThemeColors()
  const timeZone = useTimeZone()
  const { data: couple } = useCouple()

  if (!couple) return null

  const days = daysTogether(couple.startedOn, todayKey(timeZone))

  return (
    <CoupleGroup header={t('couple.cardTitle')}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${couple.partner.displayName}, ${days} ${t('couple.dayUnit', { count: days })}`}
        onPress={() => {
          haptic('tap')
          router.push('/couple')
        }}
        className="min-h-14 flex-row items-center gap-3 px-4 py-3 active:opacity-70"
      >
        <Avatar name={couple.partner.displayName} src={couple.partner.avatarUrl} size="sm" />
        <Text
          className="min-w-0 flex-1 text-[15px] font-bold text-text dark:text-text-dark"
          numberOfLines={1}
        >
          {couple.partner.displayName}
        </Text>
        <View className="flex-row items-center gap-1.5">
          <Heart size={16} color={colors.brand} fill={colors.brand} />
          <Text
            className="text-base font-extrabold text-text dark:text-text-dark"
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {days}
          </Text>
        </View>
        <ChevronRight size={16} color={colors.textSubtle} />
      </Pressable>
    </CoupleGroup>
  )
}
