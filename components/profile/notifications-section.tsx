import { Bell, BellOff, BellRing } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { Pressable, Switch, Text, View } from 'react-native'

import { requestPush } from '@/lib/push/client'

import { Button } from '@/components/ui/button'
import { TimePicker } from '@/components/ui/time-picker'
import { useToast } from '@/components/ui/toast'
import { SHADOW_TILE, useThemeColors } from '@/constants/colors'
import { useI18n } from '@/i18n/provider'
import {
  hasPushPermission,
  isPushOptedIn,
  optInPush,
  optOutPush,
  requestPushPermission,
} from '@/lib/onesignal'
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '@/lib/hooks/use-notifications'

// Los avisos de la web adaptados a nativo: aqui no hay que instalar nada, el
// permiso lo da el sistema y OneSignal gestiona la suscripcion del aparato.
const DEFAULT_REMINDER = '20:00'

function reminderToDate(value: string | null): Date {
  const date = new Date(2000, 0, 1, 20, 0, 0)
  if (value) {
    const [hours, minutes] = value.split(':').map(Number)
    if (Number.isFinite(hours) && Number.isFinite(minutes)) date.setHours(hours, minutes)
  }
  return date
}

export function NotificationsSection({ embedded = false }: { embedded?: boolean }) {
  const { t } = useI18n()
  const { showToast } = useToast()
  const colors = useThemeColors()

  const { data: preferences } = useNotificationPreferences()
  const updatePreferences = useUpdateNotificationPreferences()

  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [timePickerOpen, setTimePickerOpen] = useState(false)
  // En iOS la rueda avisa en cada giro: si cada aviso guardara, un solo ajuste
  // dispararia decenas de mutaciones. Se guarda al cerrar.
  const [reminderDraft, setReminderDraft] = useState<string | null>(null)
  const [sendingTest, setSendingTest] = useState(false)

  useEffect(() => {
    void (async () => {
      const permitted = await hasPushPermission()
      const optedIn = await isPushOptedIn()
      setEnabled(permitted && optedIn)
    })()
  }, [])

  const turnOn = async () => {
    const granted = await requestPushPermission()
    if (!granted) {
      showToast(t('notifications.blocked'), 'error')
      setEnabled(false)
      return
    }
    optInPush()
    setEnabled(true)
    showToast(t('notifications.enabled'), 'success')
  }

  const turnOff = () => {
    optOutPush()
    setEnabled(false)
    showToast(t('notifications.disabled'))
  }

  const sendTest = async () => {
    setSendingTest(true)
    try {
      await requestPush('test')
      showToast(t('notifications.testSent'))
    } catch {
      showToast(t('common.genericError'), 'error')
    } finally {
      setSendingTest(false)
    }
  }

  // Un interruptor de avisos que falla en silencio es de los peores: el usuario
  // cree que los apago y le siguen llegando, o al reves. Todos pasan por aqui.
  const savePreference = (patch: Parameters<typeof updatePreferences.mutate>[0]) => {
    updatePreferences.mutate(patch, {
      onError: () => showToast(t('common.genericError'), 'error'),
    })
  }

  const reminderEnabled = Boolean(preferences?.daily_reminder_at)
  const reminderLabel =
    (reminderDraft ?? preferences?.daily_reminder_at)?.slice(0, 5) ?? DEFAULT_REMINDER

  return (
    <View className="gap-2">
      {embedded ? null : (
        <Text className="px-1 text-sm font-bold uppercase tracking-wide text-text dark:text-text-dark">
          {t('notifications.sectionTitle')}
        </Text>
      )}

      <View
        style={SHADOW_TILE}
        className="gap-3 rounded-3xl border border-border bg-surface p-4 dark:border-border-dark dark:bg-surface-dark"
      >
        <View className="flex-row items-start gap-3">
          <Bell size={20} color={colors.brand} style={{ marginTop: 2 }} />
          <View className="min-w-0 flex-1">
            <Text className="text-sm font-bold text-text dark:text-text-dark">
              {t('notifications.pushTitle')}
            </Text>
            <Text className="mt-0.5 text-sm text-text-muted dark:text-text-muted-dark">
              {t('notifications.pushWhy')}
            </Text>
          </View>
        </View>

        {enabled === null ? null : enabled ? (
          <>
            <View className="gap-2">
              <PreferenceToggle
                label={t('notifications.typeNudges')}
                checked={preferences?.notify_nudges ?? true}
                onChange={(checked) => savePreference({ notify_nudges: checked })}
              />
              <PreferenceToggle
                label={t('notifications.typeReactions')}
                checked={preferences?.notify_reactions ?? true}
                onChange={(checked) => savePreference({ notify_reactions: checked })}
              />
              <PreferenceToggle
                label={t('notifications.typeComments')}
                checked={preferences?.notify_comments ?? true}
                onChange={(checked) => savePreference({ notify_comments: checked })}
              />
              <PreferenceToggle
                label={t('notifications.typeFriendLogs')}
                hint={t('notifications.typeFriendLogsHelp')}
                checked={preferences?.notify_friend_logs ?? true}
                onChange={(checked) => savePreference({ notify_friend_logs: checked })}
              />
              <PreferenceToggle
                label={t('notifications.typeFriendRequests')}
                checked={preferences?.notify_friend_requests ?? true}
                onChange={(checked) => savePreference({ notify_friend_requests: checked })}
              />
              <PreferenceToggle
                label={t('notifications.typeEventInvites')}
                checked={preferences?.notify_event_invites ?? true}
                onChange={(checked) => savePreference({ notify_event_invites: checked })}
              />
              <PreferenceToggle
                label={t('notifications.typeReminder')}
                checked={reminderEnabled}
                onChange={(checked) =>
                  savePreference({
                    daily_reminder_at: checked ? `${DEFAULT_REMINDER}:00` : null,
                  })
                }
              />

              {reminderEnabled ? (
                <View className="flex-row items-center justify-between gap-3 rounded-2xl bg-surface-sunken px-3.5 py-2.5 dark:bg-surface-sunken-dark">
                  <Text className="text-sm font-medium text-text-muted dark:text-text-muted-dark">
                    {t('notifications.reminderAt')}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('notifications.reminderAt')}
                    onPress={() => setTimePickerOpen(true)}
                    className="rounded-xl bg-surface px-3 py-1.5 dark:bg-surface-dark active:opacity-70"
                  >
                    <Text className="text-sm font-bold text-text dark:text-text-dark">
                      {reminderLabel}
                    </Text>
                  </Pressable>
                </View>
              ) : null}

              {timePickerOpen ? (
                <TimePicker
                  value={reminderToDate(reminderDraft ?? preferences?.daily_reminder_at ?? null)}
                  onChange={(selected) => {
                    const hours = String(selected.getHours()).padStart(2, '0')
                    const minutes = String(selected.getMinutes()).padStart(2, '0')
                    setReminderDraft(`${hours}:${minutes}:00`)
                  }}
                  onClose={() => {
                    setTimePickerOpen(false)
                    if (reminderDraft && reminderDraft !== preferences?.daily_reminder_at) {
                      savePreference({ daily_reminder_at: reminderDraft })
                    }
                    setReminderDraft(null)
                  }}
                />
              ) : null}
            </View>

            <View className="flex-row gap-2">
              <View className="flex-1">
                <Button
                  title={t('notifications.sendTest')}
                  variant="secondary"
                  size="sm"
                  fullWidth
                  loading={sendingTest}
                  icon={sendingTest ? undefined : <BellRing size={16} color={colors.text} />}
                  onPress={() => void sendTest()}
                />
              </View>
              <View className="flex-1">
                <Button
                  title={t('notifications.turnOff')}
                  variant="ghost"
                  size="sm"
                  fullWidth
                  icon={<BellOff size={16} color={colors.textMuted} />}
                  onPress={turnOff}
                />
              </View>
            </View>
          </>
        ) : (
          <Button
            title={t('notifications.turnOn')}
            fullWidth
            icon={<Bell size={18} color="#fff" />}
            onPress={() => void turnOn()}
          />
        )}
      </View>
    </View>
  )
}

function PreferenceToggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  const colors = useThemeColors()

  return (
    <View className="flex-row items-center justify-between gap-3 rounded-2xl bg-surface-sunken px-3.5 py-2.5 dark:bg-surface-sunken-dark">
      <View className="min-w-0 flex-1">
        <Text className="text-sm font-medium text-text dark:text-text-dark">{label}</Text>
        {/* La aclaracion importa en el de amistades: sin ella el interruptor
            suena a "avisame de todo lo que hagan", que es justo lo que la gente
            no quiere y lo que no hace. */}
        {hint ? (
          <Text className="mt-0.5 text-xs text-text-muted dark:text-text-muted-dark">{hint}</Text>
        ) : null}
      </View>
      <Switch value={checked} onValueChange={onChange} trackColor={{ true: colors.brand }} />
    </View>
  )
}
