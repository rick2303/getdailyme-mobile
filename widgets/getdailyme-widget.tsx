import { FlexWidget, TextWidget } from 'react-native-android-widget'

import type { WidgetPayload } from '@/lib/widget'

// El widget de Android, hermano del de iOS: cabecera con la marca, el "3 de 5"
// grande, la racha y las pendientes con su barra de color. RemoteViews no
// dibuja anillos, asi que el protagonista es el numero con barras.
type Hex = `#${string}`

const SURFACE: Hex = '#1E1E28'
const TEXT: Hex = '#F2F2F5'
const MUTED: Hex = '#A8A8B3'

export function GetdailymeWidget({ data }: { data: WidgetPayload }) {
  const progress = data.due > 0 ? data.done / data.due : 0
  const brand = data.brand as Hex
  const brandSoft = `${data.brand}33` as Hex

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
        justifyContent: 'space-between',
      }}
    >
      <FlexWidget
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: 'match_parent',
        }}
      >
        <TextWidget text="Hoy" style={{ fontSize: 12, fontWeight: '900', color: brand }} />
        <TextWidget
          text={`🔥 ${data.streak}`}
          style={{ fontSize: 12, fontWeight: '700', color: MUTED }}
        />
      </FlexWidget>

      <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', width: 'match_parent' }}>
        <TextWidget text={`${data.done}`} style={{ fontSize: 40, fontWeight: '900', color: TEXT }} />
        <TextWidget
          text={` de ${data.due} metas`}
          style={{ fontSize: 13, fontWeight: '700', color: MUTED }}
        />
      </FlexWidget>

      <FlexWidget
        style={{
          width: 'match_parent',
          height: 8,
          backgroundColor: brandSoft,
          borderRadius: 4,
          flexDirection: 'row',
        }}
      >
        <FlexWidget
          style={{
            flex: Math.max(4, Math.round(progress * 100)),
            height: 'match_parent',
            backgroundColor: brand,
            borderRadius: 4,
          }}
        />
        <FlexWidget
          style={{
            flex: Math.max(1, 100 - Math.max(4, Math.round(progress * 100))),
            height: 'match_parent',
          }}
        />
      </FlexWidget>

      <FlexWidget style={{ flexDirection: 'column', width: 'match_parent', marginTop: 4 }}>
        {data.complete || data.activities.length === 0 ? (
          <TextWidget
            text="🎉 ¡Día completo!"
            style={{ fontSize: 13, fontWeight: '700', color: TEXT }}
          />
        ) : (
          data.activities.slice(0, 3).map((activity) => (
            <FlexWidget
              key={activity.name}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: 'match_parent',
                marginTop: 4,
              }}
            >
              <TextWidget
                text={activity.name}
                truncate="END"
                maxLines={1}
                style={{ fontSize: 12, fontWeight: '600', color: TEXT }}
              />
              <TextWidget
                text={activity.progress >= 1 ? '✓' : `${Math.round(activity.progress * 100)}%`}
                style={{ fontSize: 12, fontWeight: '700', color: activity.color as Hex }}
              />
            </FlexWidget>
          ))
        )}
      </FlexWidget>
    </FlexWidget>
  )
}
