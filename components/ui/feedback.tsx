import { ActivityIndicator, Text, View } from 'react-native'

import { cn } from '@/lib/utils/cn'
import { useThemeColors } from '@/constants/colors'

export function Spinner({ className }: { className?: string }) {
  const colors = useThemeColors()
  return (
    <View className={cn('items-center justify-center', className)}>
      <ActivityIndicator color={colors.brand} />
    </View>
  )
}

export function SkeletonTile({ className }: { className?: string }) {
  return (
    <View
      className={cn('rounded-3xl bg-surface-sunken dark:bg-surface-sunken-dark opacity-70', className)}
    />
  )
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: React.ReactNode
  title: string
  body?: string
  action?: React.ReactNode
}) {
  return (
    <View className="items-center gap-3 px-8 py-12">
      {icon}
      <Text className="text-center text-lg font-extrabold text-text dark:text-text-dark">{title}</Text>
      {body ? (
        <Text className="text-center text-sm text-text-muted dark:text-text-muted-dark">{body}</Text>
      ) : null}
      {action}
    </View>
  )
}
