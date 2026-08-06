import * as Haptics from 'expo-haptics'
import { Platform } from 'react-native'

// Mismos nombres que la web (haptic("tap"|"success"|"warning")) para que los
// componentes portados no cambien; debajo, el motor nativo de expo-haptics.
export type HapticKind = 'tap' | 'success' | 'warning'

export function haptic(kind: HapticKind) {
  if (Platform.OS === 'web') return
  switch (kind) {
    case 'tap':
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      break
    case 'success':
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      break
    case 'warning':
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
      break
  }
}
