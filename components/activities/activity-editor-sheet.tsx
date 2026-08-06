import { Check } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'

import { ActivityIcon } from '@/components/activities/activity-icon'
import { Button } from '@/components/ui/button'
import { TextInput } from '@/components/ui/field'
import { Sheet } from '@/components/ui/sheet'
import { useToast } from '@/components/ui/toast'
import { ACTIVITY_HEX, useActivityHex } from '@/constants/colors'
import { useI18n } from '@/i18n/provider'
import type { TranslationKey } from '@/i18n/translate'
import { ACTIVITY_COLORS, DEFAULT_ACTIVITY_COLOR, type ActivityColor } from '@/lib/activities/colors'
import { defaultModeForUnit, defaultQuickValues } from '@/lib/activities/input-modes'
import { ACTIVITY_UNITS, type ActivityUnit } from '@/lib/activities/units'
import { ICON_CATALOG } from '@/lib/icons/catalog'
import { useActivities, useCreateActivity } from '@/lib/hooks/use-activities'

// Version compacta del editor web para crear actividades: nombre, icono,
// color, unidad y meta. Editar/archivar llega con la fase de gestion.
const ICON_CHOICES = ICON_CATALOG.slice(0, 24)

export function ActivityEditorSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, locale } = useI18n()
  const { showToast } = useToast()
  const { data: activities } = useActivities()
  const create = useCreateActivity()

  const [name, setName] = useState('')
  const [icon, setIcon] = useState('circle-dot')
  const [color, setColor] = useState<ActivityColor>(DEFAULT_ACTIVITY_COLOR)
  const [unit, setUnit] = useState<ActivityUnit>('count')
  const [target, setTarget] = useState('')

  const reset = () => {
    setName('')
    setIcon('circle-dot')
    setColor(DEFAULT_ACTIVITY_COLOR)
    setUnit('count')
    setTarget('')
  }

  const save = () => {
    if (name.trim().length === 0) {
      showToast(t('activity.nameRequired'), 'error')
      return
    }

    const position =
      (activities ?? []).reduce((max, item) => Math.max(max, item.position), -1) + 1
    const parsedTarget = Number(target)

    create.createActivity(
      {
        name: name.trim(),
        icon,
        color,
        unit,
        step: 1,
        daily_target: Number.isFinite(parsedTarget) && parsedTarget > 0 ? parsedTarget : null,
        target_period: 'day',
        reminder_at: null,
        visibility: 'friends',
        input_mode: defaultModeForUnit(unit),
        quick_values: defaultQuickValues(unit),
      },
      position,
    )

    showToast(t('activity.saved'), 'success')
    reset()
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('activity.newTitle')}
      closeLabel={t('common.close')}
      footer={<Button title={t('common.save')} size="lg" fullWidth onPress={save} />}
    >
      <View className="gap-5 pt-2">
        <View className="flex-row items-center gap-3">
          <ActivityIcon icon={icon} color={color} size="md" />
          <View className="flex-1">
            <TextInput
              label={t('activity.nameLabel')}
              placeholder={t('activity.namePlaceholder')}
              value={name}
              maxLength={40}
              onChangeText={setName}
            />
          </View>
        </View>

        <View className="gap-2">
          <Text className="px-1 text-sm font-semibold text-text-muted dark:text-text-muted-dark">
            {t('activity.iconLabel')}
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {ICON_CHOICES.map((entry) => (
              <Pressable
                key={entry.name}
                accessibilityRole="button"
                accessibilityLabel={entry.labels[locale] ?? entry.labels.es}
                accessibilityState={{ selected: icon === entry.name }}
                onPress={() => setIcon(entry.name)}
                className={
                  icon === entry.name
                    ? 'rounded-2xl border-2 border-brand'
                    : 'rounded-2xl border-2 border-transparent'
                }
              >
                <ActivityIcon icon={entry.name} color={color} size="sm" />
              </Pressable>
            ))}
          </View>
        </View>

        <View className="gap-2">
          <Text className="px-1 text-sm font-semibold text-text-muted dark:text-text-muted-dark">
            {t('activity.colorLabel')}
          </Text>
          <View className="flex-row flex-wrap gap-2.5">
            {ACTIVITY_COLORS.map((value) => (
              <ColorDot
                key={value}
                color={value}
                selected={color === value}
                onPress={() => setColor(value)}
              />
            ))}
          </View>
        </View>

        <View className="gap-2">
          <Text className="px-1 text-sm font-semibold text-text-muted dark:text-text-muted-dark">
            {t('activity.unitLabel')}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
            {ACTIVITY_UNITS.map((value) => (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityState={{ selected: unit === value }}
                onPress={() => setUnit(value)}
                className={
                  unit === value
                    ? 'h-10 items-center justify-center rounded-full bg-brand px-4'
                    : 'h-10 items-center justify-center rounded-full bg-surface-sunken px-4 dark:bg-surface-sunken-dark'
                }
              >
                <Text
                  className={
                    unit === value
                      ? 'text-sm font-semibold text-white'
                      : 'text-sm font-semibold text-text-muted dark:text-text-muted-dark'
                  }
                >
                  {t(`units.${value}` as TranslationKey, { count: 2 })}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        <TextInput
          label={`${t('activity.targetLabel')} (${t('common.optional')})`}
          placeholder="8"
          keyboardType="number-pad"
          value={target}
          onChangeText={setTarget}
          hint={t('activity.targetHelp')}
        />
      </View>
    </Sheet>
  )
}

function ColorDot({
  color,
  selected,
  onPress,
}: {
  color: ActivityColor
  selected: boolean
  onPress: () => void
}) {
  const hex = useActivityHex(color)
  void ACTIVITY_HEX

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={color}
      accessibilityState={{ selected }}
      onPress={onPress}
      className="h-11 w-11 items-center justify-center rounded-full"
      style={{ backgroundColor: hex }}
    >
      {selected ? <Check size={18} color="#fff" strokeWidth={3} /> : null}
    </Pressable>
  )
}
