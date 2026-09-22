import { Check, ChevronRight, Layers, MessageCirclePlus, Trash2 } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import { CoupleGroup } from '@/components/couple/couple-group'
import { Button, IconButton } from '@/components/ui/button'
import { TextArea } from '@/components/ui/field'
import { Sheet } from '@/components/ui/sheet'
import { useToast } from '@/components/ui/toast'
import { useThemeColors } from '@/constants/colors'
import { useI18n } from '@/i18n/provider'
import type { TranslationKey } from '@/i18n/translate'
import type { Couple } from '@/lib/api/couple'
import {
  CUSTOM_PROMPT_MAX,
  CUSTOM_PROMPT_PENDING_LIMIT,
  isPromptLimitError,
} from '@/lib/api/couple-prompts'
import { COUPLE_DECKS, type CoupleDeck } from '@/lib/couple/prompts'
import {
  useAddCustomPrompt,
  useDeleteCustomPrompt,
  useMyPendingPrompts,
  usePromptState,
  useUpdatePromptDecks,
} from '@/lib/hooks/use-couple-prompts'
import { cn } from '@/lib/utils/cn'
import { haptic } from '@/lib/utils/haptics'

const ROW = 'min-h-14 flex-row items-center gap-3 px-4 py-3 active:opacity-70'
const SEPARATOR = 'border-t border-border dark:border-border-dark'

