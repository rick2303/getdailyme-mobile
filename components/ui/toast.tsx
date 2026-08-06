import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { Animated, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { cn } from '@/lib/utils/cn'

type ToastKind = 'success' | 'error'
type ToastState = { message: string; kind: ToastKind } | null

const ToastContext = createContext<{ showToast: (message: string, kind?: ToastKind) => void } | null>(
  null,
)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState>(null)
  const opacity = useRef(new Animated.Value(0)).current
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const insets = useSafeAreaInsets()

  const showToast = useCallback(
    (message: string, kind: ToastKind = 'success') => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      setToast({ message, kind })
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start()
      timeoutRef.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }).start(() =>
          setToast(null),
        )
      }, 2600)
    },
    [opacity],
  )

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast ? (
        <Animated.View
          pointerEvents="none"
          style={{ opacity, position: 'absolute', left: 16, right: 16, bottom: insets.bottom + 88 }}
        >
          <View
            className={cn(
              'items-center rounded-2xl px-4 py-3',
              toast.kind === 'error' ? 'bg-danger' : 'bg-text dark:bg-surface-raised-dark',
            )}
          >
            <Text className="text-center text-sm font-semibold text-white dark:text-text-dark">
              {toast.message}
            </Text>
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
