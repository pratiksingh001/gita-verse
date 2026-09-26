import { useSyncExternalStore } from 'react'

type Updater<T> = T | ((prev: T) => T)

export interface PersistentStore<T> {
  get: () => T
  set: (next: Updater<T>) => void
  subscribe: (listener: () => void) => () => void
}

/**
 * A tiny global store backed by localStorage. Every component using it re-renders on
 * change, and other open tabs stay in sync. Storage failures (private mode, quota) are
 * ignored: the app keeps working, it just won't remember.
 */
export function createPersistentStore<T>(key: string, fallback: T, normalize: (saved: unknown) => T = (s) => s as T) {
  const read = (): T => {
    try {
      const raw = localStorage.getItem(key)
      return raw === null ? fallback : normalize(JSON.parse(raw))
    } catch {
      return fallback
    }
  }

  let value = read()
  const listeners = new Set<() => void>()
  const notify = () => listeners.forEach((listener) => listener())

  window.addEventListener('storage', (event) => {
    if (event.key === key) {
      value = read()
      notify()
    }
  })

  const store: PersistentStore<T> = {
    get: () => value,
    set: (next) => {
      value = next instanceof Function ? next(value) : next
      try {
        localStorage.setItem(key, JSON.stringify(value))
      } catch {
        // Not persisted, but the in-memory value still updates.
      }
      notify()
    },
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
  return store
}

export function useStore<T>(store: PersistentStore<T>): T {
  return useSyncExternalStore(store.subscribe, store.get)
}
