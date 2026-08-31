# Falta declarar dos proveedores

La política de privacidad de `getdailyme.com` nombra a Apple, Google, Supabase,
Vercel y Expo. **No nombra a OneSignal ni a Sentry**, y los dos tratan datos.

Ambas tiendas comprueban que la política y los formularios cuadren con lo que
hacen los SDK que llevas dentro (es lo que el audit marca como LGL-030 en App
Store y LGL-032 en Play). Declarar de menos es motivo de rechazo, y de los que
cuestan una ronda entera de revisión.

- **OneSignal** venía ya sin declarar: el push va en producción desde la build 19.
- **Sentry** entra con este cambio, así que hay que añadirlo antes de enviar.

## Filas para la tabla de sub-encargados

El sitio ya tiene una tabla con este formato. Añadir estas dos filas:

### Español — `getdailyme.com/privacidad`

| Proveedor | Función | Datos compartidos | Ubicación | Política |
|---|---|---|---|---|
| **OneSignal** | Envío de notificaciones push | Token de push, ID de usuario | USA | https://onesignal.com/privacy_policy |
| **Sentry** (Functional Software, Inc.) | Reporte de errores y crashes | ID de usuario, información del dispositivo, traza del error | USA | https://sentry.io/privacy/ |

### Inglés — `getdailyme.com/en/privacy`

| Provider | Purpose | Data shared | Location | Policy |
|---|---|---|---|---|
| **OneSignal** | Push notification delivery | Push token, user ID | USA | https://onesignal.com/privacy_policy |
| **Sentry** (Functional Software, Inc.) | Error and crash reporting | User ID, device information, error stack trace | USA | https://sentry.io/privacy/ |

## Qué manda Sentry exactamente

Importa para no declarar de más ni de menos. Con la configuración de
`lib/crash.ts`:

| Va | No va |
|---|---|
| Identificador de usuario (el UUID, nada más) | Correo, nombre, nombre de usuario |
| Modelo, sistema operativo, versión de la app | Ubicación |
| Traza del error y `componentStack` | Cuerpos de peticiones ni cabeceras (`sendDefaultPii: false`) |
| | Query strings (recortadas en `beforeSend`) |
| | Nada en desarrollo (`enabled: !__DEV__`) |

## Y en los formularios de las tiendas

Que la política lo diga no basta; hay que marcarlo también en:

- **App Store Connect → App Privacy.** Sentry es *Diagnostics → Crash Data* y
  *Performance Data*. El UUID de usuario va como *Identifiers → User ID*,
  **enlazado a la identidad** y **no usado para tracking**.
- **Play Console → Data safety.** *App activity → Crash logs* y
  *Diagnostics*. Recogidos, no compartidos con terceros para publicidad,
  cifrados en tránsito.

En ninguna de las dos marques *«usado para publicidad o marketing»*: no es el
caso y abre preguntas que no toca responder.
