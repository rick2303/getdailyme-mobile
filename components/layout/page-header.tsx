import { Text, View } from 'react-native'

// La cabecera de pagina de la web: titulo 2xl extrabold, subtitulo opcional y
// una accion a la derecha, con los mismos margenes.
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
}) {
  return (
    <View className="flex-row items-end justify-between gap-3 px-4 pb-4 pt-2">
      <View className="min-w-0 flex-1">
        <Text className="text-2xl font-extrabold tracking-tight text-text dark:text-text-dark" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text className="mt-0.5 text-sm text-text-muted dark:text-text-muted-dark" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {action ? <View className="shrink-0 pb-1">{action}</View> : null}
    </View>
  )
}
