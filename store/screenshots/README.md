# Capturas de pantalla

Las capturas son lo único de este directorio que no se puede generar: hay que
tomarlas del dispositivo. Aquí está exactamente qué hace falta y de qué
pantallas, para que nadie tenga que adivinarlo el día del envío.

## Qué pide cada tienda

### App Store Connect

| | |
|---|---|
| Tamaño obligatorio | **6.9"** — `1290 x 2796` o `1320 x 2868`, vertical |
| Cantidad | 3 a 10 por idioma |
| iPad | **No hace falta.** `app.json` declara `ios.supportsTablet: false` |
| Formato | PNG o JPEG, sin transparencia, sin esquinas redondeadas |

Apple escala el resto de tamaños desde el de 6.9", así que con ese juego basta.
Simulador que da la medida exacta: **iPhone 16 Pro Max** (1320 x 2868) o
**iPhone 15 Pro Max** (1290 x 2796). No mezclar los dos tamaños en el mismo
idioma.

### Play Console

| | |
|---|---|
| Capturas de teléfono | 2 a 8, lado corto ≥ 320 px, lado largo ≤ 3840 px |
| Proporción | el lado largo, como mucho el **doble** del corto |
| Lo que usamos | `1080 x 2160` vertical — 18:9, el límite exacto |
| Icono | `512 x 512` → ya generado en `../play-icon-512.png` |
| Feature graphic | `1024 x 500` → ya generado en `../feature-graphic-es.png` y `-en.png` |
| Tablet | solo si se declara soporte de pantallas grandes. Hoy no se declara |

## Guion de capturas

Cuatro cuentan la app entera. La quinta y sexta son opcionales pero ayudan.

| # | Pantalla | Ruta | Qué tiene que verse |
|---|---|---|---|
| 1 | Hoy | `app/(tabs)/index.tsx` | El día a medio registrar, con varias actividades hechas y la racha visible. **No** vacío |
| 2 | Feed | `app/(tabs)/feed.tsx` | Actividad de amistades con reacciones. Es el gancho social |
| 3 | Amistades | `app/(tabs)/friends.tsx` | Lista con gente real y el botón de invitar |
| 4 | Perfil | `app/(tabs)/profile.tsx` | Rachas, logros y el resumen personal |
| 5 | Privacidad por actividad | donde se elige quién ve cada cosa | El diferenciador: «cada actividad decide quién la ve» |
| 6 | Retos | pantalla de retos | Retos con amistades |

## Antes de disparar

- **Datos poblados.** Una app vacía se ve mal y, en la cuenta de revisión, es
  causa directa de rechazo por *«no pudimos evaluar la funcionalidad»*.
- **Nombres y avatares creíbles**, no `test1` / `asdf`. No uses fotos ni nombres
  de personas reales sin permiso: son material público de tienda.
- **Barra de estado limpia.** En el simulador:
  ```bash
  xcrun simctl status_bar booted override --time 9:41 --batteryState charged --batteryLevel 100 --cellularBars 4 --wifiBars 3
  ```
- **Un juego por idioma.** Hay ficha en `es` y en `en` (`app.json` → `locales`),
  y cada una necesita sus capturas con el texto en ese idioma.
- **Modo claro**, salvo que quieras enseñar el oscuro a propósito en una.

## Cómo tomarlas

```bash
# iOS, simulador ya abierto en el modelo correcto
xcrun simctl io booted screenshot store/screenshots/ios-6.9/01-hoy.png

# Android
adb exec-out screencap -p > store/screenshots/android/01-hoy.png
```

Comprobar las medidas antes de subir:

```bash
node -e "const s=require('sharp');const fs=require('fs');
for (const d of ['store/screenshots/ios-6.9','store/screenshots/android']) {
  if (!fs.existsSync(d)) continue
  for (const f of fs.readdirSync(d).filter(f=>/\.(png|jpe?g)$/i.test(f)))
    s(d+'/'+f).metadata().then(m=>console.log(d+'/'+f, m.width+'x'+m.height, 'alpha:'+m.hasAlpha))
}"
```

Para iOS las capturas **no pueden llevar canal alfa**. Si alguna lo trae:

```bash
node -e "const s=require('sharp');s(process.argv[1]).flatten({background:'#FFFFFF'}).removeAlpha().toFile(process.argv[1].replace(/\.png$/,'-plano.png'))" ruta/a/captura.png
```

## Estructura sugerida

```
store/screenshots/
  ios-6.9/       01-hoy.png  02-feed.png  03-amistades.png  04-perfil.png
  android/       01-hoy.png  02-feed.png  03-amistades.png  04-perfil.png
```

Las capturas no se versionan en git (ver `.gitignore` del directorio): pesan y
se rehacen en cada cambio visual grande.
