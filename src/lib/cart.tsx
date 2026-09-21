import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { config } from '../config'
import { lookupVariant, type Product, type Variant } from './catalogue'
import { BAG_KEY as KEY, CHECKOUT_KEY, PW_DONE_KEY, markPending, passwordDoneFor, postStorePassword } from './checkout'
import { storefront } from './storefront'

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
function loadItems(): BagItem[] {
  try { const raw = localStorage.getItem(KEY); return raw ? (JSON.parse(raw) as BagItem[]) : [] } catch { return [] }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<BagItem[]>(loadItems)
  const [open, setOpenState] = useState(false)
  const returnFocus = useRef<HTMLElement | null>(null)
  /** Remember what had focus when the bag opened, so closing it can hand focus straight back. */
  const setOpen = useCallback((o: boolean) => {
    if (o) returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
    setOpenState(o)
  }, [])
  useEffect(() => {
    if (open || !returnFocus.current) return
    returnFocus.current.focus(); returnFocus.current = null
  }, [open])
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
  }, [setOpen])
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
      const requested = lines.reduce((n, l) => n + l.qty, 0)
      const data = await storefront<{ cartCreate: { cart: { id: string; checkoutUrl: string; totalQuantity: number } | null; userErrors: { message: string }[] } }>(
        `mutation cartCreate($input: CartInput!) { cartCreate(input: $input) { cart { id checkoutUrl totalQuantity } userErrors { field message } } }`,
        { input: { lines: lines.map((l) => ({ merchandiseId: l.variant.id, quantity: l.qty })), buyerIdentity: { countryCode: 'GB' } } },
      )
      const err = data.cartCreate.userErrors[0]?.message
      const cart = data.cartCreate.cart
      if (err || !cart) throw new Error(err ?? 'Shopify did not return a checkout link.')
      // Shopify drops lines it cannot sell (unpublished products) without reporting an error. Say so rather than checking out short.
      if (cart.totalQuantity < requested) throw new Error(`Shopify could only accept ${cart.totalQuantity} of the ${requested} items in your bag. Remove the rest and try again.`)
      const url = cart.checkoutUrl
      // Shopify only needs the store password once per browser per host. After that, go straight to checkout.
      const origin = new URL(url).origin
      if (config.storePassword && passwordDoneFor() !== origin) {
        try { localStorage.setItem(CHECKOUT_KEY, JSON.stringify({ url, cartId: cart.id, at: Date.now() })); localStorage.setItem(PW_DONE_KEY, origin) } catch { window.location.assign(url); return }
        postStorePassword(origin)
      } else {
        markPending(cart.id)
        window.location.assign(url)
      }
    } catch (e) {
      setCheckoutError(e instanceof Error ? e.message : 'Checkout failed.')
      setCheckingOut(false)
    }
  }, [canCheckout, lines])

  const value = useMemo<CartCtx>(() => ({ lines, count, subtotal, open, add, setQty, remove, clear, setOpen, checkout, checkingOut, checkoutError, canCheckout }),
    [lines, count, subtotal, open, add, setQty, remove, clear, setOpen, checkout, checkingOut, checkoutError, canCheckout])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useCart() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useCart must be used inside CartProvider')
  return c
}
