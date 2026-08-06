import { Bell, Heart, MessageCircle, Reply, type LucideIcon } from 'lucide-react-native'
import { Pressable, Text, View } from 'react-native'

import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n/provider'
import type { TranslationKey } from '@/i18n/translate'
import type { NotificationType } from '@/lib/api/notifications'
import { useInbox, useMarkInboxRead } from '@/lib/hooks/use-notifications-inbox'
import { useRelativeTime } from '@/lib/hooks/use-relative-time'
import { haptic } from '@/lib/utils/haptics'

const TYPE_ICONS: Record<NotificationType, LucideIcon> = {
  comment: MessageCircle,
  reply: Reply,
  reaction: Heart,
}

export function Inbox() {
  const { t } = useI18n()
  const relativeTime = useRelativeTime()
  const { data } = useInbox()
  const markRead = useMarkInboxRead()

  const items = data ?? []
  if (items.length === 0) return null

  return (
    <View className="gap-3 rounded-3xl border border-brand/35 bg-brand-soft p-4 dark:bg-brand-soft-dark">
      <View className="flex-row items-center gap-2">
        <View className="h-9 w-9 items-center justify-center rounded-full bg-brand">
          <Bell size={18} color="#fff" />
        </View>
        <Text className="flex-1 text-sm font-extrabold text-text dark:text-text-dark">
          {t('inbox.title', { count: items.length })}
        </Text>
      </View>

      <View className="gap-1">
        {items.map((item) => {
          const Glyph = TYPE_ICONS[item.type]
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              onPress={() => {
                haptic('tap')
                markRead.mutate([item.id])
              }}
              className="min-h-12 flex-row items-center gap-2.5 py-1.5"
            >
              <View>
                <Avatar name={item.actor.display_name} src={item.actor.avatar_url} size="sm" />
                <View className="absolute -bottom-1 -right-1 h-5 w-5 items-center justify-center rounded-full bg-brand">
                  <Glyph size={11} color="#fff" />
                </View>
              </View>
              <View className="min-w-0 flex-1">
                <Text className="text-sm text-text dark:text-text-dark" numberOfLines={1}>
                  {t(`inbox.${item.type}` as TranslationKey, { name: item.actor.display_name })}
                </Text>
                <Text className="text-xs text-text-muted dark:text-text-muted-dark">
                  {relativeTime(item.created_at)}
                </Text>
              </View>
            </Pressable>
          )
        })}
      </View>

      <Button
        title={t('inbox.markAllRead')}
        size="sm"
        variant="secondary"
        fullWidth
        disabled={markRead.isPending}
        onPress={() => {
          haptic('success')
          markRead.mutate(items.map((item) => item.id))
        }}
      />
    </View>
  )
}
