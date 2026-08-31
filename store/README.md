# Material de lanzamiento

Todo lo que piden App Store Connect y Play Console que no es el binario.
Lo que se puede generar, se genera; lo que no, está especificado.

```bash
npm run store:assets   # feature graphics + icono 512 de Play
npm run store:check    # limites de caracteres de las fichas
npm run icons          # icono 1024 y foreground adaptativo (-> assets/)
npm run seed:review    # cuenta de demostracion para App Review y Play
npm run shots          # capturas de Play a 1080x2160 desde adb
```

## Qué hay aquí

| Ruta | Qué es | Estado |
|---|---|---|
| `feature-graphic-es.png` · `-en.png` | Feature graphic de Play, 1024x500, sin alfa | ✅ generado |
| `play-icon-512.png` | Icono suelto que pide Play Console | ✅ generado |
| `listing/es.md` · `listing/en.md` | Textos de ficha, listos para pegar | ✅ escrito |
| `screenshots/README.md` | Medidas exactas y guion de capturas | ✅ especificado |
| `screenshots/android/en/` · `es/` | 18 capturas de Play por idioma, 1080x2160 | ✅ tomadas |
| `screenshots/ios-6.9/` | 6.9" de App Store | ⛔ hacen falta un Mac y Xcode |
| `demo-photos/` | Ilustraciones que sube la siembra a los registros | ✅ generadas |
| `well-known/apple-app-site-association` | Universal links de iOS | ✅ desplegado y verificado |
| `well-known/assetlinks.json` | App Links de Android | ⛔ 404 y sin huella SHA-256 |
| `crash-reporting.md` | Sentry: qué ya hace la app y qué falta configurar | ⚠️ DSN puesto, falta el token de source maps |
| `privacidad-subencargados.md` | OneSignal y Sentry sin declarar en la política | ⚠️ falta publicar |

## Lo que bloquea el envío ahora mismo

> Estado verificado contra los dominios en vivo el **2026-08-30**.

### 1. `assetlinks.json` da 404 — bloqueante

El middleware ya está arreglado y desplegado (commit `a292bf8` del repo web): el
AASA responde **200** con `Content-Type: application/json`, así que **los
universal links de iOS funcionan**.

Lo que falta es el archivo de Android. `public/.well-known/` en el repo web solo
tiene el `apple-app-site-association`; el `assetlinks.json` nunca se añadió.
Confirmado por el verificador de Google:

```
ERROR_CODE_FETCH_ERROR — 404 Not Found
https://app.getdailyme.com/.well-known/assetlinks.json
```

Con `autoVerify: true` en `app.json`, los App Links no verifican y las
invitaciones abren el navegador.

Depende de la huella SHA-256 de Play App Signing, que **solo existe después de
la primera subida**. Orden obligado: subir a un track cerrado → copiar la huella
de *App integrity* → rellenar `well-known/assetlinks.json` → copiarlo a
`public/.well-known/` del repo web → desplegar → verificar.

### 2. Capturas de pantalla — Android hecho, iOS bloqueado

Hay **18 por idioma** en `screenshots/android/en/` y `screenshots/android/es/`, a
1080x2160, sin canal alfa y con la barra de estado en modo demo (9:41, batería
llena, wifi al máximo, sin radio móvil ni iconos de notificación).

Play acepta 8 como mucho: son un muestrario para elegir, no el juego final.

| | Pantalla |
|---|---|
| `01-today` | Hoy, día a medio registrar, seis actividades |
| `02-log-detail` | Registrar con foto, nota, hora y el histórico del día |
| `03-feed` | Muro con foto, nota y reacciones |
| `04-notifications` | La bandeja de novedades, en modal |
| `05-comments` | Hilo de comentarios con respuesta |
| `06-events` · `07-events-calendar` | Eventos en lista y en calendario |
| `08-event-create` · `09-event-detail` | Crear un evento y quién va |
| `10-friends` | 5 amistades, un toque y una solicitud pendiente |
| `11-challenges` · `12-challenge-new` | Retos con clasificación, y crear uno |
| `13-clubs` · `14-club-detail` | Clubs y el ranking de la semana |
| `15-profile` · `16-profile-calendar` | Rachas, resumen y mapa de calor de 4 meses |
| `17-manage-activities` | Gestionar la lista de actividades |
| `18-activity-privacy` | **Quién ve cada actividad** — el diferenciador |

