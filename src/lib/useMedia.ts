import { useSyncExternalStore } from 'react'

/**
 * Совпадает ли медиазапрос сейчас — и перерисовка, когда перестаёт.
 *
 * Нужен там, где CSS мало: на узком экране меняется не вид, а поведение —
 * счётчик листов становится дверью к оглавлению.
 */
export function useMedia(query: string): boolean {
  return useSyncExternalStore(
    (change) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', change)
      return () => list.removeEventListener('change', change)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}
