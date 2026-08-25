import { AtSign, Check } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ActivityIcon } from '@/components/activities/activity-icon'
import { Button } from '@/components/ui/button'
import { TextInput } from '@/components/ui/field'
import { Segmented } from '@/components/ui/segmented'
import { useToast } from '@/components/ui/toast'
import { useThemeColors } from '@/constants/colors'
import { LOCALES, LOCALE_LABELS } from '@/i18n/config'
import { useI18n } from '@/i18n/provider'
import { createActivity, deleteActivity } from '@/lib/api/activities'
import { USERNAME_PATTERN, isUsernameAvailable, updateProfile } from '@/lib/api/profile'
import { useActivityLabels } from '@/lib/activities/labels'
import { STARTER_SUGGESTIONS, starterActivityInput } from '@/lib/activities/starter'
import { useAuth } from '@/lib/auth/provider'
import { useActivities } from '@/lib/hooks/use-activities'
import { queryKeys } from '@/lib/query/keys'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { getBrowserTimeZone } from '@/lib/utils/dates'
import { newId } from '@/lib/utils/ids'
import { useQueryClient } from '@tanstack/react-query'

// El mismo onboarding de la web: usuario + nombre + idioma + eleccion de
// actividades iniciales. Al guardar, el Gate del layout raiz lleva a Hoy.
export default function WelcomeScreen() {
  const { t, locale, setLocale } = useI18n()
  const { showToast } = useToast()
  const { activityName } = useActivityLabels()
  const colors = useThemeColors()
  const { user, profile } = useAuth()
  const { data: activities } = useActivities()
  const queryClient = useQueryClient()

  const [usernameInput, setUsernameInput] = useState<string | null>(null)
  const [displayNameInput, setDisplayNameInput] = useState<string | null>(null)
  const [available, setAvailable] = useState<boolean | null>(null)
  const [saving, setSaving] = useState(false)

  const [removedSeeds, setRemovedSeeds] = useState<string[]>([])
  const [addedSuggestions, setAddedSuggestions] = useState<string[]>([])

  const username = usernameInput ?? profile?.username ?? ''
  const displayName = displayNameInput ?? profile?.display_name ?? ''
  const candidate = username.trim().toLowerCase()
  const unchanged = candidate.length === 0 || candidate === profile?.username
  const formatValid = USERNAME_PATTERN.test(candidate)

  const seeded = activities ?? []
  const keptCount = seeded.length - removedSeeds.length + addedSuggestions.length
  const activitiesOk = seeded.length === 0 || keptCount > 0

  useEffect(() => {
    if (unchanged || !formatValid) {
      setAvailable(null)
      return
    }
    let cancelled = false
    const timeout = setTimeout(() => {
      isUsernameAvailable(getSupabaseBrowserClient(), candidate, user?.id)
        .then((ok) => {
          if (!cancelled) setAvailable(ok)
        })
        .catch(() => undefined)
    }, 400)
    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [candidate, unchanged, formatValid, user?.id])

  const canSubmit =
    displayName.trim().length > 0 &&
    candidate.length >= 3 &&
    formatValid &&
    (unchanged || available === true) &&
    activitiesOk &&
    !saving

  const finish = async () => {
    if (!user) return
    setSaving(true)
    try {
      const client = getSupabaseBrowserClient()
      const nextPosition = seeded.reduce((max, item) => Math.max(max, item.position), -1) + 1

      await Promise.all([
        ...removedSeeds.map((activityId) => deleteActivity(client, activityId)),
        ...addedSuggestions.map((key, index) => {
          const suggestion = STARTER_SUGGESTIONS.find((item) => item.key === key)
          if (!suggestion) return Promise.resolve(null)
          return createActivity(
            client,
            user.id,
            starterActivityInput(suggestion, locale),
            nextPosition + index,
            newId(),
          )
        }),
      ])

      await updateProfile(client, user.id, {
        username: candidate,
        display_name: displayName.trim(),
        locale,
        timezone: getBrowserTimeZone(),
        onboarded_at: new Date().toISOString(),
      })

      await queryClient.invalidateQueries({ queryKey: queryKeys.profile(user.id) })
      await queryClient.invalidateQueries({ queryKey: queryKeys.activities(user.id) })
    } catch {
      showToast(t('common.genericError'), 'error')
      setSaving(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bg-dark">
      <ScrollView contentContainerClassName="px-6 py-8" keyboardShouldPersistTaps="handled">
        <View className="items-center gap-2 pb-6">
          <Text className="text-2xl font-extrabold text-text dark:text-text-dark">
            {t('onboarding.title')}
          </Text>
          <Text className="text-sm text-text-muted dark:text-text-muted-dark">
            {t('onboarding.subtitle')}
          </Text>
        </View>

        <View className="gap-4">
          <TextInput
            label={t('onboarding.displayNameLabel')}
            placeholder={t('onboarding.displayNamePlaceholder')}
            value={displayName}
            maxLength={40}
            onChangeText={setDisplayNameInput}
          />

          <TextInput
            label={t('onboarding.usernameLabel')}
            placeholder={t('onboarding.usernamePlaceholder')}
            value={username}
            maxLength={20}
            autoCapitalize="none"
            autoCorrect={false}
            leading={<AtSign size={18} color={colors.textSubtle} />}
            hint={
              unchanged
                ? t('onboarding.usernameHelp')
                : !formatValid
                  ? t('onboarding.invalid')
                  : available === null
                    ? t('onboarding.checking')
                    : available
                      ? t('onboarding.available')
                      : undefined
            }
            error={available === false ? t('onboarding.taken') : undefined}
            onChangeText={(text) => setUsernameInput(text.toLowerCase().replace(/\s/g, ''))}
          />

          <Segmented
            value={locale}
            options={LOCALES.map((item) => ({ value: item, label: LOCALE_LABELS[item] }))}
            onChange={setLocale}
          />

          {seeded.length > 0 ? (
            <View className="gap-2">
              <Text className="px-1 text-sm font-semibold text-text-muted dark:text-text-muted-dark">
                {t('onboarding.activitiesLabel')}
              </Text>
              <Text className="px-1 text-xs text-text-subtle dark:text-text-subtle-dark">
                {t('onboarding.activitiesHelp')}
              </Text>
              <View className="flex-row flex-wrap gap-2 pt-1">
                {seeded.map((activity) => (
                  <ActivityChip
                    key={activity.id}
                    label={activityName(activity.name)}
                    icon={activity.icon}
                    color={activity.color}
                    selected={!removedSeeds.includes(activity.id)}
                    onToggle={() =>
                      setRemovedSeeds((current) =>
                        current.includes(activity.id)
                          ? current.filter((id) => id !== activity.id)
                          : [...current, activity.id],
                      )
                    }
                  />
                ))}
                {STARTER_SUGGESTIONS.map((suggestion) => (
                  <ActivityChip
                    key={suggestion.key}
                    label={suggestion.names[locale] ?? suggestion.names.es}
                    icon={suggestion.icon}
                    color={suggestion.color}
                    selected={addedSuggestions.includes(suggestion.key)}
                    onToggle={() =>
                      setAddedSuggestions((current) =>
                        current.includes(suggestion.key)
                          ? current.filter((item) => item !== suggestion.key)
                          : [...current, suggestion.key],
                      )
                    }
                  />
                ))}
              </View>
              {!activitiesOk ? (
                <Text className="px-1 text-sm font-semibold text-danger">
                  {t('onboarding.activitiesNone')}
                </Text>
              ) : null}
            </View>
          ) : null}

          <Button
            title={saving ? t('common.saving') : t('onboarding.finish')}
            size="lg"
            fullWidth
            disabled={!canSubmit}
            loading={saving}
            onPress={() => void finish()}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function ActivityChip({
  label,
  icon,
  color,
  selected,
  onToggle,
}: {
  label: string
  icon: string
  color: string
  selected: boolean
  onToggle: () => void
}) {
  const colors = useThemeColors()

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onToggle}
      className={
        selected
          ? 'h-11 flex-row items-center gap-2 rounded-full border border-brand bg-brand-soft px-4 dark:bg-brand-soft-dark active:opacity-70'
          : 'h-11 flex-row items-center gap-2 rounded-full border border-border bg-surface-sunken px-4 dark:border-border-dark dark:bg-surface-sunken-dark active:opacity-70'
      }
    >
      <ActivityIcon icon={icon} color={color} size="sm" className="h-6 w-6 rounded-lg" />
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
      {selected ? <Check size={16} color={colors.brand} strokeWidth={3} /> : null}
    </Pressable>
  )
}