```bash
SHOTS_LOCALE=en npm run shots -- shot 01-today   # captura la pantalla actual
npm run shots -- list                            # cuántas hay
npm run shots -- reset                           # quita el modo demo de la barra
```

Sin `SHOTS_LOCALE` las capturas caen sueltas en `android/`; con él, en su
subcarpeta. Cada ficha necesita su juego con el texto en su idioma, así que se
pasa dos veces: siembra en `en`, capturas, cambia el idioma en Perfil → Ajustes,
siembra en `es`, capturas.

Arranca el emulador y ya está — el AVD **es 1080x2160 de fábrica**, no hay que
forzar nada:

```bash
emulator -avd getdailyme_api36 -gpu host
```

No uses `-skin 1080x2160`. Funciona para el PNG, pero desactiva el autoajuste de
ventana del emulador: la ventana sale a tamaño real, 2160px de alto, y en una
pantalla de portátil (1536x864 aquí) queda a medias fuera y **sin barra de
título a la que agarrarla**, así que no se puede ni mover. Por eso la medida
vive en `config.ini` del AVD y no en la línea de comandos:

```ini
hw.lcd.height=2160     # el panel del Pixel 7 son 2400, que es 20:9 y Play lo rechaza
showDeviceFrame=no
skin.name=1080x2160
skin.path=_no_skin
```

Queda un `config.ini.bak-1080x2400` al lado por si hay que volver atrás. Y en
`emulator-user.ini`, `window.scale = 0.300000` deja la ventana en unos 338x686,
cómoda de mover. Con `-1` el emulador autoajusta, pero se pasa: pide 858px de
alto y el área útil de esta pantalla son 816.

Ese AVD corre **Android 16 (API 36)**, que es el `targetSdk` real de la app
(`android/app/build/intermediates/merged_manifest/.../AndroidManifest.xml`).
Importa: Android 15+ aplica *edge-to-edge* obligatorio a las apps que apuntan a
35 o más, así que las capturas hechas en un emulador viejo enseñan un reparto de
márgenes que ningún usuario va a ver. Que el emulador sea de un modelo u otro da
igual — no sale ningún marco de teléfono en la captura — pero **la versión de
Android no da igual**.

Si el dispositivo midiera otra cosa, el script recurre a `adb shell wm size`,
avisa de ello, y verás franjas negras alrededor de la app: el PNG sale bien
igual, pero es incómodo trabajar así. Con este AVD no hace falta.

El script fija además la densidad a **400ppp** (el AVD viene a 420). Con el alto
en 2160 eso deja una ventana lógica de 432x864dp, que es lo más cerca que se
puede estar de lo que ve alguien con un teléfono actual — un Pixel 7 son
411x914dp. `reset` la devuelve a la del dispositivo.

### Por qué 1080x2160 y no 1080x1920 ni 1080x2400

**1080x1920 es 9:16, la forma de un teléfono de hace diez años.** Cumple, pero
en la ficha se lee como una app vieja al lado de las demás, y encima desperdicia
alto: en el Perfil la gráfica semanal salía cortada a media cifra.

Subirlas al panel nativo del AVD, 1080x2400, tampoco vale. Play pide:

> *"the maximum dimension of your screenshot can't be more than twice as long as
> the minimum dimension"*

2400 es 2.22 veces 1080, así que se rechaza. **2160 es el límite exacto**: 18:9,
la proporción más alta que Play admite, y sigue por encima de los 1080px que
pide para optar a los huecos de *apps recomendadas*.

