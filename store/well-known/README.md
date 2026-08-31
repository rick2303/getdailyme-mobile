# Deep links: cómo publicar estos dos archivos

Estos archivos **no los sirve este repo**. Los tiene que servir el proyecto web
(Next.js en Vercel) que responde en `app.getdailyme.com`. Aquí viven como fuente
de verdad porque quien los cambia es la app móvil, no la web.

## El problema de hoy (verificado el 2026-08-28)

```
GET https://app.getdailyme.com/.well-known/assetlinks.json
  → 307  Location: /sign-in?next=%2F.well-known%2Fassetlinks.json

GET https://app.getdailyme.com/.well-known/apple-app-site-association
  → 307  Location: /sign-in?next=%2F.well-known%2Fapple-app-site-association
```

El middleware de autenticación redirige **todo el dominio**, incluido
`/.well-known/`. Esto significa dos cosas:

1. Los universal links de iOS y los App Links de Android **no verifican hoy**.
   `app.json` declara `associatedDomains` y un `intentFilter` con
   `autoVerify: true`, así que los enlaces de invitación abren el navegador en
   vez de la app.
2. **Copiar los archivos a `public/` no es suficiente.** Mientras el middleware
   siga redirigiendo esa ruta, seguirán devolviendo 307. Apple no sigue
   redirects al buscar el AASA, y la verificación de Android exige un `200`
   directo.

## Qué hay que hacer en el proyecto web

### 1. Excluir `.well-known` del middleware

En `middleware.ts`, el `matcher` tiene que dejar pasar la ruta. Por ejemplo:

```ts
export const config = {
  matcher: [
    // Todo excepto estáticos y .well-known
    '/((?!_next/static|_next/image|favicon.ico|\\.well-known).*)',
  ],
}
```

Si el matcher es una lista de rutas protegidas en vez de una exclusión, basta
con no incluir `/.well-known`. Si la redirección se hace dentro del cuerpo del
middleware, añade una salida temprana:

```ts
if (request.nextUrl.pathname.startsWith('/.well-known/')) return NextResponse.next()
```

### 2. Colocar los archivos

```
public/.well-known/assetlinks.json
public/.well-known/apple-app-site-association
```

El AASA va **sin extensión**. Vercel lo servirá como `application/json`, que es
lo correcto; si acabara saliendo como `text/plain`, fuérzalo con un header en
`next.config.js`:

```js
async headers() {
  return [{
    source: '/.well-known/apple-app-site-association',
    headers: [{ key: 'Content-Type', value: 'application/json' }],
  }]
}
```

### 3. Comprobar que `/invite/:token` no redirige a `/sign-in`

Hoy `GET /invite/test123` también devuelve 307 a `/sign-in`. Eso no rompe la
verificación del deep link, pero sí la experiencia de quien no tiene la app
instalada: debería ver la invitación (o al menos una página que explique de qué
va y ofrezca descargar la app) antes de pedirle cuenta.

## Después de desplegar, verificar

```bash
# Ambos deben responder 200, sin redirects, con JSON
curl -sSI https://app.getdailyme.com/.well-known/assetlinks.json | head -1
curl -sSI https://app.getdailyme.com/.well-known/apple-app-site-association | head -1

# Verificador oficial de Google
curl -sS "https://digitalassetlinks.googleapis.com/v1/statements:list?\
source.web.site=https://app.getdailyme.com&\
relation=delegate_permission/common.handle_all_urls"
```

En Android, tras instalar el build de producción:

```bash
adb shell pm get-app-links com.getdailyme.app
# app.getdailyme.com debe aparecer como "verified"
```

En iOS, el CDN de Apple cachea el AASA. Para forzar una recarga durante las
pruebas, desinstala y reinstala la app, o usa un dispositivo con
Ajustes → Desarrollador → Associated Domains Development.

## Las huellas SHA-256 que faltan en `assetlinks.json`

El archivo tiene dos placeholders. Hacen falta las dos:

| Huella | De dónde sale |
|---|---|
| **Play App Signing** | Play Console → *Test and release* → *Setup* → *App integrity* → *App signing* → «SHA-256 certificate fingerprint». Es la clave con la que Google firma lo que se descargan los usuarios. **Esta es la imprescindible.** |
| **Clave de subida (EAS)** | `eas credentials` → Android → *production* → *Keystore*. Sirve para que los App Links también verifiquen en los APK internos de EAS y en internal testing. |

Sin la primera, los enlaces no se verificarán en producción aunque el archivo
esté publicado. La huella se escribe en mayúsculas con dos puntos, tal cual la
da Play:

```
AB:CD:EF:01:...:99
```

> Ojo: la huella de Play App Signing **solo existe después de la primera subida**
> del bundle. Si aún no has subido nada, sube primero a un track cerrado, coge la
> huella, y publica entonces el `assetlinks.json`. Es un orden obligado, no un
> despiste.
