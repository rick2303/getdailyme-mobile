import { Text, View } from 'react-native'

export function InviteOutcome({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode
  title: string
  body?: string
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
        {body ? (
          <Text className="text-center text-sm text-text-muted dark:text-text-muted-dark">
            {body}
          </Text>
        ) : null}
      </View>
      {action}
    </View>
  )
}