export function CouplePrompts({ couple, today }: { couple: Couple; today: string }) {
  const { t } = useI18n()
  const { showToast } = useToast()
  const colors = useThemeColors()
  const { data: state } = usePromptState(couple.id, today)
  const { data: pending } = useMyPendingPrompts(couple.id, state)
  const addPrompt = useAddCustomPrompt()
  const removePrompt = useDeleteCustomPrompt()
  const updateDecks = useUpdatePromptDecks()

  const [decksOpen, setDecksOpen] = useState(false)
  const [keepOne, setKeepOne] = useState(false)
  const [draft, setDraft] = useState<string | null>(null)
  const [draftError, setDraftError] = useState<string | null>(null)

  const active: CoupleDeck[] = couple.promptDecks ?? [...COUPLE_DECKS]
  const mine = pending ?? []
  const partner = couple.partner.displayName
  const fromPartner = state?.pendingFromPartner ?? 0
  const canSave = (draft ?? '').trim().length >= 3

  const toggleDeck = (deck: CoupleDeck) => {
    const next = active.includes(deck) ? active.filter((item) => item !== deck) : [...active, deck]
    if (next.length === 0) {
      haptic('warning')
      setKeepOne(true)
      return
    }
    haptic('tap')
    setKeepOne(false)
    const ordered = COUPLE_DECKS.filter((item) => next.includes(item))
    updateDecks.mutate(
      { coupleId: couple.id, decks: ordered.length === COUPLE_DECKS.length ? null : ordered },
      { onError: () => showToast(t('common.genericError'), 'error') },
    )
  }

  const openAsk = () => {
    if (mine.length >= CUSTOM_PROMPT_PENDING_LIMIT) {
      haptic('warning')
      showToast(t('couple.askLimit'), 'error')
      return
    }
    haptic('tap')
    setDraftError(null)
    setDraft('')
  }

  const closeAsk = () => {
    setDraft(null)
    setDraftError(null)
  }

  const save = () => {
    const body = (draft ?? '').trim()
    if (body.length < 3) return
    addPrompt.mutate(
      { coupleId: couple.id, body },
      {
        onSuccess: () => {
          haptic('success')
          closeAsk()
          showToast(t('couple.askSaved'), 'success')
        },
        onError: (error) => {
          haptic('warning')
          setDraftError(isPromptLimitError(error) ? t('couple.askLimit') : t('common.genericError'))
        },
      },
    )
  }

  return (
    <>
      <CoupleGroup
        header={t('couple.questionsHeader')}
        footer={
          fromPartner > 0
            ? t('couple.askPendingFromPartner', { count: fromPartner, name: partner })
            : t('couple.askHelp', { name: partner })
        }
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('couple.decksRow')}
          onPress={() => {
            haptic('tap')
            setKeepOne(false)
            setDecksOpen(true)
          }}
          className={ROW}
        >
          <Layers size={20} color={colors.brand} />
          <Text className="flex-1 text-[15px] font-bold text-text dark:text-text-dark">
            {t('couple.decksRow')}
          </Text>
          <Text className="text-[15px] text-text-muted dark:text-text-muted-dark">
            {active.length === COUPLE_DECKS.length
              ? t('couple.decksAll')
              : t('couple.decksSome', { count: active.length, total: COUPLE_DECKS.length })}
          </Text>
          <ChevronRight size={16} color={colors.textSubtle} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('couple.askRow', { name: partner })}
          onPress={openAsk}
          className={cn(ROW, SEPARATOR)}
        >
          <MessageCirclePlus size={20} color={colors.brand} />
          <Text className="flex-1 text-[15px] font-bold text-text dark:text-text-dark" numberOfLines={2}>
            {t('couple.askRow', { name: partner })}
          </Text>
          <ChevronRight size={16} color={colors.textSubtle} />
        </Pressable>
      </CoupleGroup>

      {mine.length > 0 ? (
        <CoupleGroup header={t('couple.askMine')}>
          {mine.map((prompt, index) => (
            <View
              key={prompt.id}
              className={cn('min-h-14 flex-row items-center gap-2 pl-4 pr-1', index > 0 && SEPARATOR)}
            >
              <Text className="min-w-0 flex-1 py-3 text-[15px] text-text dark:text-text-dark">
                {prompt.body}
              </Text>
              <IconButton
                label={t('couple.askDelete')}
                disabled={removePrompt.isPending}
                onPress={() => {
                  haptic('tap')
                  removePrompt.mutate(
                    { id: prompt.id, coupleId: couple.id },
                    { onError: () => showToast(t('common.genericError'), 'error') },
                  )
                }}
              >
                <Trash2 size={20} color={colors.textMuted} />
              </IconButton>
            </View>
          ))}
        </CoupleGroup>
      ) : null}

      <Sheet
        open={decksOpen}
        onClose={() => setDecksOpen(false)}
        title={t('couple.decksTitle')}
        closeLabel={t('common.close')}
      >
        <View className="gap-2 pb-2 pt-1">
          <View className="overflow-hidden rounded-2xl bg-surface-sunken dark:bg-surface-sunken-dark">
            {COUPLE_DECKS.map((deck, index) => {
              const selected = active.includes(deck)
              return (
                <Pressable
                  key={deck}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  onPress={() => toggleDeck(deck)}
                  className={cn(
                    'min-h-12 flex-row items-center gap-3 px-4 py-3 active:opacity-70',
                    index > 0 && SEPARATOR,
                  )}
                >
                  <Text className="flex-1 text-[15px] text-text dark:text-text-dark">
                    {t(`couple.deck.${deck}` as TranslationKey)}
                  </Text>
                  {selected ? <Check size={20} color={colors.brand} /> : <View className="h-5 w-5" />}
                </Pressable>
              )
            })}
          </View>
          <Text
            className={cn(
              'px-1 text-xs',
              keepOne ? 'font-semibold text-danger' : 'text-text-subtle dark:text-text-subtle-dark',
            )}
          >
            {keepOne ? t('couple.decksKeepOne') : t('couple.decksHelp')}
          </Text>
        </View>
      </Sheet>

      <Sheet
        open={draft !== null}
        onClose={closeAsk}
        title={t('couple.askTitle', { name: partner })}
        description={t('couple.askMessage')}
        closeLabel={t('common.close')}
      >
        <View className="gap-3 pb-2 pt-1">
          <TextArea
            accessibilityLabel={t('couple.askTitle', { name: partner })}
            placeholder={t('couple.askPlaceholder')}
            value={draft ?? ''}
            maxLength={CUSTOM_PROMPT_MAX}
            autoCapitalize="sentences"
            autoFocus
            error={draftError ?? undefined}
            onChangeText={(value) => {
              setDraft(value)
              if (draftError) setDraftError(null)
            }}
          />
          <Button
            title={t('common.save')}
            size="lg"
            fullWidth
            disabled={!canSave}
            loading={addPrompt.isPending}
            onPress={save}
          />
          <Button title={t('common.cancel')} variant="ghost" size="lg" fullWidth onPress={closeAsk} />
        </View>
      </Sheet>
    </>
  )
}
