import {
  Bell,
  CalendarPlus,
  Flame,
  Heart,
  Hourglass,
  Medal,
  MessageCircle,
  MessageCircleHeart,
  Reply,
  Sparkles,
  Trophy,
  UserCheck,
  UserPlus,
  type LucideIcon,
} from 'lucide-react-native'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import { Avatar } from '@/components/ui/avatar'
import { Button, IconButton } from '@/components/ui/button'
import { Sheet } from '@/components/ui/sheet'
import { STORY_PARAM, STORY_PARAM_MINE } from '@/components/stories/story-ring'
import { FRIENDS_TAB_PARAM } from '@/components/friends/challenges-section'
import { useThemeColors } from '@/constants/colors'
import { useI18n } from '@/i18n/provider'
import { CHALLENGES_ANCHOR } from '@/lib/api/challenges'
import { isChallengeNotification, type NotificationType } from '@/lib/api/notifications'
import { inboxCopy } from '@/lib/feed/inbox-copy'
import { useInbox, useMarkInboxRead } from '@/lib/hooks/use-notifications-inbox'
import { useRelativeTime } from '@/lib/hooks/use-relative-time'
import { haptic } from '@/lib/utils/haptics'

const SHEET_SETTLE_MS = 400

const TYPE_ICONS: Record<NotificationType, LucideIcon> = {
  comment: MessageCircle,
  reply: Reply,
  reaction: Heart,
  friend_request: UserPlus,
  friend_accept: UserCheck,
  event_invite: CalendarPlus,
  couple_answer: MessageCircleHeart,
  story_reaction: Sparkles,
  challenge_joined: Trophy,
  challenge_ending: Hourglass,
  challenge_finished: Medal,
  friend_streak_risk: Flame,
}

// La bandeja vivia abierta en la cabecera del feed. Con dos avisos pasaba
// desapercibida, pero cada reaccion anade una linea y no se van solas: en una
// tarde de actividad la tarjeta crecia hasta empujar el muro entero fuera de la
// pantalla, que es justo lo contrario de lo que tiene que hacer un feed.
//
// Ahora es una campana con el numero al lado del titulo, y la lista vive en una
// hoja modal. La cabecera mide siempre lo mismo tenga un aviso o treinta, y
// leerlos es una decision de quien mira, no un peaje para llegar al feed.
export function InboxBell() {
  const { t } = useI18n()
  const colors = useThemeColors()
  const relativeTime = useRelativeTime()
  const { data } = useInbox()
  const markRead = useMarkInboxRead()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const items = data ?? []

  // Sin nada que leer no hay campana: un boton que no lleva a ningun sitio solo
  // ocupa sitio en la cabecera.
  if (items.length === 0) return null

  const close = () => setOpen(false)

  return (
    <>
      <IconButton
        label={t('inbox.title', { count: items.length })}
        variant="secondary"
        onPress={() => {
          haptic('tap')
          setOpen(true)
        }}
      >
        <Bell size={20} color={colors.text} />
        <View className="absolute -right-0.5 -top-0.5 h-5 min-w-5 items-center justify-center rounded-full border-2 border-surface bg-brand px-1 dark:border-surface-dark">
          <Text className="text-[10px] font-extrabold leading-none text-white">
            {items.length > 9 ? '9+' : items.length}
          </Text>
        </View>
      </IconButton>

      <Sheet
        open={open}
        onClose={close}
        title={t('inbox.title', { count: items.length })}
        closeLabel={t('common.close')}
        footer={
          <Button
            title={t('inbox.markAllRead')}
            fullWidth
            disabled={markRead.isPending}
            onPress={() => {
              haptic('success')
              markRead.mutate(items.map((item) => item.id))
              close()
            }}
          />
        }
      >
        <View className="gap-1">
          {items.map((item) => {
            const Glyph = TYPE_ICONS[item.type]
            const copy = inboxCopy(item)
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                onPress={() => {
                  haptic('tap')
                  markRead.mutate([item.id])
                  // La ultima que queda cierra la hoja: si no, se queda una hoja
                  // vacia abierta sobre el feed.
                  if (items.length === 1) close()
                  if (item.type === 'couple_answer') {
                    close()
                    router.push('/couple')
                  }
                  if (isChallengeNotification(item.type)) {
                    close()
                    router.push({ pathname: '/friends', params: { [FRIENDS_TAB_PARAM]: CHALLENGES_ANCHOR } })
                  }
                  if (item.type === 'friend_streak_risk') {
                    close()
                    router.push('/')
                  }
                  if (item.type === 'story_reaction') {
                    close()
                    setTimeout(
                      () => router.setParams({ [STORY_PARAM]: STORY_PARAM_MINE }),
                      SHEET_SETTLE_MS,
                    )
                  }
                }}
                className="min-h-12 flex-row items-center gap-3 py-2 active:opacity-70"
              >
                <View>
                  <Avatar name={item.actor.display_name} src={item.actor.avatar_url} size="sm" />
                  <View className="absolute -bottom-1 -right-1 h-5 w-5 items-center justify-center rounded-full bg-brand">
                    <Glyph size={11} color="#fff" />
                  </View>
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-sm text-text dark:text-text-dark" numberOfLines={2}>
                    {t(copy.key, copy.params)}
                  </Text>
                  <Text className="text-xs text-text-muted dark:text-text-muted-dark">
                    {relativeTime(item.created_at)}
                  </Text>
                </View>
              </Pressable>
            )
          })}
        </View>
      </Sheet>
    </>
  )
}
