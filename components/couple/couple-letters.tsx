import { Lock, Mail, MailOpen, PenLine, Trash2 } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import { CoupleGroup } from '@/components/couple/couple-group'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DatePicker, dateKeyToLocalDate, localDateToKey } from '@/components/ui/date-picker'
import { TextArea, TextInput } from '@/components/ui/field'
import { Sheet } from '@/components/ui/sheet'
import { useToast } from '@/components/ui/toast'
import { useThemeColors } from '@/constants/colors'
import { useI18n } from '@/i18n/provider'
import type { Couple } from '@/lib/api/couple'
import {
  daysUntilOpen,
  LETTER_BODY_MAX,
  LETTER_TITLE_MAX,
  shelveLetters,
  type CoupleLetter,
} from '@/lib/api/couple-letters'
import { useCurrentUserId } from '@/lib/auth/provider'
import { nextMilestone } from '@/lib/couple/milestones'
import {
  useDeleteLetter,
  useLetters,
  useMarkLetterRead,
  useSealedLetters,
  useUpdateLetter,
  useWriteLetter,
} from '@/lib/hooks/use-couple-letters'
import { ICON_STROKE } from '@/lib/icons/tokens'
import { cn } from '@/lib/utils/cn'
import { formatLongDate, shiftDateKey } from '@/lib/utils/dates'
import { haptic } from '@/lib/utils/haptics'

type Draft = { id: string | null; title: string; body: string; opensOn: string }

