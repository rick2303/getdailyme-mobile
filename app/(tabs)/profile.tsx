import * as ImagePicker from 'expo-image-picker'
import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import {
  CalendarDays,
  Camera,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Flame,
  ListChecks,
  LogOut,
  Settings2,
  Share2,
  Snowflake,
  Trophy,
  type LucideIcon,
} from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { ScrollView, Share, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ActivityIcon } from '@/components/activities/activity-icon'
import { Heatmap } from '@/components/profile/heatmap'
import { RecapShareSheet, type RecapShareData } from '@/components/profile/recap-share-sheet'
import { ACTIVITY_HEX } from '@/constants/colors'
import { ManageActivitiesSheet } from '@/components/profile/manage-activities-sheet'
import { NotificationsSection } from '@/components/profile/notifications-section'
import { SecuritySection } from '@/components/profile/security-section'
import { Avatar } from '@/components/ui/avatar'
import { Button, IconButton } from '@/components/ui/button'
import { TextInput } from '@/components/ui/field'
import { Segmented, type SegmentedOption } from '@/components/ui/segmented'
import { Sheet } from '@/components/ui/sheet'
import { useToast } from '@/components/ui/toast'
import { SHADOW_TILE, useThemeColors } from '@/constants/colors'
import { LOCALES, LOCALE_LABELS } from '@/i18n/config'
import { useI18n } from '@/i18n/provider'
import { useActivityLabels } from '@/lib/activities/labels'
import { computeStreak, freezesLeftThisMonth } from '@/lib/activities/streaks'
import {
  DAYS_PER_WEEK,
  percentChange,
  startOfWeek,
  summarizeDayTotals,
  summarizeRange,
} from '@/lib/activities/weekly'
import { USERNAME_PATTERN, updateProfile } from '@/lib/api/profile'
import { buildDataExport } from '@/lib/api/export'
import { uploadAvatar } from '@/lib/api/storage'
import { ACCENTS, ACCENT_HEX, THEME_MODES, type ThemeMode } from '@/lib/theme'
import { useThemeSettings } from '@/lib/theme-context'
import { getBrowserTimeZone } from '@/lib/utils/dates'
import { Pressable } from 'react-native'
import { USERNAME_COOLDOWN_DAYS, daysUntilUsernameChange, isUsernameCooldownError } from '@/lib/api/username-cooldown'
import { useAuth } from '@/lib/auth/provider'
import { useActivities } from '@/lib/hooks/use-activities'
import { useDayTotals, useHistorySummary, useYearDayTotals } from '@/lib/hooks/use-logs'
import { queryKeys } from '@/lib/query/keys'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { dateKeyToDate, shiftDateKey } from '@/lib/utils/dates'
import { useQueryClient } from '@tanstack/react-query'

