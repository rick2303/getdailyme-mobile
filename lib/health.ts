import AsyncStorage from '@react-native-async-storage/async-storage'
import { Linking, Platform } from 'react-native'

import { createLog } from '@/lib/api/logs'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { newId } from '@/lib/utils/ids'
import { todayKey } from '@/lib/utils/dates'

// Salud en las dos plataformas: HealthKit en iOS y Health Connect en Android.
// La app lee pasos, minutos de ejercicio y sueño de hoy y los registra sola en
// las actividades que el usuario vincule. El vinculo vive en el aparato.
export type HealthMetric = 'steps' | 'exercise' | 'sleep'

export const HEALTH_METRICS: HealthMetric[] = ['steps', 'exercise', 'sleep']

export type HealthToday = Record<HealthMetric, number>

export type HealthLinks = Partial<Record<HealthMetric, string>>

// Que metricas puede leer la app de verdad. En Android lo dice Health Connect;
// en iOS, HealthKit oculta a proposito si un permiso de lectura fue denegado
// (una consulta sin permiso devuelve cero, no un error), asi que se deduce
// mirando si hay algun dato en el ultimo mes.
export type HealthAccess = Record<HealthMetric, boolean>

const NO_ACCESS: HealthAccess = { steps: false, exercise: false, sleep: false }

const IOS_TYPES: Record<HealthMetric, string> = {
  steps: 'HKQuantityTypeIdentifierStepCount',
  exercise: 'HKQuantityTypeIdentifierAppleExerciseTime',
  sleep: 'HKCategoryTypeIdentifierSleepAnalysis',
}

const ANDROID_TYPES: Record<HealthMetric, 'Steps' | 'ExerciseSession' | 'SleepSession'> = {
  steps: 'Steps',
  exercise: 'ExerciseSession',
  sleep: 'SleepSession',
}

const PROBE_DAYS = 30

const CONNECTED_KEY = 'gdm_health_connected'
const LINKS_KEY = 'gdm_health_links'
const SYNCED_KEY = 'gdm_health_synced'
const LAST_SYNC_KEY = 'gdm_health_last_sync'

type SyncedEntry = { date: string; logId: string; amount: number; removed?: boolean }

type SyncedState = Partial<Record<HealthMetric, SyncedEntry>>

type DateFilter = { date?: { startDate?: Date; endDate?: Date } }

type HealthKitModule = {
  isHealthDataAvailable: () => boolean
  requestAuthorization: (toRequest: { toRead?: readonly string[] }) => Promise<boolean>
  queryStatisticsForQuantity: (
    identifier: string,
    statistics: readonly string[],
    options?: { filter?: DateFilter; unit?: string },
  ) => Promise<{ sumQuantity?: { quantity: number } }>
  queryCategorySamples: (
    identifier: string,
    options: { filter?: DateFilter; limit?: number },
  ) => Promise<{ value: number; startDate: Date; endDate: Date }[]>
}

type HealthConnectPermission = { accessType: string; recordType: string }

type HealthConnectModule = {
  initialize: () => Promise<boolean>
  openHealthConnectSettings: () => void
  requestPermission: (
    permissions: { accessType: 'read'; recordType: string }[],
  ) => Promise<HealthConnectPermission[]>
  getGrantedPermissions: () => Promise<HealthConnectPermission[]>
  aggregateRecord: (request: {
    recordType: 'Steps' | 'ExerciseSession' | 'SleepSession'
    timeRangeFilter: { operator: 'between'; startTime: string; endTime: string }
  }) => Promise<{
    COUNT_TOTAL?: number
    EXERCISE_DURATION_TOTAL?: { inSeconds: number }
    SLEEP_DURATION_TOTAL?: number
  }>
}

function healthKit(): HealthKitModule {
  return require('@kingstinct/react-native-healthkit') as HealthKitModule
}

function healthConnect(): HealthConnectModule {
  return require('react-native-health-connect') as HealthConnectModule
}

export async function isHealthConnected(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(CONNECTED_KEY)) === '1'
  } catch {
    return false
  }
}

export async function loadHealthLinks(): Promise<HealthLinks> {
  try {
    const raw = await AsyncStorage.getItem(LINKS_KEY)
    return raw ? (JSON.parse(raw) as HealthLinks) : {}
  } catch {
    return {}
  }
}

export async function saveHealthLinks(links: HealthLinks) {
  try {
    await AsyncStorage.setItem(LINKS_KEY, JSON.stringify(links))
  } catch {
    // sin persistencia el vinculo dura la sesion
  }
}

export async function getLastHealthSync(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(LAST_SYNC_KEY)
  } catch {
    return null
  }
}

