// El disparo de avisos en nativo llega en la fase de push (OneSignal + ruta del
// servidor con Authorization en vez de cookie). El contrato se mantiene desde
// ya para que los hooks portados no cambien cuando eso aterrice.
export type NotifySource =
  | 'test'
  | { type: 'nudge'; nudgeId: string }
  | { type: 'reaction'; reactionId: string }
  | { type: 'comment'; commentId: string }

export async function requestPush(_source: NotifySource): Promise<void> {
  // Pendiente: POST a app.getdailyme.com/api/push/notify con el access token.
}
