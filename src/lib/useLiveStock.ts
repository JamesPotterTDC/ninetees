import { useEffect, useState } from 'react'
import { storefront } from './storefront'

export type LiveStock = Record<string, { available: boolean; quantity: number | null }>

const QUERY = `query($handle: String!) { product(handle: $handle) { variants(first: 100) { nodes { id availableForSale quantityAvailable } } } }`
type Data = { product: { variants: { nodes: { id: string; availableForSale: boolean; quantityAvailable: number | null }[] } } | null }

/** Live availability per variant from Shopify, which mirrors the warehouse. Null until it arrives or if the call
 *  fails, in which case callers keep showing the exported snapshot. */
export function useLiveStock(handle: string): LiveStock | null {
  const [stock, setStock] = useState<LiveStock | null>(null)
  useEffect(() => {
    const ctrl = new AbortController()
    storefront<Data>(QUERY, { handle }, ctrl.signal)
      .then((d) => {
        if (!d.product) return
        setStock(Object.fromEntries(d.product.variants.nodes.map((v) => [v.id, { available: v.availableForSale, quantity: v.quantityAvailable }])))
      })
      .catch(() => { /* snapshot stays */ })
    return () => ctrl.abort()
  }, [handle])
  return stock
}
