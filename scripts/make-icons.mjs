// Genera los iconos de tienda desde una definicion vectorial.
//
// El icono era un PNG de 512x512 con alfa. App Store pide 1024x1024 y rechaza
// el alfa (ITMS-90717), asi que el glifo se redibujo como vector midiendo el
// original pixel a pixel: el render de control coincide en un 99.6% con el
// PNG antiguo, la diferencia es solo el antialiasing de los bordes.
//
//   node scripts/make-icons.mjs assets
import sharp from 'sharp'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const BG = '#007EB6'
const S = 512              // lienzo en el que se midio el original
const C = 256              // centro
const R = 170              // radio del eje del anillo
const SW = 44              // grosor de trazo, el mismo en anillo y check
const A0 = 350, A1 = 300   // grados del arco; 0 = Este, sentido horario en pantalla

const pol = (a) => [C + R * Math.cos(a * Math.PI / 180), C + R * Math.sin(a * Math.PI / 180)]
const [x0, y0] = pol(A0)
const [x1, y1] = pol(A1)
const sweep = ((A1 - A0) % 360 + 360) % 360
const arc = `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${R} ${R} 0 ${sweep > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`
const check = 'M 176 259.5 L 229.5 321.5 L 339 195.5'

/** El glifo desnudo, en el sistema de coordenadas de 512. */
export const glyph = (stroke = '#FFFFFF') => `
  <path d="${arc}" fill="none" stroke="${stroke}" stroke-width="${SW}" stroke-linecap="round"/>
  <path d="${check}" fill="none" stroke="${stroke}" stroke-width="${SW}" stroke-linecap="round" stroke-linejoin="round"/>`

/** Coloca el glifo centrado en (cx,cy) con el diametro visual pedido. */
export const placeGlyph = (cx, cy, diameter, stroke = '#FFFFFF') => {
  const k = diameter / 384   // 384 = diametro visual del glifo en el lienzo de 512
  return `<g transform="translate(${cx} ${cy}) scale(${k.toFixed(4)}) translate(${-C} ${-C})">${glyph(stroke)}</g>`
}

/** Icono de tienda: a sangre, fondo opaco de marca. */
export const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="1024" height="1024">
  <rect width="${S}" height="${S}" fill="${BG}"/>${glyph()}
</svg>
`

// Android reserva los 18dp exteriores de los 108 del lienzo: la mascara solo
// garantiza el 66% central. Con el icono a sangre (glifo al 75%) el anillo
// quedaba cortado en el launcher. Al 54% respira dentro de la mascara circular.
const ADAPTIVE_RATIO = 0.54

/** Foreground adaptativo de Android: transparente, el fondo lo pone backgroundColor. */
export const adaptiveSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${S} ${S}" width="1024" height="1024">
  ${placeGlyph(C, C, S * ADAPTIVE_RATIO)}
</svg>
`

if (process.argv[1] && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1])) {
  const out = process.argv[2]
  if (!out) {
    console.error('uso: node scripts/make-icons.mjs <directorio>')
    process.exit(1)
  }
  // icono principal: SIN canal alfa, aplanado sobre el fondo de marca
  await sharp(Buffer.from(iconSvg)).flatten({ background: BG }).removeAlpha()
    .png({ compressionLevel: 9 }).toFile(`${out}/icon.png`)
  // foreground adaptativo: CON alfa, es lo que espera Android
  await sharp(Buffer.from(adaptiveSvg))
    .png({ compressionLevel: 9 }).toFile(`${out}/adaptive-icon.png`)
  fs.writeFileSync(`${out}/icon.svg`, iconSvg)
  fs.writeFileSync(`${out}/adaptive-icon.svg`, adaptiveSvg)
  console.log('iconos generados en', out)
}