// Cartas con fecha de apertura. Arriba lo que te han escrito: primero los
// sobres cerrados —se ve que hay carta y cuando se abre—, luego las que ya se
// pueden leer. Abajo las tuyas. El texto de una carta cerrada no llega nunca a
// este movil: lo esconde la base, no esta pantalla.
export function CoupleLetters({ couple, today }: { couple: Couple; today: string }) {
  const { t, locale } = useI18n()
  const { showToast } = useToast()
  const colors = useThemeColors()
  const userId = useCurrentUserId()
  const { data: letters } = useLetters(couple.id)
  const { data: sealed } = useSealedLetters(couple.id)
  const writeLetter = useWriteLetter(couple.id)
  const updateLetter = useUpdateLetter(couple.id)
  const deleteLetter = useDeleteLetter(couple.id)
  const markRead = useMarkLetterRead(couple.id)

  const [draft, setDraft] = useState<Draft | null>(null)
  const [reading, setReading] = useState<CoupleLetter | null>(null)
  const [tearing, setTearing] = useState<CoupleLetter | null>(null)
  const [pickingDate, setPickingDate] = useState(false)

  const partner = couple.partner.displayName
  const shelves = shelveLetters(letters ?? [], userId ?? '', today)
  const envelopes = sealed ?? []
  const mine = [...shelves.waiting, ...shelves.delivered]
  const nothing = envelopes.length === 0 && shelves.received.length === 0 && mine.length === 0

  const longDate = (key: string) => formatLongDate(new Date(`${key}T00:00:00Z`), locale)

  const anniversary = nextMilestone(couple.startedOn, today)
  const presets: { label: string; date: string }[] = [
    { label: t('letters.presetMonth'), date: shiftDateKey(today, 30) },
    ...(anniversary?.kind === 'years'
      ? [{ label: t('letters.presetAnniversary'), date: shiftDateKey(today, anniversary.in) }]
      : []),
    { label: t('letters.presetYear'), date: shiftDateKey(today, 365) },
  ]

  const opensLabel = (opensOn: string) => {
    const days = daysUntilOpen(opensOn, today)
    return days === 0 ? t('letters.opensToday') : t('letters.opensIn', { count: days })
  }

  const open = (letter: CoupleLetter) => {
    haptic('success')
    setReading(letter)
    if (!letter.readAt && letter.authorId !== userId) markRead.mutate(letter.id)
  }

  const save = () => {
    if (!draft) return
    const input = { title: draft.title, body: draft.body, opensOn: draft.opensOn }
    if (!input.title.trim() || !input.body.trim()) return
    if (input.opensOn < today) {
      showToast(t('letters.pastDate'), 'error')
      return
    }

    haptic('success')
    const onError = () => showToast(t('common.genericError'), 'error')
    if (draft.id) {
      updateLetter.mutate({ letterId: draft.id, input }, { onSuccess: () => setDraft(null), onError })
      return
    }
    writeLetter.mutate(input, {
      onSuccess: () => {
        setDraft(null)
        showToast(t('letters.sealed', { name: partner, date: longDate(input.opensOn) }), 'success')
      },
      onError,
    })
  }

  return (
    <>
      <CoupleGroup header={t('letters.header')} footer={nothing ? t('letters.empty') : undefined}>
        {envelopes.length > 0 ? (
          <View className="gap-2 border-b border-border p-4 dark:border-border-dark">
            <Text className="text-[15px] font-bold text-text dark:text-text-dark">
              {t('letters.waitingFrom', { name: partner, count: envelopes.length })}
            </Text>
            {envelopes.map((envelope) => (
              <View
                key={envelope.id}
                className="flex-row items-center gap-3 rounded-2xl bg-surface-sunken p-3 dark:bg-surface-sunken-dark"
              >
                <Lock size={20} color={colors.brand} strokeWidth={ICON_STROKE.emphasis} />
                <View className="min-w-0 flex-1">
                  <Text className="text-[15px] text-text dark:text-text-dark" numberOfLines={1}>
                    {envelope.title}
                  </Text>
                  <Text className="text-xs text-text-muted dark:text-text-muted-dark">
                    {opensLabel(envelope.opensOn)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {shelves.received.map((letter) => (
          <Row
            key={letter.id}
            icon={
              letter.readAt ? (
                <MailOpen size={20} color={colors.textSubtle} />
              ) : (
                <Mail size={20} color={colors.brand} strokeWidth={ICON_STROKE.emphasis} />
              )
            }
            title={letter.title}
            bold={!letter.readAt}
            subtitle={letter.readAt ? t('letters.from', { name: partner }) : t('letters.unread')}
            onPress={() => open(letter)}
          />
        ))}

        {mine.length > 0 ? (
          <View className="border-b border-border dark:border-border-dark">
            <Text className="px-4 pt-3 text-xs text-text-subtle dark:text-text-subtle-dark">
              {t('letters.yours')}
            </Text>
            {mine.map((letter) => {
              const waiting = letter.opensOn > today
              return (
                <Row
                  key={letter.id}
                  icon={
                    waiting ? (
                      <Lock size={20} color={colors.textSubtle} />
                    ) : (
                      <MailOpen size={20} color={colors.textSubtle} />
                    )
                  }
                  title={letter.title}
                  subtitle={
                    waiting
                      ? opensLabel(letter.opensOn)
                      : letter.readAt
                        ? t('letters.readByPartner', { name: partner })
                        : t('letters.notReadByPartner', { name: partner })
                  }
                  onPress={() =>
                    waiting
                      ? setDraft({
                          id: letter.id,
                          title: letter.title,
                          body: letter.body,
                          opensOn: letter.opensOn,
                        })
                      : open(letter)
                  }
                  borderless
                />
              )
            })}
          </View>
        ) : null}

        {/* Fila de accion de lista, como "Crear club": un boton gris a lo
            ancho dentro del bloque pesaba mas que las propias cartas. */}
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            haptic('tap')
            setDraft({ id: null, title: '', body: '', opensOn: presets[0]!.date })
          }}
          className="min-h-12 flex-row items-center gap-3 px-4 py-3 active:bg-surface-sunken dark:active:bg-surface-sunken-dark"
        >
          <PenLine size={20} color={colors.brand} strokeWidth={ICON_STROKE.emphasis} />
          <Text className="text-[17px] text-brand">{t('letters.write')}</Text>
        </Pressable>
      </CoupleGroup>

      <Sheet
        open={draft !== null}
        onClose={() => {
          setDraft(null)
          setPickingDate(false)
        }}
        title={t('letters.composeTitle', { name: partner })}
        description={t('letters.sealedHelp', { name: partner })}
        closeLabel={t('common.close')}
        footer={
          <View className="gap-2">
            <Button
              title={draft?.id ? t('letters.save') : t('letters.send')}
              fullWidth
              size="lg"
              icon={<Lock size={18} color="#fff" />}
              loading={writeLetter.isPending || updateLetter.isPending}
              disabled={!draft?.title.trim() || !draft?.body.trim()}
              onPress={save}
            />
            {draft?.id ? (
              <Button
                title={t('letters.delete')}
                variant="ghost"
                fullWidth
                icon={<Trash2 size={18} color={colors.textMuted} />}
                onPress={() => {
                  const letter = shelves.waiting.find((item) => item.id === draft.id)
                  if (letter) setTearing(letter)
                }}
              />
            ) : null}
          </View>
        }
      >
        {draft ? (
          <View className="gap-4 pb-2">
            <TextInput
              label={t('letters.titleLabel')}
              placeholder={t('letters.titlePlaceholder')}
              value={draft.title}
              maxLength={LETTER_TITLE_MAX}
              onChangeText={(title) => setDraft({ ...draft, title })}
            />
            <TextArea
              label={t('letters.bodyLabel')}
              placeholder={t('letters.bodyPlaceholder')}
              value={draft.body}
              maxLength={LETTER_BODY_MAX}
              numberOfLines={8}
              onChangeText={(body) => setDraft({ ...draft, body })}
            />
            <View className="gap-2">
              <Text className="px-1 text-sm font-semibold text-text-muted dark:text-text-muted-dark">
                {t('letters.opensOnLabel')}
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {presets.map((preset) => {
                  const selected = draft.opensOn === preset.date
                  return (
                    <Pressable
                      key={preset.label}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      onPress={() => {
                        haptic('tap')
                        setDraft({ ...draft, opensOn: preset.date })
                      }}
                      className={cn(
                        'min-h-11 justify-center rounded-full px-4',
                        selected ? 'bg-brand' : 'bg-surface-sunken dark:bg-surface-sunken-dark',
                      )}
                    >
                      <Text
                        className={cn(
                          'text-sm font-semibold',
                          selected ? 'text-white' : 'text-text-muted dark:text-text-muted-dark',
                        )}
                      >
                        {preset.label}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => setPickingDate((value) => !value)}
                className="min-h-12 flex-row items-center justify-between rounded-2xl bg-surface-sunken px-4 dark:bg-surface-sunken-dark"
              >
                <Text className="text-[15px] text-text dark:text-text-dark">
                  {t('letters.opensOn', { date: longDate(draft.opensOn) })}
                </Text>
              </Pressable>
              {pickingDate ? (
                <DatePicker
                  value={dateKeyToLocalDate(draft.opensOn)}
                  minimumDate={dateKeyToLocalDate(today)}
                  onClose={() => setPickingDate(false)}
                  onChange={(date) => setDraft({ ...draft, opensOn: localDateToKey(date) })}
                />
              ) : null}
            </View>
          </View>
        ) : null}
      </Sheet>

      <Sheet
        open={reading !== null}
        onClose={() => setReading(null)}
        title={reading?.title}
        description={
          reading
            ? reading.authorId === userId
              ? t('letters.writtenOn', { date: formatLongDate(new Date(reading.createdAt), locale) })
              : `${t('letters.from', { name: partner })} · ${t('letters.writtenOn', {
                  date: formatLongDate(new Date(reading.createdAt), locale),
                })}`
            : undefined
        }
        closeLabel={t('common.close')}
      >
        <Text className="pb-6 text-base leading-7 text-text dark:text-text-dark">{reading?.body}</Text>
      </Sheet>

      <ConfirmDialog
        open={tearing !== null}
        title={t('letters.deleteTitle')}
        body={t('letters.deleteBody', { name: partner })}
        confirmLabel={t('letters.delete')}
        destructive
        onCancel={() => setTearing(null)}
        onConfirm={() => {
          if (!tearing) return
          haptic('warning')
          deleteLetter.mutate(tearing.id, {
            onSuccess: () => {
              setDraft(null)
              showToast(t('letters.deleted'), 'success')
            },
            onError: () => showToast(t('common.genericError'), 'error'),
          })
          setTearing(null)
        }}
      />
    </>
  )
}

function Row({
  icon,
  title,
  subtitle,
  bold = false,
  borderless = false,
  onPress,
}: {
  icon: React.ReactNode
  title: string
  subtitle: string
  bold?: boolean
  borderless?: boolean
  onPress: () => void
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={cn(
        'min-h-14 flex-row items-center gap-3 px-4 py-3 active:opacity-70',
        !borderless && 'border-b border-border dark:border-border-dark',
      )}
    >
      {icon}
      <View className="min-w-0 flex-1">
        <Text
          numberOfLines={1}
          className={cn('text-[15px] text-text dark:text-text-dark', bold && 'font-bold')}
        >
          {title}
        </Text>
        <Text className="text-xs text-text-muted dark:text-text-muted-dark">{subtitle}</Text>
      </View>
    </Pressable>
  )
}
