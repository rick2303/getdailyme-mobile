# Crash reporting (Sentry)

> Organizacion `qali-t`, proyecto `getdailyme`, plataforma **React Native**.
> **No pases el `@sentry/wizard`**: el SDK ya esta instalado y cableado, y el
> asistente mete un segundo `Sentry.init()` en `app/_layout.tsx` que pisa la
> configuracion de privacidad de `lib/crash.ts`.

El código ya está puesto y no estorba: sin `EXPO_PUBLIC_SENTRY_DSN`, Sentry no
se inicializa y la app arranca igual. Faltan tres cosas, todas fuera del repo.

## Lo que ya hace la app

| Dónde | Qué |
|---|---|
| `lib/crash.ts` | Init, `captureError`, `setCrashUser`, `wrapRoot` |
| `app/_layout.tsx` | `initCrashReporting()` antes del primer render; el id de sesión se ata a los crashes |
| `components/ui/error-boundary.tsx` | Lo que ya se enseñaba al usuario ahora además se reporta |

Decisiones que van de serie:

- **Apagado en `__DEV__`.** Los errores de desarrollo se ven en consola; no
  interesa ensuciar el proyecto ni gastar cuota.
- **`tracesSampleRate: 0`.** Las trazas de rendimiento son la parte cara y hoy
  no responden a ninguna pregunta abierta. Los crashes sí.
- **`sendDefaultPii: false`** y las query strings se recortan en `beforeSend`.
  Por las URLs de Supabase viajan tokens, y el feed es contenido que el usuario
  cree privado.
- **Del usuario solo va el id.** Ni correo, ni nombre, ni username.

## 1. Crear el proyecto y coger el DSN

En [sentry.io](https://sentry.io) → nuevo proyecto → plataforma **React Native**.
Copia el DSN, que tiene esta pinta:

```
https://abc123@o000000.ingest.de.sentry.io/0000000
```

## 2. Meterlo en los builds

De las tres partes del DSN ya se saben dos:

```
https://<CLAVE_PUBLICA>@o4511344801677313.ingest.us.sentry.io/4511989590261760
         └── falta ──┘   └── org qali-t ──┘  └── region ┘  └─ proyecto getdailyme ─┘
```

La **clave publica** es propia de cada proyecto (no se comparte con splitwo) y
sale de Sentry: *Settings -> Projects -> getdailyme -> Client Keys (DSN)*. Es la
cadena de 32 caracteres que va antes de la arroba.

El DSN **no es un secreto** (viaja dentro del binario por diseno), asi que vive
en `eas.json` junto al resto, no en EAS secrets. Anadelo a `preview` y a
`production`:

```json
"production": {
  "autoIncrement": true,
  "env": {
    "EXPO_PUBLIC_SUPABASE_URL": "...",
    "EXPO_PUBLIC_SUPABASE_ANON_KEY": "...",
    "EXPO_PUBLIC_ONESIGNAL_APP_ID": "...",
    "EXPO_PUBLIC_SENTRY_DSN": "https://<CLAVE>@o4511344801677313.ingest.us.sentry.io/4511989590261760"
  }
}
```

Para local, copia la linea a tu `.env` (esta en `.env.example`).

## 3. Source maps — ya configurado, falta el token

Sin esto los crashes de JS llegan, pero con el stack del bundle minificado:
ilegible. El plugin ya sabe a que proyecto subirlos (`app.json`):

```json
[
  "@sentry/react-native",
  { "organization": "qali-t", "project": "getdailyme" }
]
```

Falta el token de subida. En Sentry: *Settings -> Auth Tokens*, con permiso
`project:releases`. Ese **si es secreto**, asi que va como secret de EAS, no en
`eas.json`:

```bash
eas secret:create --scope project --name SENTRY_AUTH_TOKEN --value sntrys_...
```

> Crea el token **antes** del siguiente build de produccion. Con el plugin ya
> apuntando a la organizacion, un build sin token sube el binario igual pero se
> queda sin source maps, y esos no se pueden anadir despues a un crash que ya
> llego.

## 4. Comprobar que llega

Requiere un build nativo nuevo: Sentry trae código nativo, no basta con
recargar el bundle.

```bash
eas build --profile preview --platform android
```

Con el build instalado, provoca un error a propósito desde cualquier pantalla
(por ejemplo un botón temporal con `throw new Error('prueba de sentry')`) y
comprueba que aparece en el proyecto en menos de un minuto. Bórralo después.

> Ojo con el orden: **haz esta prueba antes de enviar a revisión**, no después.
> Un crash reporting que no reporta se descubre siempre el peor día.