export default function ProfileScreen() {
  const { t } = useI18n()
  const { showToast } = useToast()
  const queryClient = useQueryClient()
  const { profile, signOut } = useAuth()
  const [editing, setEditing] = useState(false)
  const [managing, setManaging] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  if (!profile) return null

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    })
    if (result.canceled || !result.assets[0]) return
    setUploadingAvatar(true)
    try {
      const url = await uploadAvatar(getSupabaseBrowserClient(), profile.id, result.assets[0].uri)
      await updateProfile(getSupabaseBrowserClient(), profile.id, { avatar_url: url })
      await queryClient.invalidateQueries({ queryKey: queryKeys.profile(profile.id) })
      showToast(t('profile.saved'), 'success')
    } catch {
      showToast(t('common.genericError'), 'error')
    } finally {
      setUploadingAvatar(false)
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-bg dark:bg-bg-dark" edges={['top']}>
      <ScrollView contentContainerClassName="gap-6 px-4 pb-10 pt-4">
        <Text className="px-1 text-2xl font-extrabold text-text dark:text-text-dark">
          {t('profile.title')}
        </Text>

        <View className="items-center gap-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('profile.changeAvatar')}
            onPress={() => void pickAvatar()}
            disabled={uploadingAvatar}
          >
            <Avatar name={profile.display_name} src={profile.avatar_url} size="lg" />
            <View className="absolute -bottom-1 -right-1 h-8 w-8 items-center justify-center rounded-full bg-brand">
              <Camera size={14} color="#fff" />
            </View>
          </Pressable>
          <View className="items-center">
            <Text className="text-xl font-extrabold text-text dark:text-text-dark">
              {profile.display_name}
            </Text>
            <Text className="text-sm font-medium text-text-muted dark:text-text-muted-dark">
              @{profile.username}
            </Text>
          </View>
          <Button
            title={t('profile.editTitle')}
            size="sm"
            variant="secondary"
            onPress={() => setEditing(true)}
          />
        </View>

        <StatsSection />
        <RecapSection />
        <Heatmap />
        <NotificationsSection />
        <SettingsSection />
        <SecuritySection />

        <Button
          title={t('profile.manageActivities')}
          variant="secondary"
          size="lg"
          fullWidth
          icon={<Settings2 size={18} color="#70707B" />}
          onPress={() => setManaging(true)}
        />

        <Button
          title={t('auth.signOut')}
          variant="ghost"
          size="lg"
          fullWidth
          icon={<LogOut size={18} color="#8F8F9A" />}
          onPress={() => void signOut()}
        />

        <ProfileEditorSheet open={editing} onClose={() => setEditing(false)} />
        <ManageActivitiesSheet open={managing} onClose={() => setManaging(false)} />
      </ScrollView>
    </SafeAreaView>
  )
}

function StatsSection() {
  const { t } = useI18n()
  const { allDates, totalLogs, today } = useHistorySummary()

  const summary = useMemo(() => computeStreak(allDates, today), [allDates, today])
  const freezesLeft = freezesLeftThisMonth(summary, today)

  return (
    <View className="gap-2">
      <Text className="px-1 text-sm font-bold uppercase tracking-wide text-text dark:text-text-dark">
        {t('stats.title')}
      </Text>
      <View className="flex-row flex-wrap gap-3">
        <StatCard
          icon={Flame}
          label={t('stats.currentStreak')}
          value={t('stats.days', { count: summary.current })}
          highlighted={summary.current > 0}
        />
        <StatCard
          icon={Trophy}
          label={t('stats.longestStreak')}
          value={t('stats.days', { count: summary.longest })}
        />
        <StatCard icon={ListChecks} label={t('stats.totalLogs')} value={String(totalLogs)} />
        <StatCard icon={CalendarDays} label={t('stats.activeDays')} value={String(summary.activeDays)} />
      </View>
      <View className="flex-row items-center gap-2 px-1">
        <Snowflake size={14} color="#38BDF8" />
        <Text className="flex-1 text-xs text-text-muted dark:text-text-muted-dark">
          {t('stats.freezesLeft', { count: freezesLeft })}
        </Text>
      </View>
    </View>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  highlighted = false,
}: {
  icon: LucideIcon
  label: string
  value: string
  highlighted?: boolean
}) {
  const colors = useThemeColors()

  return (
    <View style={SHADOW_TILE} className="min-w-[45%] flex-1 gap-1 rounded-3xl border border-border bg-surface p-4 dark:border-border-dark dark:bg-surface-dark">
      <Icon size={20} color={highlighted ? colors.brand : colors.textSubtle} />
      <Text className="text-xl font-extrabold text-text dark:text-text-dark">{value}</Text>
      <Text className="text-xs font-medium text-text-muted dark:text-text-muted-dark">{label}</Text>
    </View>
  )
}

type RecapMode = 'week' | 'month' | 'year'

