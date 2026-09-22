import { Lock, MessageCircleHeart } from 'lucide-react-native'
import { useState } from 'react'
import { Platform, Text, View } from 'react-native'
import Animated, { FadeInDown, useReducedMotion } from 'react-native-reanimated'

import { CoupleGroup } from '@/components/couple/couple-group'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { SkeletonTile } from '@/components/ui/feedback'
import { TextArea } from '@/components/ui/field'
import { useToast } from '@/components/ui/toast'
import { useThemeColors } from '@/constants/colors'
import { useI18n } from '@/i18n/provider'
import type { Couple } from '@/lib/api/couple'
import { promptForDay } from '@/lib/couple/prompts'
import { ICON_STROKE } from '@/lib/icons/tokens'
import { useAnswerToday, useRitual } from '@/lib/hooks/use-couple-answers'
import { haptic } from '@/lib/utils/haptics'

export function DailyQuestion({
  couple,
  profile,
  today,
}: {
  couple: Couple
  profile: { displayName: string; avatarUrl: string | null }
  today: string
}) {
  const { t, locale } = useI18n()
  const { showToast } = useToast()
  const colors = useThemeColors()
  const reducedMotion = useReducedMotion()
  const { data: ritual, isPending } = useRitual(couple.id, today)
  const answer = useAnswerToday()

  const prompt = promptForDay(couple.id, today)
  const [draft, setDraft] = useState('')
  const [guess, setGuess] = useState('')
  const [editing, setEditing] = useState(false)

  const mine = ritual?.mine ?? null
  const theirs = ritual?.theirs ?? null
  const theyAnswered = ritual?.theyAnswered ?? false

  if (isPending) return <SkeletonTile className="mx-4 h-44" />

  const startEditing = () => {
    setDraft(mine?.text ?? '')
    setGuess(mine?.guess ?? '')
    setEditing(true)
  }

  const send = () => {
    const text = draft.trim()
    if (!text) return

    haptic('success')
    answer.mutate(
      { coupleId: couple.id, promptKey: prompt.key, text, guess, dateKey: today },
      {
        onSuccess: () => {
          setEditing(false)
          setDraft('')
          setGuess('')
          showToast(t('couple.answerSaved'), 'success')
        },
        onError: () => showToast(t('common.genericError'), 'error'),
      },
    )
  }

  const writing = !mine || editing
  const entering = Platform.OS === 'ios' && !reducedMotion ? FadeInDown.duration(220) : undefined
  const stage = writing ? 'writing' : theirs ? 'revealed' : 'waiting'

  return (
    <CoupleGroup
      header={t('couple.questionTitle')}
      footer={writing && theyAnswered ? t('couple.theirTurnBody') : undefined}
    >
      <View className="gap-4 p-4">
        <Text className="text-xl font-extrabold tracking-tight text-text dark:text-text-dark">
          {prompt.text[locale]}
        </Text>

        <Animated.View key={stage} entering={entering} className="gap-3">
          {writing ? (
            <>
              {theyAnswered && !editing ? (
                <View className="flex-row items-center gap-2">
                  <Lock size={16} color={colors.textMuted} strokeWidth={ICON_STROKE.emphasis} />
                  <Text className="flex-1 text-sm text-text-muted dark:text-text-muted-dark">
                    {t('couple.theirTurn', { name: couple.partner.displayName })}
                  </Text>
                </View>
              ) : null}

              <TextArea
                accessibilityLabel={t('couple.questionTitle')}
                placeholder={t('couple.answerPlaceholder')}
                value={draft}
                maxLength={500}
                onChangeText={setDraft}
              />

              {draft.trim() ? (
                <TextArea
                  label={t('couple.guessLabel')}
                  hint={t('couple.guessHelp')}
                  placeholder={t('couple.guessPlaceholder')}
                  value={guess}
                  maxLength={500}
                  numberOfLines={2}
                  onChangeText={setGuess}
                />
              ) : null}

              <Button
                title={t('couple.answerAction')}
                size="lg"
                fullWidth
                disabled={!draft.trim()}
                loading={answer.isPending}
                onPress={send}
              />
            </>
          ) : theirs && mine ? (
            <>
              <Said
                name={t('couple.revealMine')}
                avatarName={profile.displayName}
                avatarUrl={profile.avatarUrl}
                text={mine.text}
              />
              <Said
                name={couple.partner.displayName}
                avatarName={couple.partner.displayName}
                avatarUrl={couple.partner.avatarUrl}
                text={theirs.text}
              />

              {mine.guess ? (
                <View className="ml-12 gap-0.5 border-l-2 border-border pl-3 dark:border-border-dark">
                  <Text className="text-xs text-text-subtle dark:text-text-subtle-dark">
                    {t('couple.guessedTitle')}
                  </Text>
                  <Text className="text-sm text-text-muted dark:text-text-muted-dark">
                    {mine.guess}
                  </Text>
                </View>
              ) : null}

              <Button
                title={t('couple.answerEdit')}
                variant="ghost"
                fullWidth
                onPress={startEditing}
              />
            </>
          ) : mine ? (
            <>
              <Said
                name={t('couple.revealMine')}
                avatarName={profile.displayName}
                avatarUrl={profile.avatarUrl}
                text={mine.text}
              />
              <View className="flex-row items-start gap-3 rounded-2xl bg-surface-sunken p-3 dark:bg-surface-sunken-dark">
                <MessageCircleHeart size={24} color={colors.brand} strokeWidth={ICON_STROKE.airy} />
                <View className="min-w-0 flex-1 gap-0.5">
                  <Text className="text-[15px] font-bold text-text dark:text-text-dark">
                    {t('couple.waitingTitle', { name: couple.partner.displayName })}
                  </Text>
                  <Text className="text-sm text-text-muted dark:text-text-muted-dark">
                    {t('couple.waitingBody')}
                  </Text>
                </View>
              </View>
              <Button
                title={t('couple.answerEdit')}
                variant="ghost"
                fullWidth
                onPress={startEditing}
              />
            </>
          ) : null}
        </Animated.View>
      </View>
    </CoupleGroup>
  )
}

function Said({
  name,
  avatarName,
  avatarUrl,
  text,
}: {
  name: string
  avatarName: string
  avatarUrl: string | null
  text: string
}) {
  return (
    <View className="flex-row gap-3">
      <Avatar name={avatarName} src={avatarUrl} size="sm" />
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className="text-xs text-text-subtle dark:text-text-subtle-dark">{name}</Text>
        <Text className="text-base text-text dark:text-text-dark">{text}</Text>
      </View>
    </View>
  )
}
