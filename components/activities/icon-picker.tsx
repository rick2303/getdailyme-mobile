import { Search } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, View, useWindowDimensions } from 'react-native'

import { TextInput } from '@/components/ui/field'
import { Sheet } from '@/components/ui/sheet'
import { useActivityHex, useThemeColors } from '@/constants/colors'
import { useI18n } from '@/i18n/provider'
import type { TranslationKey } from '@/i18n/translate'
import type { ActivityColor } from '@/lib/activities/colors'
import { getIconComponent } from '@/lib/icons'
import { ICON_CATALOG, ICON_CATEGORIES, findIcons, type IconCategory } from '@/lib/icons/catalog'
import { haptic } from '@/lib/utils/haptics'

// El buscador de iconos de la web: busqueda por nombre, chips de categoria y
// rejilla de cinco columnas donde el elegido toma el color de la actividad.
export function IconPickerSheet({
  open,
  value,
  color,
  onSelect,
  onClose,
}: {
  open: boolean
  value: string
  color: ActivityColor
  onSelect: (icon: string) => void
  onClose: () => void
}) {
  const { t, locale } = useI18n()
  const colors = useThemeColors()
  const hex = useActivityHex(color)
  const { width } = useWindowDimensions()

  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<IconCategory | null>(null)

  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setQuery('')
      setCategory(null)
    }
  }

  const results = useMemo(() => {
    if (query.trim().length > 0) return findIcons(query, locale, category ?? undefined)
    if (category) return ICON_CATALOG.filter((icon) => icon.category === category)
    return ICON_CATALOG
  }, [query, locale, category])

  const cell = Math.floor((Math.min(width, 500) - 40 - 4 * 10) / 5)

  return (
    <Sheet open={open} onClose={onClose} title={t('activity.iconLabel')} closeLabel={t('common.close')}>
      <View className="gap-3 pt-1">
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t('activity.iconSearchPlaceholder')}
          leading={<Search size={20} color={colors.textSubtle} />}
          autoCapitalize="none"
          autoCorrect={false}
        />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 pb-1">
          <CategoryChip
            label={t('common.seeAll')}
            active={category === null}
            onPress={() => setCategory(null)}
          />
          {ICON_CATEGORIES.map((item) => (
            <CategoryChip
              key={item}
              label={t(`iconCategories.${item}` as TranslationKey)}
              active={category === item}
              onPress={() => setCategory(item)}
            />
          ))}
        </ScrollView>

        {results.length === 0 ? (
          <Text className="py-10 text-center text-sm text-text-muted dark:text-text-muted-dark">
            {t('activity.iconNoResults', { query })}
          </Text>
        ) : (
          <View className="flex-row flex-wrap gap-2.5 pb-2">
            {results.map((item) => {
              const Glyph = getIconComponent(item.name)
              const selected = item.name === value
              return (
                <Pressable
                  key={item.name}
                  accessibilityRole="button"
                  accessibilityLabel={item.labels[locale] ?? item.labels.es}
                  accessibilityState={{ selected }}
                  onPress={() => {
                    haptic('tap')
                    onSelect(item.name)
                  }}
                  className={
                    selected
                      ? 'items-center justify-center rounded-2xl active:opacity-70'
                      : 'items-center justify-center rounded-2xl bg-surface-sunken dark:bg-surface-sunken-dark active:opacity-70'
                  }
                  style={{
                    width: cell,
                    height: cell,
                    backgroundColor: selected ? hex : undefined,
                  }}
                >
                  <Glyph size={24} color={selected ? '#fff' : colors.textMuted} />
                </Pressable>
              )
            })}
          </View>
        )}
      </View>
    </Sheet>
  )
}

function CategoryChip({
  label,
  active,
  onPress,
}: {
  label: string
  active: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      className={
        active
          ? 'rounded-full bg-brand px-3.5 py-1.5 active:opacity-70'
          : 'rounded-full bg-surface-sunken px-3.5 py-1.5 dark:bg-surface-sunken-dark active:opacity-70'
      }
    >
      <Text
        className={
          active
            ? 'text-sm font-semibold text-white'
            : 'text-sm font-semibold text-text-muted dark:text-text-muted-dark'
        }
      >
        {label}
      </Text>
    </Pressable>
  )
}
