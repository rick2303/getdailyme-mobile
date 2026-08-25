import { X } from 'lucide-react-native'
import { Image, Modal, Pressable, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { IconButton } from './button'

export function PhotoViewer({
  open,
  src,
  onClose,
  closeLabel,
}: {
  open: boolean
  src: string | null
  onClose: () => void
  closeLabel: string
}) {
  const insets = useSafeAreaInsets()

  return (
    <Modal visible={open && src !== null} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-black/95">
        <Pressable
        accessibilityRole="button"
        accessibilityLabel={closeLabel}
        className="absolute inset-0"
        onPress={onClose}
      />
        {src ? (
          <Image source={{ uri: src }} className="h-[80%] w-full" resizeMode="contain" />
        ) : null}
        <View style={{ position: 'absolute', top: insets.top + 8, right: 12 }}>
          <IconButton label={closeLabel} onPress={onClose} className="bg-white/15">
            <X size={20} color="#fff" />
          </IconButton>
        </View>
      </View>
    </Modal>
  )
}
