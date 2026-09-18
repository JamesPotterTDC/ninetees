import { Link } from 'react-router-dom'
import Placeholder from '../components/Placeholder'
import { useCart } from '../lib/cart'
import { img } from '../lib/catalogue'
import { money } from '../lib/format'

export default function Bag() {
  const { lines, subtotal, setQty, remove, checkout, checkingOut, checkoutError, canCheckout } = useCart()
  return (
    <div className="wrap bagpage">
      <div>
        <h1 className="display">Your bag</h1>
        {lines.length === 0 && <p className="empty">Empty. <Link to="/collections/new-in" className="link">Start with what's new</Link>.</p>}
        {lines.map((l) => (
          <div className="line" key={l.variantId} style={{ gridTemplateColumns: '120px 1fr auto' }}>
            <Link to={`/products/${l.product.handle}`} className="line__img">
              {l.product.images[0] ? <img src={img(l.product.images[0].url, 320)} alt="" /> : <Placeholder product={l.product} compact />}
            </Link>
            <div>
              <div className="line__title">{l.product.title}</div>
              <div className="line__meta">{Object.entries(l.variant.options).map(([k, v]) => `${k} ${v}`).join(' · ')} · Ref {l.variant.sku}</div>
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
      <aside className="summary">
        <h2>Summary</h2>
        <div className="totals"><span>Subtotal</span><span>{money(subtotal)}</span></div>
        <div className="totals" style={{ fontWeight: 400, color: 'var(--grey)' }}><span>Delivery</span><span>{subtotal >= 75 ? 'Free' : 'From £3.95'}</span></div>
        <p className="small">Taxes included. Delivery and discount codes are finalised at checkout.</p>
        {!canCheckout && <div className="alert">Checkout is not switched on for this preview yet.</div>}
        {checkoutError && <div className="alert">{checkoutError}</div>}
        <button type="button" className="btn btn--full" disabled={!canCheckout || checkingOut || lines.length === 0} onClick={checkout}>
          {checkingOut ? 'Taking you to checkout…' : 'Checkout'}
        </button>
        <Link to="/collections/new-in" className="link small" style={{ textAlign: 'center' }}>Keep shopping</Link>
      </aside>
    </div>
  )
}
