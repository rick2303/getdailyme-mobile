import { FlexWidget, ImageWidget, TextWidget } from 'react-native-android-widget'

import type { FriendsWidgetPayload, WidgetFriendEntry } from '@/lib/widget'

// Lo ultimo de tus amistades, una fila por persona: foto de perfil redonda a la
// izquierda, quien y que a la derecha, y la hora al final. La forma es la de una
// lista de chats a proposito — se lee de un vistazo y no hace falta explicarla.
type Hex = `#${string}`

const SURFACE: Hex = '#1E1E28'
const TEXT: Hex = '#F2F2F5'
const MUTED: Hex = '#A8A8B3'
const AVATAR_BG: Hex = '#2A2A36'

const AVATAR = 40

function Avatar({ entry, brand }: { entry: WidgetFriendEntry; brand: Hex }) {
  if (entry.avatar) {
    return (
      <ImageWidget
        image={`data:image/jpeg;base64,${entry.avatar}`}
        imageWidth={AVATAR}
        imageHeight={AVATAR}
        radius={AVATAR / 2}
      />
    )
  }

  // Sin foto, las iniciales sobre un disco: lo mismo que hace la app.
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
      <TextWidget
        text={entry.initials}
        style={{ fontSize: 14, fontWeight: '700', color: brand }}
      />
    </FlexWidget>
  )
}

export function FriendsWidget({ data }: { data: FriendsWidgetPayload }) {
  const brand = data.brand as Hex

  if (data.entries.length === 0) {
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
        <TextWidget text="Sin novedades" style={{ fontSize: 14, fontWeight: '700', color: TEXT }} />
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
      <TextWidget
        text="Amistades"
        style={{ fontSize: 12, fontWeight: '900', color: brand, marginBottom: 8 }}
      />

      {data.entries.map((entry) => (
        <FlexWidget
          key={`${entry.author}-${entry.when}`}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            width: 'match_parent',
            marginBottom: 10,
          }}
        >
          <Avatar entry={entry} brand={brand} />
          <FlexWidget style={{ flexDirection: 'column', marginLeft: 10, flexGap: 1 }}>
            <TextWidget
              text={entry.author}
              style={{ fontSize: 13, fontWeight: '700', color: TEXT }}
            />
            <TextWidget
              text={`${entry.activity} · ${entry.detail}`}
              style={{ fontSize: 11, color: MUTED }}
            />
          </FlexWidget>
        </FlexWidget>
      ))}
    </FlexWidget>
  )
}
