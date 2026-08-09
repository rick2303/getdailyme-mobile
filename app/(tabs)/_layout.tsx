import { Tabs } from 'expo-router'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { CalendarCheck, House, Plus, User, Users, type LucideIcon } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { ActivityEditorSheet } from '@/components/activities/activity-editor-sheet'
import { useThemeColors } from '@/constants/colors'
import { useT } from '@/i18n/provider'
import { useFriends, useUnreadNudges } from '@/lib/hooks/use-friends'
import { haptic } from '@/lib/utils/haptics'

// La barra inferior de la PWA, con su boton central violeta que crea una
// actividad desde cualquier pantalla, el indicador superior en la pestaña
// activa y el badge de amigos (solicitudes + toques sin leer).
const TAB_ICONS: Record<string, LucideIcon> = {
  index: House,
  feed: CalendarCheck,
  friends: Users,
  profile: User,
}

export default function TabsLayout() {
  const [creating, setCreating] = useState(false)

  return (
    <>
      <Tabs
        screenOptions={{ headerShown: false, freezeOnBlur: true }}
        tabBar={(props) => <AppTabBar {...props} onQuickAdd={() => setCreating(true)} />}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="feed" />
        <Tabs.Screen name="friends" />
        <Tabs.Screen name="profile" />
      </Tabs>

      <ActivityEditorSheet open={creating} onClose={() => setCreating(false)} />
    </>
  )
}

function AppTabBar({
  state,
  navigation,
  onQuickAdd,
}: BottomTabBarProps & { onQuickAdd: () => void }) {
  const t = useT()
  const colors = useThemeColors()
  const insets = useSafeAreaInsets()

  const { data: unreadNudges } = useUnreadNudges()
  const { incoming } = useFriends()
  const friendsBadge = (unreadNudges?.length ?? 0) + incoming.length

  const labels: Record<string, string> = {
    index: t('nav.today'),
    feed: t('nav.feed'),
    friends: t('nav.friends'),
    profile: t('nav.profile'),
  }

  const renderTab = (routeName: string, index: number) => {
    const isActive = state.index === index
    const Icon = TAB_ICONS[routeName] ?? House
    const badge = routeName === 'friends' ? friendsBadge : 0

    return (
      <Pressable
        key={routeName}
        accessibilityRole="button"
        accessibilityState={{ selected: isActive }}
        accessibilityLabel={labels[routeName]}
        onPress={() => {
          haptic('tap')
          navigation.navigate(routeName)
        }}
        className="relative flex-1 items-center justify-center gap-1 pt-1"
      >
        {isActive ? (
          <View className="absolute top-0 h-1 w-10 rounded-full bg-brand" />
        ) : null}
        <View>
          <Icon
            size={24}
            color={isActive ? colors.brand : colors.textSubtle}
            strokeWidth={isActive ? 2.4 : 1.9}
          />
          {badge > 0 ? (
            <View className="absolute -right-2 -top-1 h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1">
              <Text className="text-[10px] font-extrabold text-white">
                {badge > 9 ? '9+' : badge}
              </Text>
            </View>
          ) : null}
        </View>
        <Text
          maxFontSizeMultiplier={1.2}
          className="text-[11px] font-semibold"
          style={{ color: isActive ? colors.brand : colors.textSubtle }}
        >
          {labels[routeName]}
        </Text>
      </Pressable>
    )
  }

  const routeNames = state.routes.map((route) => route.name)

  return (
    <View
      className="border-t border-border bg-surface dark:border-border-dark dark:bg-surface-dark"
      style={{ paddingBottom: insets.bottom }}
    >
      <View className="h-16 flex-row items-stretch justify-between px-2">
        {routeNames.slice(0, 2).map((name) => renderTab(name, routeNames.indexOf(name)))}

        <View className="w-16 shrink-0 items-center justify-center">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('today.addActivity')}
            onPress={() => {
              haptic('tap')
              onQuickAdd()
            }}
            className="-translate-y-4 h-14 w-14 items-center justify-center rounded-full bg-brand active:scale-95"
            style={{
              shadowColor: '#000',
              shadowOpacity: 0.25,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 6 },
              elevation: 8,
            }}
          >
            <Plus size={28} color="#fff" strokeWidth={2.5} />
          </Pressable>
        </View>

        {routeNames.slice(2).map((name) => renderTab(name, routeNames.indexOf(name)))}
      </View>
    </View>
  )
}