function RecapSection() {
  const { t, locale } = useI18n()
  const colors = useThemeColors()
  const { activityName, amountWithUnit } = useActivityLabels()
  const { entries, today, earliestDate } = useDayTotals()
  const { data: activities } = useActivities()

  const [mode, setMode] = useState<RecapMode>('week')
  const [sharing, setSharing] = useState(false)
  const yearData = useYearDayTotals(mode === 'year')

  const thisWeekStart = startOfWeek(today)
  const firstWeekStart = startOfWeek(earliestDate)
  const [offset, setOffset] = useState(0)
  const weekStart = shiftDateKey(thisWeekStart, offset * DAYS_PER_WEEK)

  const monthStart = `${today.slice(0, 7)}-01`
  const yearStart = `${today.slice(0, 4)}-01-01`

  const { current, previous } = useMemo(() => {
    if (mode === 'month') return { current: summarizeRange(entries, monthStart, today), previous: null }
    if (mode === 'year')
      return { current: summarizeRange(yearData.entries, yearStart, today), previous: null }
    return {
      current: summarizeDayTotals(entries, weekStart),
      previous: summarizeDayTotals(entries, shiftDateKey(weekStart, -DAYS_PER_WEEK)),
    }
  }, [mode, entries, yearData.entries, weekStart, monthStart, yearStart, today])

  const activityById = useMemo(
    () => new Map((activities ?? []).map((activity) => [activity.id, activity])),
    [activities],
  )

  const delta = previous ? percentChange(current.totalLogs, previous.totalLogs) : null
  const topActivities = current.byActivity
    .slice(0, 3)
    .map((total) => ({ total, activity: activityById.get(total.activityId) }))
    .filter((row): row is { total: typeof row.total; activity: NonNullable<typeof row.activity> } =>
      Boolean(row.activity),
    )

  const monthName = new Intl.DateTimeFormat(locale, { timeZone: 'UTC', month: 'long' }).format(
    dateKeyToDate(today),
  )
  const yearLabel = today.slice(0, 4)

  const bestDayLabel = current.bestDay
    ? mode === 'week'
      ? new Intl.DateTimeFormat(locale, { timeZone: 'UTC', weekday: 'long' }).format(
          dateKeyToDate(current.bestDay.date),
        )
      : new Intl.DateTimeFormat(locale, { timeZone: 'UTC', day: 'numeric', month: 'short' }).format(
          dateKeyToDate(current.bestDay.date),
        )
    : '—'

  const activeDaysValue =
    mode === 'week' ? current.activeDays + '/' + DAYS_PER_WEEK : String(current.activeDays)

  const shareHeadline =
    mode === 'month'
      ? t('weekly.shareHeadlineMonth', { month: monthName, count: current.totalLogs })
      : mode === 'year'
        ? t('weekly.shareHeadlineYear', { year: yearLabel, count: current.totalLogs })
        : t('weekly.shareHeadline', { count: current.totalLogs })

  const shareData: RecapShareData = {
    heading:
      mode === 'month'
        ? t('weekly.thisMonth', { month: monthName })
        : mode === 'year'
          ? t('weekly.thisYear', { year: yearLabel })
          : offset === 0
            ? t('weekly.thisWeek')
            : t('weekly.lastWeek'),
    rangeLabel:
      mode === 'year'
        ? yearLabel
        : mode === 'month'
          ? monthName
          : weekStart,
    totalLogs: current.totalLogs,
    totalLabel: t('weekly.totalLogs'),
    deltaLabel:
      delta !== null && previous && previous.totalLogs > 0
        ? t('weekly.vsLastWeek', { delta: (delta > 0 ? '+' : '') + delta + '%' })
        : null,
    metrics: [
      { label: t('weekly.activeDays'), value: activeDaysValue },
      { label: t('weekly.bestDay'), value: bestDayLabel },
    ],
    weekdayInitials: t('stats.weekdayLabels').split(' '),
    countsByDay: current.countsByDay,
    activities: topActivities.map((row) => ({
      name: activityName(row.activity.name),
      detail: amountWithUnit(row.total.amount, row.activity.unit),
      count: row.total.count,
      color: ACTIVITY_HEX[row.activity.color]?.light ?? '#6B4EE6',
    })),
    activitiesLabel: t('weekly.topActivities'),
    shareText: [
      shareHeadline,
      ...topActivities.map((row) =>
        t('weekly.shareLine', {
          name: activityName(row.activity.name),
          value: amountWithUnit(row.total.amount, row.activity.unit),
        }),
      ),
    ].join(String.fromCharCode(10)),
  }

  const modeOptions: SegmentedOption<RecapMode>[] = [
    { value: 'week', label: t('weekly.modeWeek') },
    { value: 'month', label: t('weekly.modeMonth') },
    { value: 'year', label: t('weekly.modeYear') },
  ]

  const weekdayLabels = t('stats.weekdayLabels').split(' ')
  const peak = Math.max(...current.countsByDay, 1)

  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between px-1">
        <Text className="text-sm font-bold uppercase tracking-wide text-text dark:text-text-dark">
          {t('weekly.title')}
        </Text>
        {mode === 'week' ? (
          <View className="flex-row items-center gap-1">
            <IconButton
              label={t('weekly.previousWeek')}
              disabled={weekStart <= firstWeekStart}
              onPress={() => setOffset((value) => value - 1)}
              className="h-9 w-9"
            >
              <ChevronLeft size={18} color={colors.textMuted} />
            </IconButton>
            <IconButton
              label={t('weekly.nextWeek')}
              disabled={offset >= 0}
              onPress={() => setOffset((value) => value + 1)}
              className="h-9 w-9"
            >
              <ChevronRight size={18} color={colors.textMuted} />
            </IconButton>
          </View>
        ) : null}
      </View>

      <Segmented value={mode} options={modeOptions} onChange={setMode} />

      <View style={SHADOW_TILE} className="gap-4 rounded-3xl border border-border bg-surface p-4 dark:border-border-dark dark:bg-surface-dark">
        {current.totalLogs === 0 ? (
          <Text className="py-4 text-center text-sm text-text-muted dark:text-text-muted-dark">
            {mode === 'week' && offset !== 0 ? t('weekly.emptyPast') : t('weekly.empty')}
          </Text>
        ) : (
          <>
            <View className="flex-row items-end justify-between">
              <View>
                <Text className="text-3xl font-extrabold text-text dark:text-text-dark">
                  {current.totalLogs}
                </Text>
                <Text className="text-xs font-medium text-text-muted dark:text-text-muted-dark">
                  {t('weekly.totalLogs')}
                </Text>
              </View>
              {delta !== null && previous && previous.totalLogs > 0 ? (
                <View className="rounded-full bg-brand-soft px-2.5 py-1 dark:bg-brand-soft-dark">
                  <Text className="text-xs font-bold text-brand dark:text-brand-dark">
                    {t('weekly.vsLastWeek', { delta: `${delta > 0 ? '+' : ''}${delta}%` })}
                  </Text>
                </View>
              ) : null}
            </View>

            <View className="flex-row items-end justify-between gap-1.5">
              {current.countsByDay.map((count, index) => (
                <View key={index} className="flex-1 items-center gap-1">
                  <View className="h-14 w-full justify-end overflow-hidden rounded-lg bg-surface-sunken dark:bg-surface-sunken-dark">
                    <View
                      className="w-full rounded-lg bg-brand"
                      style={{ height: `${count > 0 ? Math.max(12, (count / peak) * 100) : 0}%` }}
                    />
                  </View>
                  <Text className="text-[10px] font-bold text-text-subtle dark:text-text-subtle-dark">
                    {weekdayLabels[index]}
                  </Text>
                </View>
              ))}
            </View>

            {topActivities.map(({ total, activity }) => (
              <View key={activity.id} className="flex-row items-center gap-3">
                <ActivityIcon icon={activity.icon} color={activity.color} size="sm" />
                <View className="min-w-0 flex-1">
                  <Text className="text-sm font-bold text-text dark:text-text-dark" numberOfLines={1}>
                    {activityName(activity.name)}
                  </Text>
                  <Text className="text-xs text-text-muted dark:text-text-muted-dark" numberOfLines={1}>
                    {amountWithUnit(total.amount, activity.unit)}
                  </Text>
                </View>
                <Text className="text-sm font-bold text-text-muted dark:text-text-muted-dark">
                  {total.count}
                </Text>
              </View>
            ))}

            <Button
              title={t('weekly.share')}
              variant="secondary"
              size="sm"
              fullWidth
              icon={<Share2 size={16} color={colors.text} />}
              onPress={() => setSharing(true)}
            />
          </>
        )}
      </View>

      <RecapShareSheet open={sharing} data={shareData} onClose={() => setSharing(false)} />
    </View>
  )
}

