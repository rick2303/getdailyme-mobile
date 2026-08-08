import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'

import { createLog, updateLog } from '@/lib/api/logs'
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

const CONNECTED_KEY = 'gdm_health_connected'
const LINKS_KEY = 'gdm_health_links'
const SYNCED_KEY = 'gdm_health_synced'

type SyncedState = Partial<Record<HealthMetric, { date: string; logId: string; amount: number }>>

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

export async function requestHealthPermissions(): Promise<boolean> {
  try {
    if (Platform.OS === 'ios') {
      const healthkit = require('@kingstinct/react-native-healthkit') as {
        isHealthDataAvailable: () => boolean
        requestAuthorization: (toRequest: {
          toRead?: readonly string[]
        }) => Promise<boolean>
      }
      if (!healthkit.isHealthDataAvailable()) return false
      const granted = await healthkit.requestAuthorization({
        toRead: [
          'HKQuantityTypeIdentifierStepCount',
          'HKQuantityTypeIdentifierAppleExerciseTime',
          'HKCategoryTypeIdentifierSleepAnalysis',
        ],
      })
      if (granted) await AsyncStorage.setItem(CONNECTED_KEY, '1')
      return granted
    }

    if (Platform.OS === 'android') {
      const hc = require('react-native-health-connect') as {
        initialize: () => Promise<boolean>
        requestPermission: (
          permissions: { accessType: 'read'; recordType: string }[],
        ) => Promise<unknown[]>
      }
      const ready = await hc.initialize()
      if (!ready) return false
      const granted = await hc.requestPermission([
        { accessType: 'read', recordType: 'Steps' },
        { accessType: 'read', recordType: 'ExerciseSession' },
        { accessType: 'read', recordType: 'SleepSession' },
      ])
      const ok = Array.isArray(granted) && granted.length > 0
      if (ok) await AsyncStorage.setItem(CONNECTED_KEY, '1')
      return ok
    }

    return false
  } catch {
    return false
  }
}

function dayStart(): Date {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  return start
}

async function readIosToday(): Promise<HealthToday> {
  const healthkit = require('@kingstinct/react-native-healthkit') as {
    queryStatisticsForQuantity: (
      identifier: string,
      statistics: readonly string[],
      options?: { filter?: { date?: { startDate?: Date; endDate?: Date } }; unit?: string },
    ) => Promise<{ sumQuantity?: { quantity: number } }>
    queryCategorySamples: (
      identifier: string,
      options: { filter?: { date?: { startDate?: Date; endDate?: Date } }; limit?: number },
    ) => Promise<{ value: number; startDate: Date; endDate: Date }[]>
  }

  const now = new Date()
  const filter = { date: { startDate: dayStart(), endDate: now } }

  const [steps, exercise] = await Promise.all([
    healthkit
      .queryStatisticsForQuantity('HKQuantityTypeIdentifierStepCount', ['cumulativeSum'], {
        filter,
        unit: 'count',
      })
      .catch(() => ({ sumQuantity: undefined })),
    healthkit
      .queryStatisticsForQuantity('HKQuantityTypeIdentifierAppleExerciseTime', ['cumulativeSum'], {
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
    const samples = await healthkit.queryCategorySamples('HKCategoryTypeIdentifierSleepAnalysis', {
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
  const hc = require('react-native-health-connect') as {
    initialize: () => Promise<boolean>
    aggregateRecord: (request: {
      recordType: 'Steps' | 'ExerciseSession' | 'SleepSession'
      timeRangeFilter: { operator: 'between'; startTime: string; endTime: string }
    }) => Promise<{
      COUNT_TOTAL?: number
      EXERCISE_DURATION_TOTAL?: { inSeconds: number }
      SLEEP_DURATION_TOTAL?: number
    }>
  }

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

// Registra los valores de hoy en las actividades vinculadas: un solo registro
// por dia y por metrica que se actualiza si el valor crece.
export async function syncHealthToLogs(userId: string, timeZone: string): Promise<number> {
  const links = await loadHealthLinks()
  const metrics = HEALTH_METRICS.filter((metric) => links[metric])
  if (metrics.length === 0) return 0

  const today = await readHealthToday()
  if (!today) return 0

  let synced: SyncedState = {}
  try {
    const raw = await AsyncStorage.getItem(SYNCED_KEY)
    if (raw) synced = JSON.parse(raw) as SyncedState
  } catch {
    synced = {}
  }

  const client = getSupabaseBrowserClient()
  const localDate = todayKey(timeZone)
  let changes = 0

  for (const metric of metrics) {
    const amount = today[metric]
    if (!amount || amount <= 0) continue

    const previous = synced[metric]
    if (previous && previous.date === localDate && previous.amount === amount) continue

    if (previous && previous.date === localDate) {
      try {
        await updateLog(client, previous.logId, { amount })
        synced[metric] = { ...previous, amount }
        changes += 1
        continue
      } catch {
        // el registro ya no existe: se crea de nuevo abajo
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

  try {
    await AsyncStorage.setItem(SYNCED_KEY, JSON.stringify(synced))
  } catch {
    // sin persistencia se reintentara y el update es idempotente
  }

  return changes
}