// Pide permiso solo de las metricas indicadas. Devuelve que quedo concedido de
// verdad, o null si el aparato no sabe leer salud.
export async function requestHealthPermissions(
  metrics: HealthMetric[] = HEALTH_METRICS,
): Promise<HealthAccess | null> {
  if (metrics.length === 0) return readHealthAccess()

  try {
    if (Platform.OS === 'ios') {
      const kit = healthKit()
      if (!kit.isHealthDataAvailable()) return null
      await kit.requestAuthorization({ toRead: metrics.map((metric) => IOS_TYPES[metric]) })
      await AsyncStorage.setItem(CONNECTED_KEY, '1')
      return await readHealthAccess()
    }

    if (Platform.OS === 'android') {
      const hc = healthConnect()
      if (!(await hc.initialize())) return null
      await hc.requestPermission(
        metrics.map((metric) => ({ accessType: 'read' as const, recordType: ANDROID_TYPES[metric] })),
      )
      await AsyncStorage.setItem(CONNECTED_KEY, '1')
      return await readHealthAccess()
    }

    return null
  } catch {
    return null
  }
}

// Abre la pantalla del sistema donde se revisan los permisos: en iOS no se
// puede volver a preguntar una vez respondido, hay que ir a Salud.
export async function openHealthSettings() {
  try {
    if (Platform.OS === 'android') {
      healthConnect().openHealthConnectSettings()
      return
    }
    await Linking.openURL('x-apple-health://')
  } catch {
    try {
      await Linking.openSettings()
    } catch {
      // sin pantalla a la que ir no queda nada que hacer
    }
  }
}

export async function readHealthAccess(): Promise<HealthAccess> {
  try {
    if (Platform.OS === 'android') {
      const hc = healthConnect()
      if (!(await hc.initialize())) return NO_ACCESS
      const granted = await hc.getGrantedPermissions()
      const types = new Set(
        (granted ?? [])
          .filter((permission) => permission.accessType === 'read')
          .map((permission) => permission.recordType),
      )
      return {
        steps: types.has(ANDROID_TYPES.steps),
        exercise: types.has(ANDROID_TYPES.exercise),
        sleep: types.has(ANDROID_TYPES.sleep),
      }
    }

    if (Platform.OS === 'ios') return await probeIosAccess()

    return NO_ACCESS
  } catch {
    return NO_ACCESS
  }
}

async function probeIosAccess(): Promise<HealthAccess> {
  const kit = healthKit()
  if (!kit.isHealthDataAvailable()) return NO_ACCESS

  const endDate = new Date()
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - PROBE_DAYS)
  startDate.setHours(0, 0, 0, 0)
  const filter = { date: { startDate, endDate } }

  const [steps, exercise, sleep] = await Promise.all([
    kit
      .queryStatisticsForQuantity(IOS_TYPES.steps, ['cumulativeSum'], { filter, unit: 'count' })
      .then((result) => (result.sumQuantity?.quantity ?? 0) > 0)
      .catch(() => false),
    kit
      .queryStatisticsForQuantity(IOS_TYPES.exercise, ['cumulativeSum'], { filter, unit: 'min' })
      .then((result) => (result.sumQuantity?.quantity ?? 0) > 0)
      .catch(() => false),
    kit
      .queryCategorySamples(IOS_TYPES.sleep, { filter, limit: 1 })
      .then((samples) => samples.length > 0)
      .catch(() => false),
  ])

  return { steps, exercise, sleep }
}

function dayStart(): Date {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  return start
}

async function readIosToday(): Promise<HealthToday> {
  const kit = healthKit()

  const now = new Date()
  const filter = { date: { startDate: dayStart(), endDate: now } }

  const [steps, exercise] = await Promise.all([
    kit
      .queryStatisticsForQuantity(IOS_TYPES.steps, ['cumulativeSum'], {
        filter,
        unit: 'count',
      })
      .catch(() => ({ sumQuantity: undefined })),
    kit
      .queryStatisticsForQuantity(IOS_TYPES.exercise, ['cumulativeSum'], {
        filter,
        unit: 'min',
      })
      .catch(() => ({ sumQuantity: undefined })),
  ])

  // El sueño de anoche: de las 18:00 de ayer a ahora, sumando solo fases
  // dormidas (0 = en cama y 2 = despierto no cuentan).
  const sleepStart = new Date()
  sleepStart.setDate(sleepStart.getDate() - 1)
  sleepStart.setHours(18, 0, 0, 0)
  let sleepMs = 0
  try {
    const samples = await kit.queryCategorySamples(IOS_TYPES.sleep, {
      filter: { date: { startDate: sleepStart, endDate: now } },
      limit: 500,
    })
    for (const sample of samples) {
      if (sample.value === 0 || sample.value === 2) continue
      sleepMs += new Date(sample.endDate).getTime() - new Date(sample.startDate).getTime()
    }
  } catch {
    sleepMs = 0
  }

  return {
    steps: Math.round(steps.sumQuantity?.quantity ?? 0),
    exercise: Math.round(exercise.sumQuantity?.quantity ?? 0),
    sleep: Math.round((sleepMs / 3_600_000) * 10) / 10,
  }
}

