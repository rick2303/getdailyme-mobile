import {
  Bell,
  CalendarPlus,
  Flame,
  Heart,
  HeartHandshake,
  Hourglass,
  Mail,
  MailOpen,
  Medal,
  MessageCircle,
  MessageCircleHeart,
  Reply,
  Smile,
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
import { useThemeColors } from '@/constants/colors'
import { useI18n } from '@/i18n/provider'
import {
  isChallengeNotification,
  isCoupleNotification,
  type NotificationType,
} from '@/lib/api/notifications'
import { useActivityLabels } from '@/lib/activities/labels'
import { groupInbox, inboxGroupCopy, type InboxGroup } from '@/lib/feed/inbox-copy'
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
  couple_ping: HeartHandshake,
  couple_mood: Smile,
  couple_letter: Mail,
  couple_letter_open: MailOpen,
}

// La bandeja vivia abierta en la cabecera del feed. Con dos avisos pasaba
// desapercibida, pero cada reaccion anade una linea y no se van solas: en una
// tarde de actividad la tarjeta crecia hasta empujar el muro entero fuera de la
// pantalla, que es justo lo contrario de lo que tiene que hacer un feed.
//
// Ahora es una campana con el numero al lado del titulo, y la lista vive en una
// hoja modal. La cabecera mide siempre lo mismo tenga un aviso o treinta, y
// leerlos es una decision de quien mira, no un peaje para llegar al feed.
export function InboxBell({ onOpenLog }: { onOpenLog?: (logId: string) => void }) {
  const { t } = useI18n()
  const colors = useThemeColors()
  const relativeTime = useRelativeTime()
  const { data } = useInbox()
  const markRead = useMarkInboxRead()
  const { activityName } = useActivityLabels()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const items = data ?? []
  // La misma persona haciendo lo mismo sobre tus cosas va en una sola linea.
  const groups = groupInbox(items)

  // Sin nada que leer no hay campana: un boton que no lleva a ningun sitio solo
  // ocupa sitio en la cabecera.
  if (items.length === 0) return null

  const close = () => setOpen(false)

  const follow = ({ lead: item, ids, count }: InboxGroup) => {
    haptic('tap')
    markRead.mutate(ids)
    // La ultima que queda cierra la hoja: si no, se queda una hoja vacia
    // abierta sobre el feed.
    if (groups.length === 1) close()
    // Agrupado sobre varios registros no hay uno solo que abrir: el muro.
    if (item.log_id && count > 1) {
      close()
      router.push('/feed')
      return
    }
    if (item.log_id && onOpenLog) {
      close()
      const logId = item.log_id
      setTimeout(() => onOpenLog(logId), SHEET_SETTLE_MS)
      return
    }
    if (isCoupleNotification(item.type)) {
      close()
      router.push('/couple')
    }
    if (isChallengeNotification(item.type)) {
      close()
      router.push('/friends')
    }
    if (item.type === 'friend_streak_risk') {
      close()
      router.push('/')
    }
    if (item.type === 'story_reaction') {
      close()
      setTimeout(() => router.setParams({ [STORY_PARAM]: STORY_PARAM_MINE }), SHEET_SETTLE_MS)
    }
  }

  return (
    <>
      <IconButton
        label={t('inbox.title', { count: groups.length })}
        variant="secondary"
        onPress={() => {
          haptic('tap')
          setOpen(true)
        }}
      >
        <Bell size={20} color={colors.text} />
        <View className="absolute -right-0.5 -top-0.5 h-5 min-w-5 items-center justify-center rounded-full border-2 border-surface bg-brand px-1 dark:border-surface-dark">
          <Text className="text-[10px] font-extrabold leading-none text-white">
            {groups.length > 9 ? '9+' : groups.length}
          </Text>
        </View>
      </IconButton>

      <Sheet
        open={open}
        onClose={close}
        title={t('inbox.title', { count: groups.length })}
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
        {/* Bloque agrupado con filetes sangrados, como el resto de listas. */}
        <View className="overflow-hidden rounded-2xl bg-surface-sunken dark:bg-surface-sunken-dark">
          {groups.map((group, index) => {
            const item = group.lead
            const Glyph = TYPE_ICONS[item.type]
            const copy = inboxGroupCopy(group, activityName)
            return (
              <View key={item.id}>
                {index > 0 ? <View className="ml-[64px] h-px bg-border dark:bg-border-dark" /> : null}
                <Pressable
                  accessibilityRole="button"
                  onPress={() => follow(group)}
                  className="min-h-16 flex-row items-center gap-3 px-4 py-3 active:opacity-70"
                >
                  <View>
                    <Avatar name={item.actor.display_name} src={item.actor.avatar_url} size="sm" />
                    <View className="absolute -bottom-1 -right-1.5 h-5 w-5 items-center justify-center rounded-full border-2 border-surface-sunken bg-brand dark:border-surface-sunken-dark">
                      <Glyph size={10} color="#fff" />
                    </View>
                  </View>
                  <View className="min-w-0 flex-1">
                    <Text className="text-sm text-text dark:text-text-dark" numberOfLines={2}>
                      {t(copy.key, copy.params)}
                    </Text>
                    <Text className="text-xs text-text-subtle dark:text-text-subtle-dark">
                      {relativeTime(item.created_at)}
                    </Text>
                  </View>
                </Pressable>
              </View>
            )
          })}
        </View>
      </Sheet>
    </>
  )
}
