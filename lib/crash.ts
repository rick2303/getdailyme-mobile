import * as Sentry from '@sentry/react-native'

// El primer dia de produccion es cuando mas falta hace saber que se rompio. El
// ErrorBoundary convierte el crash en texto legible para quien lo sufre; esto
// lo trae de vuelta para poder arreglarlo.
//
// Sin DSN no hace nada: en desarrollo y en los builds internos no interesa
// ensuciar el proyecto con ruido, y que falte la variable no puede tumbar el
// arranque de la app.

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? ''

export const isCrashReportingEnabled = DSN.length > 0

export function initCrashReporting() {
  if (!isCrashReportingEnabled) return

  Sentry.init({
    dsn: DSN,
    // Los builds de desarrollo no van al proyecto: se ven en la consola.
    enabled: !__DEV__,
    environment: __DEV__ ? 'development' : 'production',

    // Trazas de rendimiento apagadas de salida. Son la parte cara del plan y
    // hoy no hay ninguna pregunta que respondan; los crashes si.
    tracesSampleRate: 0,

    // No mandar cuerpos de peticion ni cabeceras: por ahi se cuelan tokens de
    // Supabase y contenido que el usuario cree privado.
    sendDefaultPii: false,

    beforeSend(event) {
      // El feed y los registros son contenido personal. Si algun dia se activan
      // los breadcrumbs de red, que no viajen con la URL completa.
      if (event.request?.url) {
        event.request.url = event.request.url.split('?')[0]
      }
      return event
    },
  })
}

/** Ata los crashes a la persona, solo con el id. Nada de correo ni nombre. */
export function setCrashUser(userId: string | null) {
  if (!isCrashReportingEnabled) return
  Sentry.setUser(userId ? { id: userId } : null)
}

/** Manda un error ya capturado (por ejemplo, desde el ErrorBoundary). */
export function captureError(error: unknown, context?: Record<string, unknown>) {
  if (!isCrashReportingEnabled) {
    if (__DEV__) console.error('[crash]', error, context)
    return
  }
  Sentry.captureException(error, context ? { extra: context } : undefined)
}

/** Envuelve el componente raiz para que Sentry vea la navegacion y el ciclo de vida. */
export const wrapRoot = isCrashReportingEnabled
  ? Sentry.wrap
  : <T,>(component: T): T => component