async function readAndroidToday(): Promise<HealthToday> {
  const hc = healthConnect()

  await hc.initialize()
  const now = new Date().toISOString()
  const filter = { operator: 'between' as const, startTime: dayStart().toISOString(), endTime: now }

  const sleepStart = new Date()
  sleepStart.setDate(sleepStart.getDate() - 1)
  sleepStart.setHours(18, 0, 0, 0)

  const [steps, exercise, sleep] = await Promise.all([
    hc.aggregateRecord({ recordType: 'Steps', timeRangeFilter: filter }).catch(() => ({}) as never),
    hc
      .aggregateRecord({ recordType: 'ExerciseSession', timeRangeFilter: filter })
      .catch(() => ({}) as never),
    hc
      .aggregateRecord({
        recordType: 'SleepSession',
        timeRangeFilter: { operator: 'between', startTime: sleepStart.toISOString(), endTime: now },
      })
      .catch(() => ({}) as never),
  ])

  return {
    steps: Math.round(steps.COUNT_TOTAL ?? 0),
    exercise: Math.round((exercise.EXERCISE_DURATION_TOTAL?.inSeconds ?? 0) / 60),
    sleep: Math.round(((sleep.SLEEP_DURATION_TOTAL ?? 0) / 3600) * 10) / 10,
  }
}

export async function readHealthToday(): Promise<HealthToday | null> {
  try {
    if (Platform.OS === 'ios') return await readIosToday()
    if (Platform.OS === 'android') return await readAndroidToday()
    return null
  } catch {
    return null
  }
}

async function loadSynced(): Promise<SyncedState> {
  try {
    const raw = await AsyncStorage.getItem(SYNCED_KEY)
    return raw ? (JSON.parse(raw) as SyncedState) : {}
  } catch {
    return {}
  }
}

async function saveSynced(synced: SyncedState) {
  try {
    await AsyncStorage.setItem(SYNCED_KEY, JSON.stringify(synced))
  } catch {
    // sin persistencia se reintentara y el update es idempotente
  }
}

// Si el usuario borra a mano el registro que puso la salud, la sincronizacion
// no debe resucitarlo el resto del dia.
export async function forgetHealthLog(logId: string) {
  const synced = await loadSynced()
  let touched = false

  for (const metric of HEALTH_METRICS) {
    const entry = synced[metric]
    if (entry && entry.logId === logId && !entry.removed) {
      synced[metric] = { ...entry, removed: true }
      touched = true
    }
  }

  if (touched) await saveSynced(synced)
}

// Registra los valores de hoy en las actividades vinculadas: un solo registro
// por dia y por metrica que se actualiza si el valor crece.
export async function syncHealthToLogs(userId: string, timeZone: string): Promise<number> {
  const links = await loadHealthLinks()
  const metrics = HEALTH_METRICS.filter((metric) => links[metric])
  if (metrics.length === 0) return 0

  const today = await readHealthToday()
  if (!today) return 0

  const synced = await loadSynced()

  const client = getSupabaseBrowserClient()
  const localDate = todayKey(timeZone)
  let changes = 0

  for (const metric of metrics) {
    const amount = today[metric]
    if (!amount || amount <= 0) continue

    const previous = synced[metric]
    const sameDay = previous?.date === localDate

    if (sameDay && previous!.removed) continue
    if (sameDay && previous!.amount === amount) continue

    if (sameDay) {
      try {
        // Sin `single()`: si la fila ya no esta, el update no falla, devuelve
        // cero filas, y eso es justo lo que hay que distinguir.
        const { data, error } = await client
          .from('activity_logs')
          .update({ amount })
          .eq('id', previous!.logId)
          .select('id')
        if (error) throw error

        if (data && data.length > 0) {
          synced[metric] = { ...previous!, amount }
          changes += 1
        } else {
          synced[metric] = { ...previous!, removed: true }
        }
        continue
      } catch {
        // sin red: se reintenta en la proxima sincronizacion
        continue
      }
    }

    const id = newId()
    try {
      await createLog(client, {
        id,
        activity_id: links[metric]!,
        user_id: userId,
        amount,
        logged_at: new Date().toISOString(),
        local_date: localDate,
      })
      synced[metric] = { date: localDate, logId: id, amount }
      changes += 1
    } catch {
      // sin red u otra causa: se reintenta en la proxima sincronizacion
    }
  }

  await saveSynced(synced)
  try {
    await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString())
  } catch {
    // la marca de tiempo es solo informativa
  }

  return changes
}
