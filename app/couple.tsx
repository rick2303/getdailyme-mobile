import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { ChevronLeft, HeartCrack } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { CoupleBoard } from '@/components/couple/couple-board'
import { CoupleGroup } from '@/components/couple/couple-group'
import { CoupleHeader } from '@/components/couple/couple-header'
import { DailyQuestion } from '@/components/couple/daily-question'
import { StreakSave } from '@/components/couple/streak-save'
import { PageHeader } from '@/components/layout/page-header'
import { IconButton } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DatePicker, dateKeyToLocalDate, localDateToKey } from '@/components/ui/date-picker'
import { SkeletonTile } from '@/components/ui/feedback'
import { useToast } from '@/components/ui/toast'
import { useThemeColors } from '@/constants/colors'
import { useI18n } from '@/i18n/provider'
import { useAuth, useTimeZone } from '@/lib/auth/provider'
import { useBreakUp, useCouple, useUpdateAnniversary } from '@/lib/hooks/use-couple'
import { formatLongDate, todayKey } from '@/lib/utils/dates'
import { haptic } from '@/lib/utils/haptics'

export default function CoupleScreen() {
  const { t, locale } = useI18n()
  const router = useRouter()
  const colors = useThemeColors()
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const timeZone = useTimeZone()
  const { profile } = useAuth()
  const { data: couple, isPending, isFetching } = useCouple()
  const updateAnniversary = useUpdateAnniversary()
  const breakUp = useBreakUp()
  const [confirming, setConfirming] = useState(false)
  const [pickingDate, setPickingDate] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const today = todayKey(timeZone)

  useEffect(() => {
    if (isPending || isFetching) return
    if (!couple) router.replace('/friends')
  }, [isPending, isFetching, couple, router])

  const goBack = () => {
    if (router.canGoBack()) router.back()
    else router.replace('/friends')
  }

  const refresh = async () => {
    setRefreshing(true)
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['couple'] }),
      queryClient.invalidateQueries({ queryKey: ['couple-ritual'] }),
      queryClient.invalidateQueries({ queryKey: ['couple-streak'] }),
    ])
    setRefreshing(false)
  }

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bg-dark" edges={['top']}>
      <View className="flex-row items-center px-2 pt-1">
        <IconButton label={t('common.back')} onPress={goBack}>
          <ChevronLeft size={24} color={colors.text} />
        </IconButton>
      </View>

      <ScrollView
        contentContainerClassName="gap-6 pb-10"
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void refresh()}
            tintColor={colors.brand}
            colors={[colors.brand]}
          />
        }
      >
        <PageHeader title={t('couple.title')} />

        {!couple || !profile ? (
          <View className="gap-3 px-4">
            <SkeletonTile className="h-40" />
            <SkeletonTile className="h-24" />
          </View>
        ) : (
          <>
            <CoupleHeader couple={couple} profile={profile} today={today} />

            <DailyQuestion
              couple={couple}
              profile={{ displayName: profile.display_name, avatarUrl: profile.avatar_url }}
              today={today}
            />

            <CoupleBoard couple={couple} today={today} />

            <StreakSave coupleId={couple.id} today={today} />

            <CoupleGroup footer={t('couple.anniversaryHelp')}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('couple.anniversaryLabel')}
                onPress={() => {
                  haptic('tap')
                  setPickingDate((value) => !value)
                }}
                className="min-h-14 flex-row items-center justify-between gap-3 px-4 py-3 active:opacity-70"
              >
                <Text className="text-[15px] font-bold text-text dark:text-text-dark">
                  {t('couple.anniversaryLabel')}
                </Text>
                <Text className="text-[15px] font-semibold text-brand dark:text-brand-dark">
                  {formatLongDate(new Date(`${couple.startedOn}T00:00:00Z`), locale)}
                </Text>
              </Pressable>
              {pickingDate ? (
                <View className="px-2 pb-2">
                  <DatePicker
                    value={dateKeyToLocalDate(couple.startedOn)}
                    maximumDate={dateKeyToLocalDate(today)}
                    onClose={() => setPickingDate(false)}
                    onChange={(date) => {
                      haptic('tap')
                      updateAnniversary.mutate(
                        { coupleId: couple.id, startedOn: localDateToKey(date) },
                        { onError: () => showToast(t('common.genericError'), 'error') },
                      )
                    }}
                  />
                </View>
              ) : null}
            </CoupleGroup>

            <CoupleGroup>
              <Pressable
                accessibilityRole="button"
                onPress={() => setConfirming(true)}
                className="min-h-14 flex-row items-center gap-3 px-4 py-3 active:opacity-70"
              >
                <HeartCrack size={20} color={colors.danger} />
                <Text className="text-[15px] font-bold text-danger">{t('couple.breakUp')}</Text>
              </Pressable>
            </CoupleGroup>
          </>
        )}
      </ScrollView>

      <ConfirmDialog
        open={confirming && Boolean(couple)}
        title={t('couple.breakUpTitle')}
        body={t('couple.breakUpBody')}
        confirmLabel={t('couple.breakUpConfirm')}
        pending={breakUp.isPending}
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          if (!couple) return
          haptic('warning')
          breakUp.mutate(couple.id, {
            onSuccess: () => {
              setConfirming(false)
              showToast(t('couple.broke'), 'success')
              router.replace('/friends')
            },
            onError: () => {
              setConfirming(false)
              showToast(t('common.genericError'), 'error')
            },
          })
        }}
      />
    </SafeAreaView>
  )
}
