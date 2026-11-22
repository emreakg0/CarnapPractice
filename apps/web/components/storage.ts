"use client"

import { useCallback, useMemo, useSyncExternalStore } from "react"

const prefix = "carnap-practice:v1:"
const eventName = "carnap-practice-storage"
const sessionFallback = new Map<string, string>()

function read(key: string) {
  if (sessionFallback.has(key)) return sessionFallback.get(key) ?? null
  try { return localStorage.getItem(prefix + key) } catch { return null }
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback)
  window.addEventListener(eventName, callback)
  return () => {
    window.removeEventListener("storage", callback)
    window.removeEventListener(eventName, callback)
  }
}

function decode<T>(raw: string | null, fallback: T): T {
  try { return raw === null ? fallback : JSON.parse(raw) as T } catch { return fallback }
}

export function useStored<T>(key: string, fallback: T) {
  const snapshot = useSyncExternalStore(subscribe, () => read(key), () => null)
  const value = useMemo(() => decode(snapshot, fallback), [snapshot, fallback])
  const set = useCallback((next: T | ((previous: T) => T)) => {
    const value = typeof next === "function" ? (next as (previous: T) => T)(decode(read(key), fallback)) : next
    const serialized = JSON.stringify(value)
    try {
      localStorage.setItem(prefix + key, serialized)
      sessionFallback.delete(key)
    } catch { sessionFallback.set(key, serialized) }
    window.dispatchEvent(new Event(eventName))
  }, [key, fallback])
  return [value, set] as const
}