function SettingsSection() {
  const { t, locale, setLocale } = useI18n()
  const { showToast } = useToast()
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const colors = useThemeColors()

  const { mode: themeMode, setMode: changeTheme, accent, setAccent } = useThemeSettings()
  const [exporting, setExporting] = useState(false)

  const deviceTimeZone = getBrowserTimeZone()
  const mismatch = profile && profile.timezone !== deviceTimeZone

  const fixTimeZone = async () => {
    if (!profile) return
    try {
      await updateProfile(getSupabaseBrowserClient(), profile.id, { timezone: deviceTimeZone })
      await queryClient.invalidateQueries({ queryKey: queryKeys.profile(profile.id) })
      showToast(t('profile.saved'), 'success')
    } catch {
      showToast(t('common.genericError'), 'error')
    }
  }

  const exportData = async () => {
    if (!profile) return
    setExporting(true)
    try {
      const data = await buildDataExport(getSupabaseBrowserClient(), profile.id)
      const path = FileSystem.cacheDirectory + 'getdailyme-' + new Date().toISOString().slice(0, 10) + '.json'
      await FileSystem.writeAsStringAsync(path, JSON.stringify(data, null, 2))
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(path, { mimeType: 'application/json' })
      }
      showToast(t('profile.exportDone'), 'success')
    } catch {
      showToast(t('common.genericError'), 'error')
    } finally {
      setExporting(false)
    }
  }

  const themeLabel: Record<ThemeMode, string> = {
    light: t('profile.themeLight'),
    dark: t('profile.themeDark'),
    system: t('profile.themeSystem'),
  }

  return (
    <View className="gap-4">
      <View className="gap-2">
        <Text className="px-1 text-sm font-bold uppercase tracking-wide text-text dark:text-text-dark">
          {t('profile.languageLabel')}
        </Text>
        <Segmented
          value={locale}
          options={LOCALES.map((item) => ({ value: item, label: LOCALE_LABELS[item] }))}
          onChange={setLocale}
        />
      </View>

      <View className="gap-2">
        <Text className="px-1 text-sm font-bold uppercase tracking-wide text-text dark:text-text-dark">
          {t('profile.themeLabel')}
        </Text>
        <Segmented
          value={themeMode}
          options={THEME_MODES.map((mode) => ({ value: mode, label: themeLabel[mode] }))}
          onChange={changeTheme}
        />
      </View>

      <View className="gap-2">
        <Text className="px-1 text-sm font-bold uppercase tracking-wide text-text dark:text-text-dark">
          {t('profile.accentLabel')}
        </Text>
        <View className="flex-row gap-2">
          {ACCENTS.map((value) => {
            const selected = accent === value
            const hex = ACCENT_HEX[value]
            const accentLabel = {
              celeste: t('profile.accentCeleste'),
              menta: t('profile.accentMenta'),
              violeta: t('profile.accentVioleta'),
            }[value]
            return (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => setAccent(value)}
                className={
                  selected
                    ? 'min-h-11 flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-brand bg-brand-soft px-3 dark:bg-brand-soft-dark'
                    : 'min-h-11 flex-1 flex-row items-center justify-center gap-2 rounded-2xl border border-border bg-surface-sunken px-3 dark:border-border-dark dark:bg-surface-sunken-dark'
                }
              >
                <View
                  className="h-4 w-4 rounded-full"
                  style={{ backgroundColor: hex.light.brand }}
                />
                <Text
                  className={
                    selected
                      ? 'text-sm font-semibold text-brand dark:text-brand-dark'
                      : 'text-sm font-semibold text-text-muted dark:text-text-muted-dark'
                  }
                >
                  {accentLabel}
                </Text>
              </Pressable>
            )
          })}
        </View>
      </View>

      <View className="gap-2 rounded-3xl border border-border bg-surface p-4 dark:border-border-dark dark:bg-surface-dark">
        <View className="flex-row items-center gap-2">
          <Clock size={16} color={colors.textMuted} />
          <Text className="text-sm font-bold text-text-muted dark:text-text-muted-dark">
            {t('profile.timezoneLabel')}
          </Text>
        </View>
        <Text className="text-sm font-bold text-text dark:text-text-dark">{profile?.timezone}</Text>
        {mismatch ? (
          <Button
            title={t('profile.timezoneUpdate', { timezone: deviceTimeZone })}
            size="sm"
            variant="secondary"
            onPress={() => void fixTimeZone()}
          />
        ) : null}
      </View>

      <View className="gap-2 rounded-3xl border border-border bg-surface p-4 dark:border-border-dark dark:bg-surface-dark">
        <View className="flex-row items-center gap-2">
          <Download size={16} color={colors.textMuted} />
          <Text className="text-sm font-bold text-text-muted dark:text-text-muted-dark">
            {t('profile.exportLabel')}
          </Text>
        </View>
        <Text className="text-xs text-text-subtle dark:text-text-subtle-dark">
          {t('profile.exportHelp')}
        </Text>
        <Button
          title={exporting ? t('profile.exporting') : t('profile.exportCta')}
          size="sm"
          variant="secondary"
          loading={exporting}
          onPress={() => void exportData()}
        />
      </View>
    </View>
  )
}

function ProfileEditorSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n()
  const { showToast } = useToast()
  const { profile } = useAuth()
  const queryClient = useQueryClient()

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '')
  const [username, setUsername] = useState(profile?.username ?? '')
  const [saving, setSaving] = useState(false)

  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open && profile) {
      setDisplayName(profile.display_name)
      setUsername(profile.username)
    }
  }

  if (!profile) return null

  const normalized = username.trim().toLowerCase()
  const unchanged = normalized === profile.username
  const daysLocked = daysUntilUsernameChange(profile.username_changed_at)
  const formatOk = unchanged || USERNAME_PATTERN.test(normalized)
  const canSave = displayName.trim().length > 0 && formatOk && !saving

  const save = async () => {
    setSaving(true)
    try {
      await updateProfile(getSupabaseBrowserClient(), profile.id, {
        display_name: displayName.trim(),
        ...(unchanged || daysLocked > 0 ? {} : { username: normalized }),
      })
      await queryClient.invalidateQueries({ queryKey: queryKeys.profile(profile.id) })
      showToast(t('profile.saved'), 'success')
      onClose()
    } catch (error) {
      showToast(
        isUsernameCooldownError(error) ? t('profile.usernameLocked') : t('common.genericError'),
        'error',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('profile.editTitle')}
      closeLabel={t('common.close')}
      footer={
        <Button
          title={saving ? t('common.saving') : t('common.save')}
          size="lg"
          fullWidth
          disabled={!canSave}
          loading={saving}
          onPress={() => void save()}
        />
      }
    >
      <View className="gap-4 pt-2">
        <TextInput
          label={t('profile.displayNameLabel')}
          value={displayName}
          maxLength={40}
          onChangeText={setDisplayName}
        />
        <TextInput
          label={t('profile.usernameLabel')}
          value={username}
          maxLength={20}
          autoCapitalize="none"
          editable={daysLocked === 0}
          hint={
            daysLocked > 0
              ? t('profile.usernameCooldown', { count: daysLocked })
              : t('profile.usernameChangeOnce', { count: USERNAME_COOLDOWN_DAYS })
          }
          onChangeText={(text) => setUsername(text.toLowerCase().replace(/\s/g, ''))}
        />
      </View>
    </Sheet>
  )
}
