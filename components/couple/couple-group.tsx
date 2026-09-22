import { Text, View } from 'react-native'

import { SHADOW_TILE } from '@/constants/colors'

export function CoupleGroup({
  header,
  footer,
  children,
}: {
  header?: string
  footer?: string
  children: React.ReactNode
}) {
  return (
    <View className="gap-2 px-4">
      {header ? (
        <Text className="px-1 text-sm font-bold uppercase tracking-wide text-text dark:text-text-dark">
          {header}
        </Text>
      ) : null}
      <View
        style={SHADOW_TILE}
        className="overflow-hidden rounded-3xl border border-border bg-surface dark:border-border-dark dark:bg-surface-dark"
      >
        {children}
      </View>
      {footer ? (
        <Text className="px-1 text-xs text-text-subtle dark:text-text-subtle-dark">{footer}</Text>
      ) : null}
    </View>
  )
}
