import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

// Este repo lleva copias de la logica pura del repo web, que es el dueño de la
// verdad (y de las migraciones). Este script hace visible la deriva:
//
//   npm run drift          -> lista que cambio en la web desde la ultima sincro
//   npm run drift:update   -> da por sincronizado el estado actual
//
// "IDENTICAL" ademas exige que la copia local siga siendo identica a la web
// (normalizando finales de linea y el "use client" que la web necesita).
// "ADAPTED" son ports con cambios deliberados: ahi solo avisa de que el lado
// web se movio y toca revisar a mano.

const WEB_DIR = process.env.GDM_WEB_DIR ?? 'C:/Users/ricky/Portfolio/getdailyme'
const LOCK_FILE = path.join(import.meta.dirname, 'drift.lock.json')

const IDENTICAL = [
  ['src/lib/activities/colors.ts', 'lib/activities/colors.ts'],
  ['src/lib/activities/units.ts', 'lib/activities/units.ts'],
  ['src/lib/activities/input-modes.ts', 'lib/activities/input-modes.ts'],
  ['src/lib/activities/labels.ts', 'lib/activities/labels.ts'],
  ['src/lib/activities/streaks.ts', 'lib/activities/streaks.ts'],
  ['src/lib/activities/weekly.ts', 'lib/activities/weekly.ts'],
  ['src/lib/activities/heatmap.ts', 'lib/activities/heatmap.ts'],
  ['src/lib/activities/starter.ts', 'lib/activities/starter.ts'],
  ['src/lib/api/activities.ts', 'lib/api/activities.ts'],
  ['src/lib/api/challenges.ts', 'lib/api/challenges.ts'],
  ['src/lib/api/export.ts', 'lib/api/export.ts'],
  ['src/lib/api/feed.ts', 'lib/api/feed.ts'],
  ['src/lib/api/friends.ts', 'lib/api/friends.ts'],
  ['src/lib/api/invites.ts', 'lib/api/invites.ts'],
  ['src/lib/api/logs.ts', 'lib/api/logs.ts'],
  ['src/lib/api/notifications.ts', 'lib/api/notifications.ts'],
  ['src/lib/api/reports.ts', 'lib/api/reports.ts'],
  ['src/lib/api/sessions.ts', 'lib/api/sessions.ts'],
  ['src/lib/api/username-cooldown.ts', 'lib/api/username-cooldown.ts'],
  ['src/lib/feed/threads.ts', 'lib/feed/threads.ts'],
  ['src/lib/feed/grouping.ts', 'lib/feed/grouping.ts'],
  ['src/lib/query/keys.ts', 'lib/query/keys.ts'],
  ['src/lib/query/offline-mutations.ts', 'lib/query/offline-mutations.ts'],
  ['src/lib/utils/dates.ts', 'lib/utils/dates.ts'],
  ['src/lib/utils/ids.ts', 'lib/utils/ids.ts'],
  ['src/lib/utils/cn.ts', 'lib/utils/cn.ts'],
  ['src/lib/supabase/database.types.ts', 'lib/supabase/database.types.ts'],
  ['src/lib/supabase/types.ts', 'lib/supabase/types.ts'],
  ['src/lib/icons/catalog.ts', 'lib/icons/catalog.ts'],
  ['src/lib/icons/tokens.ts', 'lib/icons/tokens.ts'],
  ['src/lib/events/calendar.ts', 'lib/events/calendar.ts'],
  ['src/i18n/translate.ts', 'i18n/translate.ts'],
  ['src/i18n/config.ts', 'i18n/config.ts'],
  ['src/i18n/dictionaries/es.ts', 'i18n/dictionaries/es.ts'],
  ['src/i18n/dictionaries/en.ts', 'i18n/dictionaries/en.ts'],
  ['src/i18n/dictionaries/index.ts', 'i18n/dictionaries/index.ts'],
  ['src/lib/storage/folders.ts', 'lib/storage/folders.ts'],
]

