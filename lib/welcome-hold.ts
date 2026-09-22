import { useSyncExternalStore } from 'react'

let held = false
const listeners = new Set<() => void>()

export function holdWelcome(value: boolean) {
  if (held === value) return
  held = value
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useWelcomeHeld(): boolean {
  return useSyncExternalStore(subscribe, () => held)
}
