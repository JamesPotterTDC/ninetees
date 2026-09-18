import { storefront } from './storefront'

export const BAG_KEY = 'ninetees.bag.v1'
/** Checkout link parked while the browser round-trips through Shopify's store password page. */
export const CHECKOUT_KEY = 'ninetees.checkout.v1'
/** Set when we leave for Shopify's checkout, so we recognise the visitor when Shopify sends them back. */
export const PENDING_KEY = 'ninetees.checkout.pending'
export const PW_DONE_KEY = 'ninetees.pw.done'

export type Resume = { state: 'redirecting' } | { state: 'returned'; cartId: string | null } | null

export function markPending(cartId: string) {
  try { localStorage.setItem(PENDING_KEY, JSON.stringify({ cartId, at: Date.now() })) } catch { /* storage unavailable */ }
}

/** Called once on load, before React renders. The Shopify theme bounces visitors back here with ?resume=checkout:
 *  either mid-flight (we parked a checkout link while posting the store password) or after checkout, when the
 *  theme's home page redirect fires on Shopify's "continue shopping" link. */
export function resumeCheckout(): Resume {
  const params = new URLSearchParams(window.location.search)
  if (!params.has('resume')) return null
  params.delete('resume')
  const clean = window.location.pathname + (params.toString() ? `?${params}` : '') + window.location.hash
  window.history.replaceState(null, '', clean)
  try {
    const parked = localStorage.getItem(CHECKOUT_KEY)
    if (parked) {
      const { url, cartId, at } = JSON.parse(parked) as { url: string; cartId?: string; at: number }
      localStorage.removeItem(CHECKOUT_KEY)
      if (Date.now() - at < 15 * 60 * 1000) {
        if (cartId) markPending(cartId)
        window.location.replace(url)
        return { state: 'redirecting' }
      }
      return null
    }
    const pending = localStorage.getItem(PENDING_KEY)
    if (pending) {
      localStorage.removeItem(PENDING_KEY)
      let cartId: string | null = null
      try { cartId = (JSON.parse(pending) as { cartId?: string }).cartId ?? null } catch { /* legacy "1" flag */ }
      return { state: 'returned', cartId }
    }
  } catch { /* storage unavailable */ }
  return null
}

/** Shopify deletes a cart once its checkout completes, so a missing cart means the order went through. */
export async function cartStatus(cartId: string): Promise<'completed' | 'open' | 'unknown'> {
  try {
    const d = await storefront<{ cart: { id: string } | null }>('query($id: ID!) { cart(id: $id) { id } }', { id: cartId })
    return d.cart ? 'open' : 'completed'
  } catch { return 'unknown' }
}
