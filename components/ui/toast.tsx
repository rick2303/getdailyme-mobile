import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { Animated, Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { cn } from '@/lib/utils/cn'

type ToastKind = 'success' | 'error'
type ToastAction = { label: string; onPress: () => void }
type ToastState = { message: string; kind: ToastKind; action?: ToastAction } | null

const ToastContext = createContext<{
  showToast: (message: string, kind?: ToastKind, action?: ToastAction) => void
} | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState>(null)
  const opacity = useRef(new Animated.Value(0)).current
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const insets = useSafeAreaInsets()

  const dismiss = useCallback(() => {
    Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() =>
      setToast(null),
    )
  }, [opacity])

  const showToast = useCallback(
    (message: string, kind: ToastKind = 'success', action?: ToastAction) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      setToast({ message, kind, action })
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start()
      // Con accion (deshacer) se da mas margen, como en la web.
      timeoutRef.current = setTimeout(dismiss, action ? 5000 : 2600)
    },
    [opacity, dismiss],
  )

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast ? (
        <Animated.View
          style={{ opacity, position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 88 }}
        >
          <View
            className={cn(
              'flex-row items-center justify-center gap-3 rounded-2xl px-4 py-3',
              toast.kind === 'error' ? 'bg-danger' : 'bg-text dark:bg-surface-raised-dark',
            )}
          >
            <Text className="flex-1 text-center text-sm font-semibold text-white dark:text-text-dark">
              {toast.message}
            </Text>
            {toast.action ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  toast.action?.onPress()
                  if (timeoutRef.current) clearTimeout(timeoutRef.current)
                  dismiss()
                }}
                className="rounded-full bg-white/20 px-3 py-1.5"
              >
                <Text className="text-sm font-bold text-white dark:text-text-dark">
                  {toast.action.label}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside ToastProvider')
  return context
}