const ADAPTED = [
  ['src/lib/api/events.ts', 'lib/api/events.ts'],
  ['src/lib/api/profile.ts', 'lib/api/profile.ts'],
  ['src/lib/api/types.ts', 'lib/api/types.ts'],
  ['src/lib/api/storage.ts', 'lib/api/storage.ts'],
  ['src/lib/icons/index.ts', 'lib/icons/index.ts'],
  ['src/lib/hooks/use-activities.ts', 'lib/hooks/use-activities.ts'],
  ['src/lib/hooks/use-logs.ts', 'lib/hooks/use-logs.ts'],
  ['src/lib/hooks/use-comments.ts', 'lib/hooks/use-comments.ts'],
  ['src/lib/hooks/use-challenges.ts', 'lib/hooks/use-challenges.ts'],
  ['src/lib/hooks/use-friends.ts', 'lib/hooks/use-friends.ts'],
  ['src/lib/hooks/use-invite.ts', 'lib/hooks/use-invite.ts'],
  ['src/lib/hooks/use-sessions.ts', 'lib/hooks/use-sessions.ts'],
  ['src/lib/hooks/use-photo-url.ts', 'lib/hooks/use-photo-url.ts'],
  ['src/lib/hooks/use-relative-time.ts', 'lib/hooks/use-relative-time.ts'],
  ['src/lib/hooks/use-now.ts', 'lib/hooks/use-now.ts'],
  ['src/lib/hooks/use-events.ts', 'lib/hooks/use-events.ts'],
  ['src/lib/hooks/use-notifications-inbox.ts', 'lib/hooks/use-notifications-inbox.ts'],
  ['src/lib/hooks/use-feed.ts', 'lib/hooks/use-feed.ts'],
  ['src/lib/auth/provider.tsx', 'lib/auth/provider.tsx'],
  ['src/lib/query/provider.tsx', 'lib/query/provider.tsx'],
  ['src/lib/query/persister.ts', 'lib/query/persister.ts'],
]

function normalize(content) {
  return content
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/^"use client";?\n+/, '')
}

function hashOf(filePath) {
  if (!existsSync(filePath)) return null
  return createHash('sha256').update(normalize(readFileSync(filePath, 'utf8'))).digest('hex')
}

const mode = process.argv[2] === 'update' ? 'update' : 'check'

if (!existsSync(WEB_DIR)) {
  console.error('No encuentro el repo web en ' + WEB_DIR + ' (usa GDM_WEB_DIR para señalarlo).')
  process.exit(2)
}

const webHashes = {}
for (const [webPath] of [...IDENTICAL, ...ADAPTED]) {
  webHashes[webPath] = hashOf(path.join(WEB_DIR, webPath))
}

if (mode === 'update') {
  writeFileSync(LOCK_FILE, JSON.stringify(webHashes, null, 2) + '\n')
  console.log('Sincronizado: ' + Object.keys(webHashes).length + ' archivos anotados en drift.lock.json')
  process.exit(0)
}

const lock = existsSync(LOCK_FILE) ? JSON.parse(readFileSync(LOCK_FILE, 'utf8')) : {}
let problems = 0

for (const [webPath, mobilePath] of IDENTICAL) {
  const webHash = webHashes[webPath]
  const mobileHash = hashOf(path.join(import.meta.dirname, '..', mobilePath))

  if (webHash === null) {
    console.log('  [borrado en web]  ' + webPath)
    problems += 1
  } else if (webHash !== mobileHash) {
    const stale = lock[webPath] && lock[webPath] !== webHash
    console.log('  [' + (stale ? 'web cambió' : 'copias distintas') + ']  ' + webPath + '  ->  ' + mobilePath)
    problems += 1
  }
}

for (const [webPath, mobilePath] of ADAPTED) {
  const webHash = webHashes[webPath]
  if (lock[webPath] && lock[webPath] !== webHash) {
    console.log('  [revisar port]  ' + webPath + '  ->  ' + mobilePath + ' (adaptado; la web se movió)')
    problems += 1
  }
}

if (problems === 0) {
  console.log('Sin deriva: las copias compartidas siguen alineadas con el repo web.')
} else {
  console.log('')
  console.log(problems + ' archivo(s) por revisar. Tras sincronizar: npm run drift:update')
  process.exit(1)
}
