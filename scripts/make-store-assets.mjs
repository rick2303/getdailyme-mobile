// Material grafico de tienda: feature graphic de Play (1024x500) y el icono
// de 512x512 que Play Console pide subir aparte del binario.
//
// Play recorta los bordes en algunas superficies, asi que todo lo que importa
// se queda dentro de la banda segura central. El tamano de letra no se fija a
// ojo: se mide el texto ya renderizado y se encoge hasta que cabe, porque el
// ancho real depende de la fuente que resuelva la maquina que lo genere.
//
//   node scripts/make-store-assets.mjs store
import sharp from 'sharp'
import fs from 'node:fs'

import { iconSvg, placeGlyph } from './make-icons.mjs'

const W = 1024, H = 500
const BG = '#007EB6'
const DARK = '#00648F'          // el mismo azul, mas hondo, para el degradado
const FONT = 'Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif'

const MARGIN = 72               // banda segura: Play puede recortar los bordes
const TEXT_X = 384              // arranque del bloque de texto, a la derecha del glifo
const TEXT_MAX = W - MARGIN - TEXT_X

// Los textos salen de i18n/dictionaries/*.ts: es el mismo claim que ve el
// usuario dentro de la app, no una frase de marketing inventada aparte.
const COPY = {
  es: { title: ['Registra tu día', 'en un toque'], sub: 'Compártelo solo con quien tú elijas' },
  en: { title: ['Log your day', 'in one tap'], sub: 'Share it only with the people you pick' },
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const textEl = (s, x, y, size, weight, opacity = 1) =>
  `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" ` +
  `fill="#FFFFFF" opacity="${opacity}" xml:space="preserve">${esc(s)}</text>`

/** Ancho real en px de una linea a un tamano dado, midiendo la tinta renderizada. */
async function inkWidth(s, size, weight) {
  const probe = `<svg xmlns="http://www.w3.org/2000/svg" width="4000" height="${Math.ceil(size * 2)}">
    ${textEl(s, 10, size, size, weight)}</svg>`
  const { data, info } = await sharp(Buffer.from(probe)).ensureAlpha().raw()
    .toBuffer({ resolveWithObject: true })
  let min = Infinity, max = -1
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      if (data[(y * info.width + x) * info.channels + 3] > 40) {
        if (x < min) min = x
        if (x > max) max = x
      }
    }
  }
  return max < 0 ? 0 : max - min + 1
}

/** Mayor tamano <= ideal con el que todas las lineas caben en maxWidth. */
async function fitSize(lines, ideal, weight, maxWidth) {
  const widths = await Promise.all(lines.map((l) => inkWidth(l, 100, weight)))
  const widest = Math.max(...widths)
  if (widest === 0) return ideal
  return Math.min(ideal, Math.floor((maxWidth / widest) * 100))
}

const svg = ({ titleSize, subSize, title, sub }) => {
  const lead = Math.round(titleSize * 1.14)
  const top = Math.round(H / 2 - (title.length - 1) * lead / 2 - 26)
  const titleEls = title.map((l, i) => textEl(l, TEXT_X, top + i * lead, titleSize, 700)).join('\n  ')
  const subY = top + (title.length - 1) * lead + Math.round(subSize * 2.05)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${BG}"/>
      <stop offset="100%" stop-color="${DARK}"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  ${placeGlyph(212, H / 2, 232)}
  ${titleEls}
  ${textEl(sub, TEXT_X, subY, subSize, 400, 0.92)}
</svg>
`
}

const out = process.argv[2]
if (!out) {
  console.error('uso: node scripts/make-store-assets.mjs <directorio>')
  process.exit(1)
}

for (const [lang, copy] of Object.entries(COPY)) {
  const titleSize = await fitSize(copy.title, 60, 700, TEXT_MAX)
  const subSize = await fitSize([copy.sub], 30, 400, TEXT_MAX)
  const markup = svg({ ...copy, titleSize, subSize })
  const file = `${out}/feature-graphic-${lang}.png`
  // sin alfa: Play no acepta transparencia en el feature graphic
  await sharp(Buffer.from(markup)).flatten({ background: BG }).removeAlpha()
    .png({ compressionLevel: 9 }).toFile(file)
  fs.writeFileSync(`${out}/feature-graphic-${lang}.svg`, markup)
  console.log(`generado ${file}  (titulo ${titleSize}px, subtitulo ${subSize}px)`)
}

// Play Console pide el icono suelto en 512x512. Sin alfa, igual que el de iOS.
await sharp(Buffer.from(iconSvg)).resize(512, 512).flatten({ background: BG }).removeAlpha()
  .png({ compressionLevel: 9 }).toFile(out + '/play-icon-512.png')
console.log('generado ' + out + '/play-icon-512.png')