El aspecto aún más largo llega con **iOS**: las de 6.9" son 1290x2796, casi
19.5:9. Las dos tiendas piden cosas distintas a propósito.

Una cosa más de la barra de estado: el modo demo se lanza con la radio móvil
**escondida**. Con `network -e mobile show` la barra saca también la etiqueta del
tipo de dato y `datatype none` no siempre llega a tiempo — se cuela un **"3G"**
que envejece la captura de golpe. Wifi al máximo y batería llena y ya.

`adb screencap` siempre devuelve RGBA y Apple rechaza las capturas con canal
alfa, así que el script las aplana antes de guardarlas.

**Necesita la app instalada**, y con OneSignal, HealthKit y el widget nativo
**Expo Go no sirve**: hace falta un dev build (`npx expo run:android`) o el APK
de EAS.

**Las de iOS no se pueden hacer en Windows.** Las de 6.9" salen del simulador de
Xcode o de un iPhone físico, y ambos piden un Mac. Es dependencia de máquina, no
de tiempo: hay que decidir de dónde sale ese Mac.

Para repetirlas: `npm run seed:review` contra el Supabase que use la app, entrar
con la cuenta de revisión, y marcar los avisos como leídos antes de la del Feed
(si no, la bandeja tapa el contenido social, que es el gancho).

### 3. Cuenta de revisión — resuelto, falta ejecutarlo en producción

`npm run seed:review` deja la cuenta que piden las dos tiendas. Ya no es «una
amiga y dos eventos»: son **siete personas**, 120 días de historial, feed con
fotos y conversaciones, 5 amistades más una solicitud sin contestar, 3 eventos,
2 clubs, 3 retos con clasificación y una actividad en privacidad personalizada.
Una app vacía vuelve como *"we were unable to evaluate the functionality"*.

```bash
SUPABASE_URL=https://<ref>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<service_role> \
REVIEW_LOCALE=es \
npm run seed:review
```

`REVIEW_LOCALE` (`en` o `es`) cambia notas, comentarios y los títulos de clubs,
retos y eventos, y renombra las cinco actividades por defecto. Los nombres de
las personas no cambian: alguien se llama igual en las dos fichas.

Las horas se calculan **en la zona horaria de la cuenta** (`REVIEW_TIMEZONE`,
por defecto `America/New_York`), no en la de la máquina que lanza el script. Con
`setHours()` a secas, sembrar desde Madrid una cuenta de Nueva York dejaba
registros a las 2 de la madrugada de allí y algunos cruzaban la medianoche: las
rachas y el «N registros hoy» salían descuadrados.

`REVIEW_NOW=2026-08-31T21:30:00` ancla el reloj del sembrado. Solo hace falta
para las capturas: si el script corre de madrugada, «hoy» lleva diez minutos y
la pantalla de Hoy sale vacía. En producción se deja sin poner.

Habla solo por HTTPS (Auth Admin + PostgREST + Storage): no necesita psql ni
Docker, y es idempotente. Probado contra el Supabase local; **falta pasarlo en
producción**, que es donde el revisor va a entrar.

Las fotos que sube a los registros salen de `store/demo-photos/`, que genera
`node scripts/make-demo-photos.mjs`. Son ilustraciones vectoriales dibujadas
aquí, no fotos: lo que aparece en una ficha es material público, y una foto de
banco arrastra licencia y una de una persona real arrastra permiso.

### 4. Sentry sin DSN — riesgo, no bloqueante

`EXPO_PUBLIC_SENTRY_DSN` está vacío en `.env` y ausente en los tres perfiles de
`eas.json`, así que producción sale sin crash reporting: el primer fallo masivo
no se ve. Es un secreto de EAS, no una línea en `eas.json`:

```bash
eas secret:create --scope project --name EXPO_PUBLIC_SENTRY_DSN --value <dsn>
```

