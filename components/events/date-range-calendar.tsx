import { ChevronLeft, ChevronRight } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import { IconButton } from '@/components/ui/button'
import { SHADOW_TILE, useThemeColors, withTint } from '@/constants/colors'
import { useI18n } from '@/i18n/provider'
import { useTimeZone } from '@/lib/auth/provider'
import {
  buildMonthGrid,
  monthLabelDate,
  monthOf,
  shiftMonth,
  weekdayLabels,
  type CalendarMonth,
} from '@/lib/events/calendar'
import { formatMonthYear, todayKey } from '@/lib/utils/dates'

// El calendario de mes como selector de rango: un toque marca el inicio, otro
// posterior marca el fin y la franja se pinta entre medio. Nada de dialogos
// del sistema.
export function DateRangeCalendar({
  start,
  end,
  onPickDay,
}: {
  start: string
  end: string | null
  onPickDay: (day: string) => void
}) {
  const { t, locale } = useI18n()
  const colors = useThemeColors()
  const timeZone = useTimeZone()
  const today = todayKey(timeZone)

  const [month, setMonth] = useState<CalendarMonth>(() => monthOf(start))

  const grid = useMemo(() => buildMonthGrid(month, today), [month, today])
  const labels = weekdayLabels(locale)

  return (
    <View
      style={SHADOW_TILE}
      className="rounded-3xl border border-border bg-surface p-3 dark:border-border-dark dark:bg-surface-dark"
    >
      <View className="flex-row items-center justify-between">
        <IconButton label={t('events.calendarPrevMonth')} onPress={() => setMonth((m) => shiftMonth(m, -1))}>
          <ChevronLeft size={18} color={colors.textMuted} />
        </IconButton>
        <Text className="text-sm font-bold capitalize text-text dark:text-text-dark">
          {formatMonthYear(monthLabelDate(month), locale)}
        </Text>
        <IconButton label={t('events.calendarNextMonth')} onPress={() => setMonth((m) => shiftMonth(m, 1))}>
          <ChevronRight size={18} color={colors.textMuted} />
        </IconButton>
      </View>

      <View className="flex-row">
        {labels.map((label, index) => (
          <Text
            key={index}
            className="flex-1 text-center text-[10px] font-bold uppercase text-text-subtle dark:text-text-subtle-dark"
          >
            {label}
          </Text>
        ))}
      </View>

      <View className="flex-row flex-wrap pt-1">
        {grid.map((day) => {
          const isStart = day.key === start
          const isEnd = end !== null && day.key === end
          const inRange = end !== null && day.key > start && day.key < end
          const isEdge = isStart || isEnd

          return (
            <Pressable
              key={day.key}
              accessibilityRole="button"
              accessibilityState={{ selected: isEdge }}
              onPress={() => onPickDay(day.key)}
              className="items-center py-0.5 active:opacity-70"
              style={{ width: `${100 / 7}%` }}
            >
              <View
                className="h-9 w-full items-center justify-center"
                style={{
                  backgroundColor: inRange ? withTint(colors.brand) : 'transparent',
                }}
              >
                <View
                  className="h-9 w-9 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: isEdge ? colors.brand : 'transparent',
                    borderWidth: day.isToday && !isEdge ? 1 : 0,
                    borderColor: colors.brand,
                  }}
                >
                  <Text
                    maxFontSizeMultiplier={1.2}
                    className="text-sm font-semibold"
                    style={{
                      color: isEdge
                        ? '#fff'
                        : day.inMonth
                          ? day.isToday
                            ? colors.brand
                            : colors.text
                          : colors.textSubtle,
                    }}
                  >
                    {day.dayOfMonth}
                  </Text>
                </View>
              </View>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}
