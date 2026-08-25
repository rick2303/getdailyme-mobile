import DateTimePicker from '@react-native-community/datetimepicker'
import { Platform, View } from 'react-native'

import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n/provider'

// El picker de hora se comporta distinto en cada plataforma y hay que tratarlo
// distinto:
//
//   Android abre un dialogo del sistema y avisa una sola vez, con `set` o
//   `dismissed`; ahi cerrar dentro de onChange es lo correcto.
//
//   iOS lo pinta dentro de la pantalla y avisa en CADA giro de la rueda. Si se
//   cierra en el primer aviso, el picker desaparece en cuanto lo rozas y solo
//   se puede elegir el primer minuto al que llegues. Por eso en iOS se queda
//   abierto y se cierra con "Listo".
export function TimePicker({
  value,
  onChange,
  onClose,
}: {
  value: Date
  onChange: (next: Date) => void
  onClose: () => void
}) {
  const { t, locale } = useI18n()
  const isIos = Platform.OS === 'ios'

  const picker = (
    <DateTimePicker
      value={value}
      mode="time"
      locale={locale}
      display={isIos ? 'spinner' : 'default'}
      onChange={(event, selected) => {
        if (!isIos) onClose()
        if (event.type === 'dismissed') return
        if (selected) onChange(selected)
      }}
    />
  )

  if (!isIos) return picker

  return (
    <View className="gap-1 rounded-2xl bg-surface-sunken p-2 dark:bg-surface-sunken-dark">
      {picker}
      <Button title={t('common.done')} variant="secondary" size="sm" fullWidth onPress={onClose} />
    </View>
  )
}
