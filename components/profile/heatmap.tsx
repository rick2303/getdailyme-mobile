import { useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'

import { useActivityHex, useThemeColors } from '@/constants/colors'
import { useI18n } from '@/i18n/provider'
import {
  DAYS_PER_WEEK,
  HEATMAP_DAYS,
  heatmapColumns,
  monthMarkers,
  type HeatmapCell,
} from '@/lib/activities/heatmap'
import { useActivityLabels } from '@/lib/activities/labels'
import { buildHeatmap } from '@/lib/activities/streaks'
import { useTimeZone } from '@/lib/auth/provider'
import { useActiveActivities } from '@/lib/hooks/use-activities'
import { useLogCountsByActivity } from '@/lib/hooks/use-logs'
import { dateKeyToDate, todayKey } from '@/lib/utils/dates'

const INTENSITY_ALPHA = ['00', '3D', '70', 'AD', 'FF']
const CELL = 14
const GAP = 4

function intensityLevel(total: number, max: number): number {
  if (total <= 0) return 0
  if (max <= 1) return 4
  const ratio = total / max
  if (ratio <= 0.25) return 1
  if (ratio <= 0.5) return 2
  if (ratio <= 0.75) return 3
  return 4
}

// El mapa de 4 meses del perfil web: columnas por semana, meses arriba, y tocar
// un dia dice fecha y registros.
export function Heatmap() {
  const { t, locale } = useI18n()
  const colors = useThemeColors()
  const { activityName } = useActivityLabels()
  const timeZone = useTimeZone()
  const { data: activities } = useActiveActivities()
  const { byActivity } = useLogCountsByActivity()
  const scrollerRef = useRef<ScrollView>(null)

  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null)
  const [selected, setSelected] = useState<HeatmapCell | null>(null)

  const today = todayKey(timeZone)
  const selectable = activities ?? []
  const selectedActivity = selectable.find((activity) => activity.id === selectedActivityId)
  const accent = useActivityHex(selectedActivity?.color ?? 'indigo')
  const tint = selectedActivity ? accent : colors.brand

  const totalsByDate = useMemo(() => {
    const totals = new Map<string, number>()
    for (const [activityId, days] of byActivity) {
      if (selectedActivityId && activityId !== selectedActivityId) continue
      for (const [day, count] of days) {
        totals.set(day, (totals.get(day) ?? 0) + count)
      }
    }
    return totals
  }, [byActivity, selectedActivityId])

  const cells = useMemo(() => buildHeatmap(totalsByDate, today, HEATMAP_DAYS), [totalsByDate, today])
  const maxTotal = cells.reduce((max, cell) => Math.max(max, cell.total), 0)
  const weekdayLabels = t('stats.weekdayLabels').split(' ')
  const mondayIndex = (dateKeyToDate(today).getUTCDay() + 6) % DAYS_PER_WEEK
  const leadingBlanks = (mondayIndex + 1) % DAYS_PER_WEEK

  const columns = useMemo(() => heatmapColumns(cells, leadingBlanks), [cells, leadingBlanks])
  const monthLabels = useMemo(() => {
    const format = new Intl.DateTimeFormat(locale, { timeZone: 'UTC', month: 'short' })
    return monthMarkers(columns).map((date) => (date ? format.format(dateKeyToDate(date)) : null))
  }, [columns, locale])

  useEffect(() => {
    const timeout = setTimeout(() => scrollerRef.current?.scrollToEnd({ animated: false }), 50)
    return () => clearTimeout(timeout)
  }, [columns])

  const readout = selected
    ? `${new Intl.DateTimeFormat(locale, {
        timeZone: 'UTC',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }).format(dateKeyToDate(selected.date))} · ${t('stats.logsOnDay', { count: selected.total })}`
    : t('stats.heatmapHint')

  return (
    <View className="gap-2">
      <Text className="px-1 text-sm font-bold uppercase tracking-wide text-text dark:text-text-dark">
        {t('stats.heatmapTitle')}
      </Text>

      {selectable.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 pb-1">
          <FilterChip
            label={t('stats.allActivities')}
            selected={selectedActivityId === null}
            onPress={() => setSelectedActivityId(null)}
          />
          {selectable.map((activity) => (
            <FilterChip
              key={activity.id}
              label={activityName(activity.name)}
              selected={activity.id === selectedActivityId}
              onPress={() => setSelectedActivityId(activity.id)}
            />
          ))}
        </ScrollView>
      ) : null}

      <View className="rounded-3xl border border-border bg-surface p-4 dark:border-border-dark dark:bg-surface-dark">
        {maxTotal === 0 ? (
          <Text className="py-6 text-center text-sm text-text-muted dark:text-text-muted-dark">
            {t('stats.noData')}
          </Text>
        ) : (
          <View className="gap-3">
            <Text
              className="min-h-5 text-xs font-semibold"
              style={{ color: selected ? colors.text : colors.textSubtle }}
            >
              {readout.charAt(0).toUpperCase() + readout.slice(1)}
            </Text>

            <View className="flex-row gap-1.5">
              <View className="gap-1 pt-5">
                {weekdayLabels.map((label, index) => (
                  <Text
                    key={index}
                    className="w-3 text-[9px] font-semibold text-text-subtle dark:text-text-subtle-dark"
                    style={{ height: CELL }}
                  >
                    {index % 2 === 0 ? label : ''}
                  </Text>
                ))}
              </View>

              <ScrollView ref={scrollerRef} horizontal showsHorizontalScrollIndicator={false}>
                <View className="gap-1">
                  <View className="h-4 flex-row" style={{ gap: GAP }}>
                    {monthLabels.map((label, index) => (
                      <View key={index} style={{ width: CELL }}>
                        {label ? (
                          <Text
                            className="text-[9px] font-bold text-text-muted dark:text-text-muted-dark"
                            numberOfLines={1}
                            style={{ width: CELL * 3, position: 'absolute' }}
                          >
                            {label}
                          </Text>
                        ) : null}
                      </View>
                    ))}
                  </View>

                  <View className="flex-row" style={{ gap: GAP }}>
                    {columns.map((column, columnIndex) => (
                      <View key={columnIndex} style={{ gap: GAP }}>
                        {Array.from({ length: DAYS_PER_WEEK }).map((_, rowIndex) => {
                          const cell = column[rowIndex]
                          if (!cell) {
                            return <View key={rowIndex} style={{ width: CELL, height: CELL }} />
                          }
                          const level = intensityLevel(cell.total, maxTotal)
                          const isSelected = selected?.date === cell.date
                          return (
                            <Pressable
                              className="active:opacity-70"
                              key={cell.date}
                              accessibilityRole="button"
                              accessibilityState={{ selected: isSelected }}
                              accessibilityLabel={`${cell.date} · ${cell.total}`}
                              onPress={() =>
                                setSelected((previous) =>
                                  previous?.date === cell.date ? null : cell,
                                )
                              }
                              style={{
                                width: CELL,
                                height: CELL,
                                borderRadius: 4,
                                backgroundColor:
                                  level === 0
                                    ? colors.surfaceSunken
                                    : `${tint}${INTENSITY_ALPHA[level]}`,
                                borderWidth: isSelected ? 2 : 0,
                                borderColor: colors.text,
                              }}
                            />
                          )
                        })}
                      </View>
                    ))}
                  </View>
                </View>
              </ScrollView>
            </View>

            <View className="flex-row items-center justify-end gap-1.5">
              <Text className="text-[10px] font-medium text-text-subtle dark:text-text-subtle-dark">
                {t('stats.less')}
              </Text>
              {INTENSITY_ALPHA.map((alpha, level) => (
                <View
                  key={level}
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 4,
                    backgroundColor: level === 0 ? colors.surfaceSunken : `${tint}${alpha}`,
                  }}
                />
              ))}
              <Text className="text-[10px] font-medium text-text-subtle dark:text-text-subtle-dark">
                {t('stats.more')}
              </Text>
            </View>
          </View>
        )}
      </View>
    </View>
  )
}

function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string
  selected: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={
        selected
          ? 'h-10 items-center justify-center rounded-full bg-brand-soft px-4 dark:bg-brand-soft-dark active:opacity-70'
          : 'h-10 items-center justify-center rounded-full border border-border bg-surface px-4 dark:border-border-dark dark:bg-surface-dark active:opacity-70'
      }
    >
      <Text
        maxFontSizeMultiplier={1.2}
        className={
          selected
            ? 'text-sm font-semibold text-brand dark:text-brand-dark'
            : 'text-sm font-semibold text-text-muted dark:text-text-muted-dark'
        }
      >
        {label}
      </Text>
    </Pressable>
  )
}
