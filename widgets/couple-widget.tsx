import { FlexWidget, ImageWidget, SvgWidget, TextWidget } from 'react-native-android-widget'

import type { CoupleWidgetPayload } from '@/lib/widget'

import { widgetIconSvg, type WidgetIcon } from './widget-icons'

// La pareja en la pantalla de inicio: su cara, como esta ahora y el boton de
// "pienso en ti", que manda el toque sin abrir la app (ver widget-task-handler).
type Hex = `#${string}`

export const PING_PARTNER_ACTION = 'PING_PARTNER'

const SURFACE: Hex = '#1E1E28'
const TEXT: Hex = '#F2F2F5'
const MUTED: Hex = '#A8A8B3'
const AVATAR_BG: Hex = '#2A2A36'

const AVATAR = 48
// El "Enviado" se queda un minuto: lo justo para ver que salio.
const SENT_VISIBLE_MS = 60_000

const MOOD_KEYS: WidgetIcon[] = [
  'happy',
  'loving',
  'excited',
  'calm',
  'tired',
  'busy',
  'stressed',
  'sad',
]

function moodIcon(mood: string | null): WidgetIcon | null {
  return mood && (MOOD_KEYS as string[]).includes(mood) ? (mood as WidgetIcon) : null
}

function Avatar({ data, brand }: { data: CoupleWidgetPayload; brand: Hex }) {
  if (data.partnerAvatar) {
    return (
      <ImageWidget
        image={`data:image/jpeg;base64,${data.partnerAvatar}`}
        imageWidth={AVATAR}
        imageHeight={AVATAR}
        radius={AVATAR / 2}
      />
    )
  }
  return (
    <FlexWidget
      style={{
        width: AVATAR,
        height: AVATAR,
        borderRadius: AVATAR / 2,
        backgroundColor: AVATAR_BG,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <TextWidget text={data.partnerInitials} style={{ fontSize: 16, fontWeight: '700', color: brand }} />
    </FlexWidget>
  )
}

export function CoupleWidget({ data, now = Date.now() }: { data: CoupleWidgetPayload; now?: number }) {
  const brand = data.brand as Hex

  if (!data.paired) {
    return (
      <FlexWidget
        clickAction="OPEN_APP"
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundColor: SURFACE,
          borderRadius: 24,
          padding: 16,
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <TextWidget text={data.emptyTitle} style={{ fontSize: 14, fontWeight: '700', color: TEXT }} />
        <TextWidget text={data.emptyBody} style={{ fontSize: 11, color: MUTED }} />
      </FlexWidget>
    )
  }

  const icon = moodIcon(data.mood)
  const justSent = typeof data.pingSentAt === 'number' && now - data.pingSentAt < SENT_VISIBLE_MS

  return (
    <FlexWidget
      clickAction="OPEN_URI"
      clickActionData={{ uri: 'getdailyme://couple' }}
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: SURFACE,
        borderRadius: 24,
        padding: 14,
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', width: 'match_parent' }}>
        <Avatar data={data} brand={brand} />
        <FlexWidget style={{ flexDirection: 'column', marginLeft: 10, flex: 1 }}>
          <TextWidget
            text={data.partnerName}
            maxLines={1}
            style={{ fontSize: 14, fontWeight: '700', color: TEXT }}
          />
          <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', flexGap: 4 }}>
            {icon ? <SvgWidget svg={widgetIconSvg(icon, brand)} style={{ width: 14, height: 14 }} /> : null}
            <TextWidget
              text={data.moodAt ? `${data.moodLabel ?? ''} · ${data.moodAt}` : (data.moodLabel ?? '')}
              maxLines={1}
              style={{ fontSize: 12, color: MUTED }}
            />
          </FlexWidget>
        </FlexWidget>
      </FlexWidget>

      <TextWidget text={data.receivedLabel} maxLines={1} style={{ fontSize: 11, color: MUTED }} />

      <FlexWidget
        clickAction={PING_PARTNER_ACTION}
        style={{
          width: 'match_parent',
          height: 40,
          borderRadius: 14,
          backgroundColor: brand,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          flexGap: 6,
        }}
      >
        <SvgWidget
          svg={widgetIconSvg(justSent ? 'check' : 'ping', '#FFFFFF')}
          style={{ width: 18, height: 18 }}
        />
        <TextWidget
          text={justSent ? data.sentLabel : data.pingLabel}
          maxLines={1}
          style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}
        />
      </FlexWidget>
    </FlexWidget>
  )
}
