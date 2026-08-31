import { getSupabaseBrowserClient } from '@/lib/supabase/client'

// El disparo de avisos nativos: la Edge Function push-notify resuelve
// destinatarios y preferencias con service_role y envia por OneSignal.
export type NotifySource =
  | 'test'
  | { type: 'nudge'; nudgeId: string }
  | { type: 'reaction'; reactionId: string }
  | { type: 'comment'; commentId: string }
  | { type: 'friend_request'; addresseeId: string }
  | { type: 'friend_accept'; friendshipId: string }
  | { type: 'friend_log'; logId: string }
  | { type: 'event_invite'; eventId: string; userIds: string[] }

export async function requestPush(source: NotifySource): Promise<void> {
  const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
  if (!baseUrl) return

  const {
    data: { session },
  } = await getSupabaseBrowserClient().auth.getSession()
  if (!session) return

  const body = typeof source === 'string' ? { type: source } : source

  const response = await fetch(`${baseUrl}/functions/v1/push-notify`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) throw new Error(`push-notify ${response.status}`)
}

export async function requestAccountDeletion(): Promise<void> {
  const baseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
  if (!baseUrl) throw new Error('sin configuracion')

  const {
    data: { session },
  } = await getSupabaseBrowserClient().auth.getSession()
  if (!session) throw new Error('sin sesion')

  const response = await fetch(`${baseUrl}/functions/v1/delete-account`, {
    method: 'POST',
    headers: { authorization: `Bearer ${session.access_token}` },
  })

  if (!response.ok) throw new Error(`delete-account ${response.status}`)
}
