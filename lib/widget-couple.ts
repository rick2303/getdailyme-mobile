import type { TranslationKey, Translator } from '@/i18n/translate'
import { fetchCouple } from '@/lib/api/couple'
import { fetchMoods, fetchPingTally } from '@/lib/api/couple-presence'
import { isMoodFresh } from '@/lib/couple/moods'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { formatTime, todayKey, zonedDateTimeToIso } from '@/lib/utils/dates'
import type { CoupleWidgetPayload } from '@/lib/widget'
import { avatarToBase64, initialsOf } from '@/lib/widget-friends'

type Options = {
  brand: string
  userId: string
  timeZone: string
  locale: string
  t: Translator
}

// El widget de pareja: quien, como esta ahora y cuantas veces te ha pensado
// hoy. Sin pareja tambien se escribe, con `paired: false`, para que el widget
// diga como emparejarse en vez de quedarse con la pareja de antes de romper.
export async function buildCoupleWidgetPayload(options: Options): Promise<CoupleWidgetPayload> {
  const { brand, userId, timeZone, locale, t } = options
  const client = getSupabaseBrowserClient()
  const couple = await fetchCouple(client, userId)

  const empty: CoupleWidgetPayload = {
    brand,
    paired: false,
    partnerId: null,
    partnerName: '',
    partnerInitials: '',
    partnerAvatar: null,
    mood: null,
    moodLabel: null,
    moodAt: null,
    receivedLabel: '',
    pingLabel: t('presence.pingAction'),
    sentLabel: '',
    tooSoonLabel: t('presence.pingTooSoon'),
    emptyTitle: t('couple.title'),
    emptyBody: t('presence.widgetEmpty'),
  }

  if (!couple) return empty

  const today = todayKey(timeZone)
  const [moods, tally] = await Promise.all([
    fetchMoods(client, couple.id),
    fetchPingTally(client, couple.id, userId, zonedDateTimeToIso(today, '00:00', timeZone)),
  ])

  const partner = couple.partner
  const theirs = moods.find((entry) => entry.userId === partner.id)
  const fresh = theirs && isMoodFresh(theirs.updatedAt) ? theirs : null

  return {
    ...empty,
    paired: true,
    partnerId: partner.id,
    partnerName: partner.displayName,
    partnerInitials: initialsOf(partner.displayName),
    partnerAvatar: partner.avatarUrl ? await avatarToBase64(partner.avatarUrl) : null,
    mood: fresh?.mood ?? null,
    moodLabel: fresh ? t(`presence.mood.${fresh.mood}` as TranslationKey) : t('presence.partnerNoMood'),
    moodAt: fresh ? formatTime(new Date(fresh.updatedAt), locale, timeZone) : null,
    receivedLabel:
      tally.received > 0
        ? t('presence.pingsReceived', { name: partner.displayName, count: tally.received })
        : t('presence.pingsNone'),
    sentLabel: t('presence.pingSent', { name: partner.displayName }),
  }
}
