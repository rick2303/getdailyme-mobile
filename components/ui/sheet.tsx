import { X } from 'lucide-react-native'
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useThemeColors } from '@/constants/colors'
import { IconButton } from './button'

// La hoja deslizante de la web, en nativo. La altura maxima se calcula con la
// ventana real y no con un porcentaje: dentro de un Modal el max-h-[92%] se
// resolvia tarde y la ficha salia cortada hasta que un scroll forzaba el
// relayout. El ScrollView ademas no estira: una hoja corta mide lo que mide.
export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  closeLabel = 'Cerrar',
}: {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  footer?: React.ReactNode
  closeLabel?: string
}) {
  const insets = useSafeAreaInsets()
  const colors = useThemeColors()
  const { height: windowHeight } = useWindowDimensions()

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/45">
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={closeLabel}
            className="flex-1"
            onPress={onClose}
          />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View
            className="rounded-t-[28px] bg-surface dark:bg-surface-dark"
            style={{
              maxHeight: Math.round(windowHeight * 0.92),
              paddingBottom: Math.max(insets.bottom, 12),
            }}
          >
            <View className="items-center pt-3">
              <View className="h-1.5 w-10 rounded-full bg-border-strong dark:bg-border-strong-dark" />
            </View>

            {title ? (
              <View className="flex-row items-start gap-3 px-5 pb-2 pt-3">
                <View className="min-w-0 flex-1">
                  <Text className="text-lg font-bold text-text dark:text-text-dark" numberOfLines={1}>
                    {title}
                  </Text>
                  {description ? (
                    <Text className="mt-0.5 text-sm text-text-muted dark:text-text-muted-dark">
                      {description}
                    </Text>
                  ) : null}
                </View>
                <IconButton label={closeLabel} onPress={onClose} className="-mt-1">
                  <X size={20} color={colors.textMuted} />
                </IconButton>
              </View>
            ) : null}

            <ScrollView
              className="px-5"
              style={{ flexGrow: 0 }}
              contentContainerClassName="pb-4"
              keyboardShouldPersistTaps="handled"
              contentInsetAdjustmentBehavior="never"
              automaticallyAdjustsScrollIndicatorInsets={false}
              automaticallyAdjustKeyboardInsets={false}
            >
              {children}
            </ScrollView>

            {footer ? (
              <View className="border-t border-border px-5 pb-1 pt-3 dark:border-border-dark">
                {footer}
              </View>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  )
}
