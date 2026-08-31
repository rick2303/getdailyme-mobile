// Comprueba que los textos de store/listing/*.md caben en los limites de cada
// tienda. Pasarse de largo no se ve hasta que pegas el texto en la consola y te
// lo trunca, asi que mejor que falle aqui.
//
//   node scripts/check-listing.mjs
import fs from 'node:fs'
import path from 'node:path'

const DIR = 'store/listing'

// El limite es el mas estricto de las dos tiendas cuando el campo existe en ambas.
const LIMITS = [
  { match: /^Nombre de la app|^App name/i, max: 30 },
  { match: /^Subt[ií]tulo|^Subtitle/i, max: 30 },
  { match: /^Descripci[oó]n breve|^Short description/i, max: 80 },
  { match: /^Texto promocional|^Promotional text/i, max: 170 },
  { match: /^Descripci[oó]n completa|^Full description/i, max: 4000 },
  { match: /^Palabras clave|^Keywords/i, max: 100 },
]

/** Devuelve [{ heading, body }] con el primer bloque de codigo de cada seccion "## ". */
function sections(md) {
  const out = []
  const parts = md.split(/^## /m).slice(1)
  for (const part of parts) {
    const heading = part.slice(0, part.indexOf('\n')).trim()
    const fence = part.match(/```[a-z]*\n([\s\S]*?)```/)
    if (fence) out.push({ heading, body: fence[1].replace(/\n$/, '') })
  }
  return out
}

let failed = 0
for (const file of fs.readdirSync(DIR).filter((f) => f.endsWith('.md'))) {
  console.log(`\n${path.join(DIR, file)}`)
  const md = fs.readFileSync(path.join(DIR, file), 'utf8')
  for (const { heading, body } of sections(md)) {
    const rule = LIMITS.find((l) => l.match.test(heading))
    if (!rule) continue
    // Las tiendas cuentan puntos de codigo, no unidades UTF-16: los acentos
    // y la puntuacion tipografica cuentan como uno.
    const len = [...body].length
    const ok = len <= rule.max
    if (!ok) failed++
    console.log(`  ${ok ? 'ok  ' : 'LARGO'} ${heading.padEnd(28)} ${len}/${rule.max}`)
  }
}

if (failed > 0) {
  console.error(`\n${failed} campo(s) se pasan del limite.`)
  process.exit(1)
}
console.log('\nTodos los campos caben.')
