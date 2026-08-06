import { useT } from '@/i18n/provider'

import { Button } from './button'
import { Sheet } from './sheet'
import { View } from 'react-native'

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  destructive = true,
  pending = false,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  body?: string
  confirmLabel?: string
  destructive?: boolean
  pending?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const t = useT()

  return (
    <Sheet open={open} onClose={onCancel} title={title} description={body} closeLabel={t('common.close')}>
      <View className="gap-2 pt-2">
        <Button
          title={confirmLabel ?? t('common.confirm')}
          variant={destructive ? 'danger' : 'primary'}
          size="lg"
          fullWidth
          loading={pending}
          onPress={onConfirm}
        />
        <Button title={t('common.cancel')} variant="ghost" size="lg" fullWidth onPress={onCancel} />
      </View>
    </Sheet>
  )
}
