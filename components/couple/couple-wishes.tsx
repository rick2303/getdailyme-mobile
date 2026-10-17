import { useRouter } from 'expo-router'
import { CalendarHeart, CalendarPlus, Check, Plus, Trash2 } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, Text, TextInput as RNTextInput, View } from 'react-native'

import { CoupleGroup } from '@/components/couple/couple-group'
import { Button } from '@/components/ui/button'
import { DatePicker, dateKeyToLocalDate, localDateToKey } from '@/components/ui/date-picker'
import { Sheet } from '@/components/ui/sheet'
import { useToast } from '@/components/ui/toast'
import { useThemeColors } from '@/constants/colors'
import { useI18n } from '@/i18n/provider'
import type { Couple } from '@/lib/api/couple'
import {
  nextSaturdayKey,
  wishEventInput,
  WISH_TITLE_MAX,
  type CoupleWish,
} from '@/lib/api/couple-wishes'
import { useTimeZone } from '@/lib/auth/provider'
import {
  useAddWish,
  useDeleteWish,
  useLinkWishToEvent,
  useToggleWish,
  useWishes,
} from '@/lib/hooks/use-couple-wishes'
import { useCreateEvent } from '@/lib/hooks/use-events'
import { ICON_STROKE } from '@/lib/icons/tokens'
import { cn } from '@/lib/utils/cn'
import { formatLongDate } from '@/lib/utils/dates'
import { haptic } from '@/lib/utils/haptics'

