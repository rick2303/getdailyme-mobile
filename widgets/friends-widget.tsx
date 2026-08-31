import { FlexWidget, ImageWidget, TextWidget } from 'react-native-android-widget'

import type { FriendsWidgetPayload } from '@/lib/widget'

// Lo ultimo de tus amistades, en grande. La foto de la entrada mas reciente
// manda, y debajo van dos lineas mas de texto.
//
// Una sola foto y no tres a proposito: cada una viaja como base64 dentro del
// payload —los widgets no pueden descargar nada— asi que tres triplicarian el
// peso para ganar poco. La foto grande es el gancho; el resto se lee.
type Hex = `#${string}`

const SURFACE: Hex = '#1E1E28'
const SURFACE_SOFT: Hex = '#2A2A36'
const TEXT: Hex = '#F2F2F5'
const MUTED: Hex = '#A8A8B3'

export function FriendsWidget({ data }: { data: FriendsWidgetPayload }) {
  const brand = data.brand as Hex
  const [first, ...rest] = data.entries

  if (!first) {
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
        <TextWidget
          text="Sin novedades"
          style={{ fontSize: 14, fontWeight: '700', color: TEXT }}
        />
        <TextWidget
          text="Aquí verás lo último de tus amistades"
          style={{ fontSize: 11, color: MUTED }}
        />
      </FlexWidget>
    )
  }

  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: SURFACE,
        borderRadius: 24,
        padding: 14,
        flexDirection: 'column',
      }}
    >
      <FlexWidget
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: 'match_parent',
          marginBottom: 8,
        }}
      >
        <TextWidget text="Amistades" style={{ fontSize: 12, fontWeight: '900', color: brand }} />
        <TextWidget text={first.when} style={{ fontSize: 11, color: MUTED }} />
      </FlexWidget>

      {data.photo ? (
        <ImageWidget
          image={`data:image/jpeg;base64,${data.photo}`}
          imageWidth={320}
          imageHeight={150}
          radius={16}
          style={{ width: 'match_parent', marginBottom: 8 }}
        />
      ) : null}

      <TextWidget
        text={`${first.author} · ${first.activity}`}
        style={{ fontSize: 14, fontWeight: '700', color: TEXT }}
      />
      <TextWidget text={first.detail} style={{ fontSize: 12, color: MUTED, marginBottom: 6 }} />

      {rest.map((entry) => (
        <FlexWidget
          key={`${entry.author}-${entry.when}`}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            width: 'match_parent',
            backgroundColor: SURFACE_SOFT,
            borderRadius: 12,
            paddingHorizontal: 10,
            paddingVertical: 6,
            marginTop: 4,
          }}
        >
          <TextWidget
            text={`${entry.author} · ${entry.activity}`}
            style={{ fontSize: 11, fontWeight: '600', color: TEXT }}
          />
        </FlexWidget>
      ))}
    </FlexWidget>
  )
}
