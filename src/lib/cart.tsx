import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { config } from '../config'
import { lookupVariant, type Product, type Variant } from './catalogue'

export type BagItem = { variantId: string; qty: number }
export type BagLine = BagItem & { product: Product; variant: Variant }

type CartCtx = {
  lines: BagLine[]; count: number; subtotal: number; open: boolean
  add: (variantId: string, qty?: number) => void
  setQty: (variantId: string, qty: number) => void
  remove: (variantId: string) => void
  clear: () => void
  setOpen: (o: boolean) => void
  checkout: () => Promise<void>
  checkingOut: boolean; checkoutError: string | null; canCheckout: boolean
}

const Ctx = createContext<CartCtx | null>(null)
const KEY = 'ninetees.bag.v1'
const CHECKOUT_KEY = 'ninetees.checkout.v1'
const PENDING_KEY = 'ninetees.checkout.pending'

/** Top-level POST of the store password to Shopify. Shopify sets its session cookie and lands on the
 *  theme home page, which redirects back here with ?resume=checkout; resumeCheckout() then finishes the job. */
function postStorePassword() {
  const form = document.createElement('form')
  form.method = 'POST'; form.action = `https://${config.shopDomain}/password`; form.style.display = 'none'
  for (const [name, value] of Object.entries({ form_type: 'storefront_password', utf8: '✓', password: config.storePassword })) {
    const input = document.createElement('input'); input.type = 'hidden'; input.name = name; input.value = value; form.appendChild(input)
  }
  document.body.appendChild(form); form.submit()
}

/** Called on load. Returns true when we are about to leave for checkout, or when a checkout just finished. */
export function resumeCheckout(): 'redirecting' | 'returned' | null {
  const params = new URLSearchParams(window.location.search)
  if (!params.has('resume')) return null
  params.delete('resume')
  const clean = window.location.pathname + (params.toString() ? `?${params}` : '') + window.location.hash
  window.history.replaceState(null, '', clean)
  try {
    const raw = localStorage.getItem(CHECKOUT_KEY)
    if (raw) {
      const { url, at } = JSON.parse(raw) as { url: string; at: number }
      localStorage.removeItem(CHECKOUT_KEY)
      if (Date.now() - at < 15 * 60 * 1000) { localStorage.setItem(PENDING_KEY, '1'); window.location.replace(url); return 'redirecting' }
    } else if (localStorage.getItem(PENDING_KEY)) {
      localStorage.removeItem(PENDING_KEY); localStorage.removeItem(KEY); return 'returned'
    }
  } catch { /* storage unavailable */ }
  return null
}

function loadItems(): BagItem[] {
  try { const raw = localStorage.getItem(KEY); return raw ? (JSON.parse(raw) as BagItem[]) : [] } catch { return [] }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<BagItem[]>(loadItems)
  const [open, setOpen] = useState(false)
  const [checkingOut, setCheckingOut] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(items)) } catch { /* storage unavailable */ } }, [items])
  useEffect(() => { document.body.style.overflow = open ? 'hidden' : ''; return () => { document.body.style.overflow = '' } }, [open])

  const lines = useMemo<BagLine[]>(() => items.flatMap((i) => {
    const hit = lookupVariant(i.variantId)
    return hit ? [{ ...i, product: hit.product, variant: hit.variant }] : []
  }), [items])
  const count = lines.reduce((n, l) => n + l.qty, 0)
  const subtotal = lines.reduce((n, l) => n + l.qty * l.variant.price, 0)

  const add = useCallback((variantId: string, qty = 1) => {
    setItems((prev) => prev.some((i) => i.variantId === variantId)
      ? prev.map((i) => (i.variantId === variantId ? { ...i, qty: i.qty + qty } : i))
      : [...prev, { variantId, qty }])
    setOpen(true)
  }, [])
  const setQty = useCallback((variantId: string, qty: number) => {
    setItems((prev) => qty <= 0 ? prev.filter((i) => i.variantId !== variantId) : prev.map((i) => (i.variantId === variantId ? { ...i, qty } : i)))
  }, [])
  const remove = useCallback((variantId: string) => setItems((prev) => prev.filter((i) => i.variantId !== variantId)), [])
  const clear = useCallback(() => setItems([]), [])

  const canCheckout = Boolean(config.storefrontToken)

  const checkout = useCallback(async () => {
    if (!canCheckout || lines.length === 0) return
    setCheckingOut(true); setCheckoutError(null)
    try {
      const res = await fetch(`https://${config.shopDomain}/api/${config.storefrontApiVersion}/graphql.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Shopify-Storefront-Access-Token': config.storefrontToken },
        body: JSON.stringify({
          query: `mutation cartCreate($input: CartInput!) { cartCreate(input: $input) { cart { id checkoutUrl } userErrors { field message } } }`,
          variables: { input: {
            lines: lines.map((l) => ({ merchandiseId: l.variant.id, quantity: l.qty })),
            buyerIdentity: { countryCode: 'GB' },
          } },
        }),
      })
      const json = await res.json() as { data?: { cartCreate: { cart: { checkoutUrl: string } | null; userErrors: { message: string }[] } }; errors?: { message: string }[] }
      const err = json.errors?.[0]?.message ?? json.data?.cartCreate.userErrors[0]?.message
      const url = json.data?.cartCreate.cart?.checkoutUrl
      if (err || !url) throw new Error(err ?? 'Shopify did not return a checkout link.')
      if (config.storePassword) {
        try { localStorage.setItem(CHECKOUT_KEY, JSON.stringify({ url, at: Date.now() })) } catch { window.location.assign(url); return }
        postStorePassword()
      } else {
        window.location.assign(url)
      }
    } catch (e) {
      setCheckoutError(e instanceof Error ? e.message : 'Checkout failed.')
      setCheckingOut(false)
    }
  }, [canCheckout, lines])

  const value = useMemo<CartCtx>(() => ({ lines, count, subtotal, open, add, setQty, remove, clear, setOpen, checkout, checkingOut, checkoutError, canCheckout }),
    [lines, count, subtotal, open, add, setQty, remove, clear, checkout, checkingOut, checkoutError, canCheckout])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useCart() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useCart must be used inside CartProvider')
  return c
}
