import { Flag } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, Text, View } from 'react-native'

import { Button } from '@/components/ui/button'
import { TextArea } from '@/components/ui/field'
import { Sheet } from '@/components/ui/sheet'
import { useToast } from '@/components/ui/toast'
import { useI18n } from '@/i18n/provider'
import type { TranslationKey } from '@/i18n/translate'
import {
  MAX_REPORT_DETAILS,
  REPORT_REASONS,
  submitReport,
  type ReportReason,
  type ReportTarget,
} from '@/lib/api/reports'
import { useCurrentUserId } from '@/lib/auth/provider'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { haptic } from '@/lib/utils/haptics'

export type ReportSheetTarget = ReportTarget

export function ReportSheet({
  target,
  onClose,
}: {
  target: ReportTarget | null
  onClose: () => void
}) {
  const { t } = useI18n()
  const { showToast } = useToast()
  const userId = useCurrentUserId()

  const [reason, setReason] = useState<ReportReason | null>(null)
  const [details, setDetails] = useState('')
  const [sending, setSending] = useState(false)

  const [lastTarget, setLastTarget] = useState(target)
  if (target !== lastTarget) {
    setLastTarget(target)
    setReason(null)
    setDetails('')
  }

  const send = async () => {
    if (!target || !reason || !userId) return
    setSending(true)
    haptic('tap')
    try {
      await submitReport(getSupabaseBrowserClient(), userId, target, reason, details)
      showToast(t('report.done'), 'success')
      onClose()
    } catch {
      showToast(t('common.genericError'), 'error')
    } finally {
      setSending(false)
    }
  }

  return (
    <Sheet
      open={target !== null}
      onClose={onClose}
      title={t('report.title')}
      description={t('report.body')}
      closeLabel={t('common.close')}
      footer={
        <Button
          title={sending ? t('common.saving') : t('report.cta')}
          size="lg"
          fullWidth
          disabled={!reason || sending}
          loading={sending}
          icon={<Flag size={16} color="#fff" />}
          onPress={() => void send()}
        />
      }
    >
      <View className="gap-4 pt-2">
        <View className="gap-1.5">
          {REPORT_REASONS.map((value) => (
            <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityState={{ selected: reason === value }}
              onPress={() => setReason(value)}
              className={
                reason === value
                  ? 'min-h-12 justify-center rounded-2xl border border-brand bg-brand-soft px-4 dark:bg-brand-soft-dark active:opacity-70'
                  : 'min-h-12 justify-center rounded-2xl border border-border bg-surface-sunken px-4 dark:border-border-dark dark:bg-surface-sunken-dark active:opacity-70'
              }
            >
              <Text
                className={
                  reason === value
                    ? 'text-sm font-semibold text-brand dark:text-brand-dark'
                    : 'text-sm font-semibold text-text-muted dark:text-text-muted-dark'
                }
              >
                {t(`report.reasons.${value}` as TranslationKey)}
              </Text>
            </Pressable>
          ))}
        </View>

        <TextArea
          label={`${t('report.detailsLabel')} (${t('common.optional')})`}
          placeholder={t('report.detailsPlaceholder')}
          value={details}
          maxLength={MAX_REPORT_DETAILS}
          onChangeText={setDetails}
        />
      </View>
    </Sheet>
  )
}
