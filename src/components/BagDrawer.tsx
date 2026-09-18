import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useCart } from '../lib/cart'
import { img } from '../lib/catalogue'
import { money } from '../lib/format'
import Placeholder from './Placeholder'

export default function BagDrawer() {
  const { open, setOpen, lines, subtotal, setQty, remove, checkout, checkingOut, checkoutError, canCheckout } = useCart()
  const closeRef = useRef<HTMLButtonElement>(null)

  // Escape closes the bag, and focus lands on the close button when it opens. The cart hands focus back on close.
  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, setOpen])

  return (
    <div className={`drawer${open ? ' open' : ''}`} aria-hidden={!open} inert={!open}>
      <div className="drawer__bg" onClick={() => setOpen(false)} />
      <aside className="drawer__panel" id="bag-drawer" role="dialog" aria-modal="true" aria-label="Your bag">
        <div className="drawer__head">
          <h2>Your bag</h2>
          <button ref={closeRef} type="button" onClick={() => setOpen(false)} aria-label="Close bag" style={{ fontSize: 22 }}>×</button>
        </div>
        <div className="drawer__body">
          {lines.length === 0 && <p className="empty">Nothing in here yet. Go on.</p>}
          {lines.map((l) => (
            <div className="line" key={l.variantId}>
              <Link to={`/products/${l.product.handle}`} className="line__img" onClick={() => setOpen(false)}>
                {l.product.images[0] ? <img src={img(l.product.images[0].url, 240)} alt="" /> : <Placeholder product={l.product} compact />}
              </Link>
              <div>
                <div className="line__title">{l.product.title}</div>
                <div className="line__meta">{Object.entries(l.variant.options).map(([k, v]) => `${k} ${v}`).join(' · ')}</div>
                <div className="qty">
                  <button type="button" onClick={() => setQty(l.variantId, l.qty - 1)} aria-label="Decrease">−</button>
                  <span>{l.qty}</span>
                  <button type="button" onClick={() => setQty(l.variantId, l.qty + 1)} aria-label="Increase">+</button>
                </div>
              </div>
              <div>
                <div className="line__price">{money(l.variant.price * l.qty)}</div>
                <button type="button" className="line__remove" onClick={() => remove(l.variantId)}>Remove</button>
              </div>
            </div>
          ))}
        </div>
        {lines.length > 0 && (
          <div className="drawer__foot">
            <div className="totals"><span>Subtotal</span><span>{money(subtotal)}</span></div>
            <p className="small">Delivery and any discounts are worked out at checkout. Free UK delivery over £75.</p>
            {!canCheckout && <div className="alert">Checkout is temporarily unavailable. Please try again in a few minutes.</div>}
            {checkoutError && <div className="alert">{checkoutError}</div>}
            <p className="small">Secure checkout. Free UK delivery over £75 and free returns within 28 days.</p>
            <button type="button" className="btn btn--full" disabled={!canCheckout || checkingOut} onClick={checkout}>
              {checkingOut ? 'Taking you to checkout…' : 'Checkout'}
            </button>
            <Link to="/bag" className="btn btn--ghost btn--full" onClick={() => setOpen(false)}>View bag</Link>
          </div>
        )}
      </aside>
    </div>
  )
}
