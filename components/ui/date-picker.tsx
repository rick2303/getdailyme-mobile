import DateTimePicker from '@react-native-community/datetimepicker'
import { useState } from 'react'
import { Platform, View } from 'react-native'

import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n/provider'

export function dateKeyToLocalDate(key: string): Date {
  const [year, month, day] = key.split('-').map(Number)
  return new Date(year, month - 1, day, 12)
}

export function localDateToKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function DatePicker({
  value,
  maximumDate,
  onChange,
  onClose,
}: {
  value: Date
  maximumDate?: Date
  onChange: (next: Date) => void
  onClose: () => void
}) {
  const { t, locale } = useI18n()
  const isIos = Platform.OS === 'ios'
  const [draft, setDraft] = useState(value)

  const picker = (
    <DateTimePicker
      value={isIos ? draft : value}
      mode="date"
      locale={locale}
      maximumDate={maximumDate}
      display={isIos ? 'spinner' : 'default'}
      onChange={(event, selected) => {
        if (!isIos) {
          onClose()
          if (event.type === 'set' && selected) onChange(selected)
          return
        }
        if (selected) setDraft(selected)
      }}
    />
  )

  if (!isIos) return picker

  return (
    <View className="gap-1 rounded-2xl bg-surface-sunken p-2 dark:bg-surface-sunken-dark">
      {picker}
      <Button
        title={t('common.done')}
        variant="secondary"
        size="sm"
        fullWidth
        onPress={() => {
          if (localDateToKey(draft) !== localDateToKey(value)) onChange(draft)
          onClose()
        }}
      />
    </View>
  )
}
