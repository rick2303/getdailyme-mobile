import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

// Los widgets de Android no pueden usar lucide-react-native: se dibujan fuera
// de la app, con las primitivas de react-native-android-widget. Lo que si
// aceptan es un SVG en texto (SvgWidget). Este script saca los trazos de los
// iconos de lucide que ya trae node_modules y los escribe como cadenas, para
// que el widget pinte exactamente los mismos glifos que la app.
//
//   node scripts/make-widget-icons.mjs   -> widgets/widget-icons.ts

const ICONS = {
  happy: 'smile',
  loving: 'heart',
  excited: 'sparkles',
  calm: 'leaf',
  tired: 'moon',
  busy: 'briefcase',
  stressed: 'zap',
  sad: 'cloud-rain',
  ping: 'heart-handshake',
  check: 'check',
}

const root = path.join(import.meta.dirname, '..')
const iconsDir = path.join(root, 'node_modules', 'lucide-react-native', 'dist', 'esm', 'icons')

function nodesOf(name) {
  const source = readFileSync(path.join(iconsDir, `${name}.js`), 'utf8')
  const match = source.match(/createLucideIcon\("[^"]+", (\[[\s\S]*?\])\);/)
  if (!match) throw new Error(`no encuentro los trazos de ${name}`)
  // Los nodos son literales JS con claves sin comillas: se evaluan tal cual.
  return Function(`return ${match[1]}`)()
}

function toSvg(nodes) {
  const children = nodes
    .map(([tag, attrs]) => {
      const rest = Object.entries(attrs)
        .filter(([key]) => key !== 'key')
        .map(([key, value]) => `${key}="${value}"`)
        .join(' ')
      return `<${tag} ${rest}/>`
    })
    .join('')
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" ' +
    'stroke="COLOR" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    children +
    '</svg>'
  )
}

const lines = Object.entries(ICONS).map(
  ([key, name]) => `  ${JSON.stringify(key)}: ${JSON.stringify(toSvg(nodesOf(name)))},`,
)

const output = `// Generado por scripts/make-widget-icons.mjs a partir de lucide. No editar a mano.
//
// "COLOR" se sustituye al pintar: el SVG del widget no hereda color de nadie.
const ICON_SVGS = {
${lines.join('\n')}
} as const

export type WidgetIcon = keyof typeof ICON_SVGS

export function widgetIconSvg(icon: WidgetIcon, color: string): string {
  return ICON_SVGS[icon].replace(/COLOR/g, color)
}
`

writeFileSync(path.join(root, 'widgets', 'widget-icons.ts'), output)
console.log(`widgets/widget-icons.ts: ${Object.keys(ICONS).length} iconos`)
