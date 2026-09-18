import { useEffect, useMemo } from 'react'
import { productByHandle, type Product } from './catalogue'

const KEY = 'ninetees.recent.v1'
function read(): string[] { try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[] } catch { return [] } }

/** Products this browser looked at before the current one, most recent first. Records the current one after render. */
export function useRecentlyViewed(current: string, n = 4): Product[] {
  const previous = useMemo(() => read().filter((h) => h !== current), [current])
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify([current, ...read().filter((h) => h !== current)].slice(0, 12))) } catch { /* storage unavailable */ }
  }, [current])
  return previous.map(productByHandle).filter((p): p is Product => Boolean(p)).slice(0, n)
}