El DSN sale de Sentry → organización `qali-t`, proyecto `getdailyme`. Ver
`crash-reporting.md`.

### 5. `/invite/:token` redirige al login — riesgo

`GET /invite/test123` responde 307 a `/sign-in`. No rompe la verificación del
deep link, pero quien no tenga la app instalada choca con un muro de registro en
vez de ver la invitación, y es lo que vería un revisor que siga el enlace.

## Lo que ya está resuelto

- **Icono.** Era 512x512 con canal alfa; ahora es 1024x1024 sin alfa
  (`assets/icon.png`), redibujado como vector desde el original.
- **Icono adaptativo de Android.** Apuntaba al icono a sangre, así que la máscara
  circular del launcher cortaba el anillo entero. Ahora usa
  `assets/adaptive-icon.png`, con el glifo dentro de la zona segura.
- **Crash reporting.** Sentry integrado en `lib/crash.ts`, enganchado al
  `ErrorBoundary` y al id de sesión. Inactivo hasta que haya DSN; ver
  `crash-reporting.md`.
- **Legal.** Las cuatro URLs responden 200 y hay páginas de borrado de cuenta
  dedicadas en los dos idiomas. Están recogidas en `listing/*.md`.
- **Política de privacidad.** `/privacidad` y `/en/privacy` ya nombran OneSignal,
  Sentry y Supabase. Verificado en vivo el 2026-08-30.
- **URL de soporte.** `/soporte` y `/en/support` responden 200.
- **URL de borrado de cuenta.** `/eliminar-cuenta` y `/en/delete-account`
  responden 200 — Play la pide aparte de la política.
- **Middleware del repo web.** `.well-known` ya no cae en el login.
- **Submit de Android.** `eas.json` tenía `submit.production.ios` pero no el
  bloque de Android; ya está, apuntando a `play-service-account.json`
  (ignorado por git, hay que descargarlo de Google Cloud).
- **Apple 1.2 (contenido de usuario).** Denuncia (`lib/api/reports.ts`, cuatro
  motivos), bloqueo (`blockUser`) y borrado de cuenta, los tres en la app.

## Dos fallos que solo aparecieron al ejecutar la app

Los encontró el pase de capturas, no el audit: hay que instalar y abrir para
verlos.

### Crash al abrir en toda instalación nueva de Android

`lib/theme.ts` llamaba a `Appearance.setColorScheme(null)` para el modo
«sistema». En Android el módulo nativo declara `setColorScheme(style: String)`
y el centinela que espera es la cadena `'unspecified'`; con `null` lanza
`NullPointerException` antes del primer render.

Saltaba **en cada instalación nueva**: sin nada guardado, `loadThemeMode()`
devuelve `'system'` y `ThemeProvider` lo aplica al montar. Es decir, la app se
cerraba nada más abrirla para todo usuario nuevo — y para el revisor.

`ColorSchemeName` es `'light' | 'dark' | 'unspecified'`, así que TypeScript lo
habría cazado; lo tapaba un `as ColorSchemeName` en esa misma línea.

### Tarjetas al 100% con un recuadro gris

Las actividades que llegan a la meta pintan el fondo con `withTint()`, que
devuelve el color con alfa (`#RRGGBB1F`). Esa vista lleva la sombra de
`SHADOW_TILE` (`elevation: 2`) y en Android la sombra se dibuja **por debajo**
del fondo: con un fondo translúcido se transparenta, lava la tarjeta de gris y
le rompe el recorte redondeado. Se veía en la única tarjeta completa.

Arreglado con `tintOverSurface()` / `useActivityTintSolid()` en
`constants/colors.ts`: el mismo 12%, pero ya compuesto sobre la superficie y
opaco. `withTintStrong()` sigue con alfa donde está bien (el disco del icono no
lleva `elevation`).

> Regla para el futuro: en Android, fondo translúcido y `elevation` no se
> mezclan. Si una vista lleva sombra, su fondo tiene que ser opaco.

