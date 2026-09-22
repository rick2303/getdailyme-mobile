import { LinearGradient } from 'expo-linear-gradient'
import { useState } from 'react'
import { Text, View, type TextProps } from 'react-native'

import { ShareImageSheet } from '@/components/profile/recap-share-sheet'
import { Segmented } from '@/components/ui/segmented'
import { useThemeColors } from '@/constants/colors'
import { useI18n } from '@/i18n/provider'
import { daysTogether, type Couple } from '@/lib/api/couple'
import { formatLongDate } from '@/lib/utils/dates'
import { haptic } from '@/lib/utils/haptics'

export type CoupleCardAnswer = { name: string; text: string }

type Mode = 'mine' | 'both'

const CARD_WIDTH = 270
const CARD_HEIGHT = 480
const CAPTURE = { width: 1080, height: 1920 }

function CardText(props: TextProps) {
  return <Text allowFontScaling={false} {...props} />
}

export function CoupleShareSheet({
  open,
  onClose,
  couple,
  today,
  question,
  mine,
  theirs,
}: {
  open: boolean
  onClose: () => void
  couple: Couple
  today: string
  question: string
  mine: CoupleCardAnswer
  theirs: CoupleCardAnswer
}) {
  const { t, locale } = useI18n()
  const colors = useThemeColors()
  const [mode, setMode] = useState<Mode>('mine')
  const days = daysTogether(couple.startedOn, today)
  const answers = mode === 'both' ? [mine, theirs] : [mine]
  const answerLines = mode === 'both' ? 6 : 9

  return (
    <ShareImageSheet
      open={open}
      onClose={onClose}
      title={t('couple.shareTitle')}
      description={t('couple.shareBody')}
      shareText={t('couple.shareText', { question })}
      captureSize={CAPTURE}
      controls={
        <View className="pb-2 pt-1">
          <Segmented
            value={mode}
            options={[
              { value: 'mine', label: t('couple.shareMine') },
              { value: 'both', label: t('couple.shareBoth') },
            ]}
            onChange={(next) => {
              haptic('tap')
              setMode(next)
            }}
          />
        </View>
      }
    >
      <View
        accessible
        accessibilityLabel={t('couple.shareAlt')}
        style={{ width: CARD_WIDTH, height: CARD_HEIGHT, borderRadius: 20, overflow: 'hidden' }}
      >
        <LinearGradient
          colors={[colors.brand + '47', colors.surface]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={{ flex: 1, paddingHorizontal: 22, paddingTop: 34, paddingBottom: 20 }}
        >
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: -58,
              top: 361,
              width: 180,
              height: 180,
              borderRadius: 90,
              backgroundColor: colors.brand + '1F',
            }}
          />

          <CardText style={{ color: colors.brand, fontSize: 10, fontWeight: '800' }}>
            getdailyme
          </CardText>
          <CardText
            numberOfLines={1}
            style={{ color: colors.textMuted, fontSize: 10, fontWeight: '700', marginTop: 8 }}
          >
            {t('couple.shareHeading')}
          </CardText>
          <CardText
            numberOfLines={1}
            style={{ color: colors.textMuted, fontSize: 10, fontWeight: '700' }}
          >
            {formatLongDate(new Date(`${today}T12:00:00`), locale)}
          </CardText>

          <CardText
            numberOfLines={4}
            style={{
              color: colors.text,
              fontSize: 18,
              lineHeight: 22,
              fontWeight: '800',
              marginTop: 22,
            }}
          >
            {question}
          </CardText>

          <View style={{ marginTop: 12, gap: 8, flexShrink: 1, overflow: 'hidden' }}>
            {answers.map((answer, index) => (
              <View
                key={index}
                style={{ backgroundColor: colors.surface + 'D1', borderRadius: 12, padding: 12 }}
              >
                <CardText
                  numberOfLines={1}
                  style={{ color: colors.brand, fontSize: 8, fontWeight: '700', marginBottom: 4 }}
                >
                  {answer.name}
                </CardText>
                <CardText
                  numberOfLines={answerLines}
                  style={{ color: colors.text, fontSize: 11, lineHeight: 14.5, fontWeight: '600' }}
                >
                  {answer.text}
                </CardText>
              </View>
            ))}
            {mode === 'mine' ? (
              <View style={{ backgroundColor: colors.surface + 'D1', borderRadius: 12, padding: 12 }}>
                <CardText
                  numberOfLines={3}
                  style={{ color: colors.textMuted, fontSize: 11, lineHeight: 14.5, fontWeight: '600' }}
                >
                  {t('couple.shareHidden', { name: theirs.name })}
                </CardText>
              </View>
            ) : null}
          </View>

          <View style={{ flex: 1, minHeight: 8 }} />

          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 7 }}>
            <CardText
              style={{
                color: colors.text,
                fontSize: 45,
                lineHeight: 50,
                fontWeight: '800',
                fontVariant: ['tabular-nums'],
              }}
            >
              {days}
            </CardText>
            <CardText
              numberOfLines={1}
              style={{ color: colors.textMuted, fontSize: 11, fontWeight: '700', flexShrink: 1 }}
            >
              {t('couple.dayUnit', { count: days })}
            </CardText>
          </View>

          <CardText
            style={{
              color: colors.textSubtle,
              fontSize: 8.5,
              fontWeight: '600',
              textAlign: 'center',
              marginTop: 14,
            }}
          >
            {t('weekly.imageFooter')}
          </CardText>
        </LinearGradient>
      </View>
    </ShareImageSheet>
  )
}
