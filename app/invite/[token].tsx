import { useLocalSearchParams, useRouter } from 'expo-router'
import { Check, Link2Off, UserCheck, Users } from 'lucide-react-native'
import { useEffect } from 'react'
import { Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/feedback'
import { useThemeColors } from '@/constants/colors'
import { useI18n } from '@/i18n/provider'
import { useCurrentUserId } from '@/lib/auth/provider'
import { useRedeemInvite } from '@/lib/hooks/use-invite'
import { forgetParkedInvite, parkInvite } from '@/lib/invite-handoff'

// La pantalla que faltaba: el movil declaraba el intentFilter de
// app.getdailyme.com/invite y el associatedDomains de iOS, asi que el sistema le
// entregaba el enlace a la app... que no tenia nada que atenderlo. Abria en la
// pestaña de hoy y el token se perdia, y al haberselo quedado tampoco llegaba a
// la web. Es la gemela de /invite/[token] de la web.
export default function InviteScreen() {
  const { t } = useI18n()
  const router = useRouter()
  const colors = useThemeColors()
  const userId = useCurrentUserId()
  const { token: raw } = useLocalSearchParams<{ token?: string }>()
  const token = typeof raw === 'string' && raw.length > 0 ? raw : null

  // Sin sesion el guardia de rutas manda a la pantalla de acceso y el token se
  // volatiliza. Se guarda antes de que eso pase, y al volver con sesion el
  // binder del layout trae de vuelta aqui.
  useEffect(() => {
    if (!token) return
    if (userId) void forgetParkedInvite()
    else void parkInvite(token)
  }, [token, userId])

  const { data, isLoading, isError } = useRedeemInvite(token)

  const goFriends = (
    <Button
      title={t('invite.goToFriends')}
      size="lg"
      fullWidth
      onPress={() => router.replace('/friends')}
    />
  )

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bg-dark">
      <View className="flex-1 items-center justify-center gap-5 px-6">
        {isLoading || !token ? (
          <Spinner />
        ) : isError || !data || data.outcome === 'invalid' ? (
          <Outcome
            icon={<Link2Off size={26} color={colors.brand} />}
            title={t('invite.invalidTitle')}
            body={t('invite.invalidBody')}
            action={goFriends}
          />
        ) : data.outcome === 'self' ? (
          <Outcome
            icon={<Users size={26} color={colors.brand} />}
            title={t('invite.selfTitle')}
            body={t('invite.selfBody')}
            action={goFriends}
          />
        ) : data.outcome === 'blocked' ? (
          <Outcome
            icon={<Link2Off size={26} color={colors.brand} />}
            title={t('invite.blockedTitle')}
            body={t('invite.blockedBody')}
            action={goFriends}
          />
        ) : (
          <>
            {data.inviter ? (
              <Avatar name={data.inviter.displayName} src={data.inviter.avatarUrl} size="lg" />
            ) : null}
            <Outcome
              icon={
                data.outcome === 'accepted' ? (
                  <Check size={26} color={colors.brand} strokeWidth={3} />
                ) : (
                  <UserCheck size={26} color={colors.brand} />
                )
              }
              title={
                data.outcome === 'accepted'
                  ? t('invite.acceptedTitle', { name: data.inviter?.displayName ?? '' })
                  : t('invite.alreadyTitle', { name: data.inviter?.displayName ?? '' })
              }
              body={t('invite.acceptedBody')}
              action={
                <View className="w-full gap-2">
                  <Button
                    title={t('invite.goToFeed')}
                    size="lg"
                    fullWidth
                    onPress={() => router.replace('/feed')}
                  />
                  <Button
                    title={t('invite.goToToday')}
                    variant="ghost"
                    size="lg"
                    fullWidth
                    onPress={() => router.replace('/')}
                  />
                </View>
              }
            />
          </>
        )}
      </View>
    </SafeAreaView>
  )
}

function Outcome({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode
  title: string
  body: string
  action: React.ReactNode
}) {
  return (
    <View className="w-full items-center gap-4">
      <View className="h-14 w-14 items-center justify-center rounded-full bg-brand-soft dark:bg-brand-soft-dark">
        {icon}
      </View>
      <View className="gap-1.5">
        <Text className="text-center text-xl font-extrabold text-text dark:text-text-dark">
          {title}
        </Text>
        <Text className="text-center text-sm text-text-muted dark:text-text-muted-dark">
          {body}
        </Text>
      </View>
      {action}
    </View>
  )
}