## El service account de Play

`eas.json` lo espera en `play-service-account.json`, en la raíz del repo e
ignorado por git. Sin él `eas submit --platform android` no arranca. Cómo se
saca, una sola vez:

1. Play Console → *Users and permissions* → *Invite new users* → cuenta de
   servicio, o bien Google Cloud → *IAM & Admin* → *Service Accounts* → crear.
2. En Google Cloud, sobre esa cuenta: *Keys* → *Add key* → *JSON*. Se descarga
   una vez y no se puede volver a descargar.
3. Guardarla como `play-service-account.json` en la raíz.
4. En Play Console, darle el permiso *Release apps to testing tracks* (y
   *Release to production* cuando toque salir del track cerrado).

Cada persona del equipo descarga la suya; el archivo no se comparte ni se sube.

## Falsos positivos del audit

Por si se vuelve a pasar `store-launch-audit` y vuelven a salir:

- **REL-030** «service_role de Supabase embebida en `lib/push/client.ts`» — no lo
  está. La palabra aparece en un comentario que explica que quien la usa es la
  Edge Function `push-notify`, en el servidor.
- **LGL-001** «no encuentro documentos legales en `legal/`» — están, pero en el
  sitio de marketing (`getdailyme.com`), que es donde tienen que estar.
- **DL-010** «no encuentro `apple-app-site-association` en el repo del sitio» —
  el script busca dentro de este repo, y el archivo lo sirve el repo web. Está
  desplegado y verificado: responde 200 con `Content-Type: application/json`.
- **BLD-011** «`play-service-account.json` no existe» — es correcto, pero es un
  secreto que cada quien descarga en su máquina. Ver la sección de arriba.

El único BLOCKER real que queda del audit es **DL-020**, el `assetlinks.json`.

## Fallos que encontró el pase de capturas de los dos idiomas

Los tres son del mismo tipo: el trigger de alta crea las cinco actividades
**siempre en español** (`Agua`, `Comida`, `Ejercicio`, `Lectura`, `Sueño`), sea
cual sea el idioma del perfil. La app las traduce al pintarlas con
`useActivityLabels`, pero había sitios que se saltaban esa traducción y sacaban
el nombre crudo de la base con la interfaz en inglés.

- **Panel de detalle del registro** (`app/(tabs)/index.tsx`): el título salía
  `Comida` en una pantalla por lo demás en inglés. Usaba `activity.name` en vez
  de `activityName(activity.name)`.
- **Gestionar actividades** (`components/profile/manage-activities-sheet.tsx`):
  la lista entera en español, y el diálogo de borrar con el nombre crudo.
- **Toast de registrar y etiqueta de accesibilidad**: «Logged · Agua».

Arreglados los tres. Y el de fondo también, con una migración en el repo del
sitio (`Portfolio/getdailyme`):

**`supabase/migrations/20260831120000_default_activities_locale.sql`**

- `handle_new_user` calcula el idioma una vez y crea las cinco actividades en
  ese idioma. De paso, el último recurso del nombre visible (`'Usuario'`) ya no
  va fijo en español.
- Renombra las de las cuentas en inglés que ya existen, **solo si nadie las ha
  tocado**: exige que nombre, icono, color, unidad, meta y posición sean
  exactamente los que puso el trigger. Con que hayan cambiado la meta o el
  icono, la fila se queda como está — ese `Agua` puede ser deliberado. Probado:
  renombra cuatro y respeta la retocada.

Aplicada y verificada contra el Supabase local. **Falta `supabase db push`** al
proyecto de producción.

No hace falta tocar cliente: `SEED_NAME_KEYS` ya mapea los nombres en los dos
idiomas, en la app (`lib/activities/labels.ts`) y en la web
(`src/lib/activities/labels.ts`), así que las filas viejas en español se siguen
pintando bien y las nuevas en inglés también.
