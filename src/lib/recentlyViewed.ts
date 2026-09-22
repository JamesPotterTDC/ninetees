import { useEffect, useState } from 'react'
import { productByHandle, type Product } from './catalogue'

const KEY = 'ninetees.recent.v1'
function read(): string[] { try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') as string[] } catch { return [] } }

/** Products this browser looked at before the current one, most recent first. Records the current one after render. */
export function useRecentlyViewed(current: string, n = 4): Product[] {
  // Read after hydration: the prerendered HTML has no idea what this browser looked at.
  const [previous, setPrevious] = useState<string[]>([])
  useEffect(() => {
    const seen = read().filter((h) => h !== current)
    // oxlint-disable-next-line react/set-state-in-effect
    setPrevious(seen)
    try { localStorage.setItem(KEY, JSON.stringify([current, ...seen].slice(0, 12))) } catch { /* storage unavailable */ }
  }, [current])
  return previous.map(productByHandle).filter((p): p is Product => Boolean(p)).slice(0, n)
}