// La lista de cosas por hacer juntos. Tachar es un toque en el circulo; lo
// demas —convertirla en plan o quitarla— vive en la hoja de la fila.
export function CoupleWishes({ couple, today }: { couple: Couple; today: string }) {
  const { t, locale } = useI18n()
  const { showToast } = useToast()
  const colors = useThemeColors()
  const router = useRouter()
  const timeZone = useTimeZone()
  const { data: wishes } = useWishes(couple.id)
  const addWish = useAddWish(couple.id)
  const toggleWish = useToggleWish(couple.id)
  const deleteWish = useDeleteWish(couple.id)
  const linkWish = useLinkWishToEvent(couple.id)
  const createEvent = useCreateEvent()

  const [draft, setDraft] = useState('')
  const [showDone, setShowDone] = useState(false)
  const [selected, setSelected] = useState<CoupleWish | null>(null)
  const [planning, setPlanning] = useState(false)
  const [planDate, setPlanDate] = useState(() => nextSaturdayKey(today))
  const [pickingDate, setPickingDate] = useState(false)

  const list = wishes ?? []
  const pending = list.filter((wish) => !wish.doneAt)
  const done = list.filter((wish) => wish.doneAt)

  const add = () => {
    const title = draft.trim()
    if (!title) return
    haptic('tap')
    setDraft('')
    addWish.mutate(
      { title },
      {
        onError: () => {
          setDraft(title)
          showToast(t('common.genericError'), 'error')
        },
      },
    )
  }

  const toggle = (wish: CoupleWish) => {
    haptic(wish.doneAt ? 'tap' : 'success')
    toggleWish.mutate(
      { wishId: wish.id, done: !wish.doneAt },
      { onError: () => showToast(t('common.genericError'), 'error') },
    )
  }

  const closeSheet = () => {
    setSelected(null)
    setPlanning(false)
    setPickingDate(false)
  }

  const makePlan = () => {
    if (!selected) return
    const eventId = createEvent.createEvent(wishEventInput(selected, planDate, timeZone), [
      couple.partner.id,
    ])
    if (!eventId) {
      showToast(t('common.genericError'), 'error')
      return
    }
    haptic('success')
    linkWish.mutate({ wishId: selected.id, eventId })
    showToast(t('wishes.planCreated', { name: couple.partner.displayName }), 'success')
    closeSheet()
  }

  const renderRow = (wish: CoupleWish) => (
    <View
      key={wish.id}
      className="min-h-12 flex-row items-center gap-1 border-b border-border pr-4 dark:border-border-dark"
    >
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: Boolean(wish.doneAt) }}
        accessibilityLabel={wish.doneAt ? t('wishes.markPending') : t('wishes.markDone')}
        onPress={() => toggle(wish)}
        className="h-12 w-12 items-center justify-center"
      >
        <View
          className={cn(
            'h-6 w-6 items-center justify-center rounded-full border-2',
            wish.doneAt ? 'border-brand bg-brand' : 'border-text-subtle dark:border-text-subtle-dark',
          )}
        >
          {wish.doneAt ? <Check size={14} color="#fff" strokeWidth={ICON_STROKE.tiny} /> : null}
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          haptic('tap')
          setPlanDate(nextSaturdayKey(today))
          setSelected(wish)
        }}
        className="min-w-0 flex-1 py-2.5 active:opacity-70"
      >
        <Text
          numberOfLines={2}
          className={cn(
            'text-[15px]',
            wish.doneAt
              ? 'text-text-subtle line-through dark:text-text-subtle-dark'
              : 'text-text dark:text-text-dark',
          )}
        >
          {wish.title}
        </Text>
        {wish.doneAt ? (
          <Text className="text-xs text-text-subtle dark:text-text-subtle-dark">
            {t('wishes.doneOn', { date: formatLongDate(new Date(wish.doneAt), locale) })}
          </Text>
        ) : wish.eventId ? (
          <View className="flex-row items-center gap-1">
            <CalendarHeart size={14} color={colors.brand} />
            <Text className="text-xs font-semibold text-brand dark:text-brand-dark">
              {t('wishes.planned')}
            </Text>
          </View>
        ) : null}
      </Pressable>
    </View>
  )

  return (
    <>
      <CoupleGroup
        header={t('wishes.header')}
        footer={list.length === 0 ? t('wishes.empty') : undefined}
      >
        <View className="flex-row items-center gap-2 border-b border-border px-4 dark:border-border-dark">
          <RNTextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={t('wishes.addPlaceholder')}
            placeholderTextColor={colors.textSubtle}
            maxLength={WISH_TITLE_MAX}
            returnKeyType="done"
            onSubmitEditing={add}
            accessibilityLabel={t('wishes.addPlaceholder')}
            className="min-h-12 flex-1 text-text dark:text-text-dark"
            style={{ fontSize: 16 }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('wishes.add')}
            disabled={!draft.trim()}
            onPress={add}
            className={cn(
              'h-11 w-11 items-center justify-center rounded-full',
              draft.trim() ? 'bg-brand' : 'bg-surface-sunken dark:bg-surface-sunken-dark',
            )}
          >
            <Plus
              size={20}
              color={draft.trim() ? '#fff' : colors.textSubtle}
              strokeWidth={ICON_STROKE.emphasis}
            />
          </Pressable>
        </View>

        {pending.map(renderRow)}
        {showDone ? done.map(renderRow) : null}

        {done.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setShowDone((value) => !value)}
            className="px-4 py-3 active:opacity-70"
          >
            <Text className="text-sm font-semibold text-brand dark:text-brand-dark">
              {showDone ? t('wishes.hideDone') : t('wishes.showDone', { count: done.length })}
            </Text>
          </Pressable>
        ) : null}
      </CoupleGroup>

      <Sheet
        open={selected !== null}
        onClose={closeSheet}
        title={selected?.title}
        closeLabel={t('common.close')}
        footer={
          planning ? (
            <Button title={t('wishes.makePlan')} fullWidth size="lg" onPress={makePlan} />
          ) : undefined
        }
      >
        {selected && planning ? (
          <View className="gap-3 pb-2">
            <Pressable
              accessibilityRole="button"
              onPress={() => setPickingDate((value) => !value)}
              className="min-h-14 flex-row items-center justify-between rounded-2xl bg-surface-sunken px-4 dark:bg-surface-sunken-dark"
            >
              <Text className="text-[15px] font-bold text-text dark:text-text-dark">
                {t('wishes.planDate')}
              </Text>
              <Text className="text-[15px] font-semibold text-brand dark:text-brand-dark">
                {formatLongDate(new Date(`${planDate}T00:00:00Z`), locale)}
              </Text>
            </Pressable>
            {pickingDate ? (
              <DatePicker
                value={dateKeyToLocalDate(planDate)}
                minimumDate={dateKeyToLocalDate(today)}
                onClose={() => setPickingDate(false)}
                onChange={(date) => setPlanDate(localDateToKey(date))}
              />
            ) : null}
          </View>
        ) : selected ? (
          <View className="gap-2 pb-2">
            {selected.eventId ? (
              <SheetOption
                icon={<CalendarHeart size={20} color={colors.brand} />}
                label={t('wishes.openPlan')}
                onPress={() => {
                  closeSheet()
                  router.push({ pathname: '/feed', params: { tab: 'events' } })
                }}
              />
            ) : (
              <SheetOption
                icon={<CalendarPlus size={20} color={colors.brand} />}
                label={t('wishes.makePlan')}
                onPress={() => setPlanning(true)}
              />
            )}
            <SheetOption
              icon={<Check size={20} color={colors.brand} />}
              label={selected.doneAt ? t('wishes.markPending') : t('wishes.markDone')}
              onPress={() => {
                toggle(selected)
                closeSheet()
              }}
            />
            <SheetOption
              icon={<Trash2 size={20} color={colors.danger} />}
              label={t('wishes.delete')}
              destructive
              onPress={() => {
                haptic('warning')
                deleteWish.mutate(selected.id, {
                  onError: () => showToast(t('common.genericError'), 'error'),
                })
                closeSheet()
              }}
            />
          </View>
        ) : null}
      </Sheet>
    </>
  )
}

function SheetOption({
  icon,
  label,
  destructive = false,
  onPress,
}: {
  icon: React.ReactNode
  label: string
  destructive?: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className="min-h-14 flex-row items-center gap-3 rounded-2xl bg-surface-sunken px-4 active:opacity-70 dark:bg-surface-sunken-dark"
    >
      {icon}
      <Text
        className={cn(
          'text-[15px] font-semibold',
          destructive ? 'text-danger' : 'text-text dark:text-text-dark',
        )}
      >
        {label}
      </Text>
    </Pressable>
  )
}
