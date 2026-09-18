import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { cartStatus } from '../lib/checkout'
import { useCart } from '../lib/cart'
import { usePageMeta } from '../lib/usePageMeta'
import { config } from '../config'

const STEPS = [
  ['Order confirmed', 'A confirmation is on its way to your inbox with everything you ordered and a link to your order page.'],
  ['Picked and packed', `Your order has gone straight to our warehouse in ${config.brand.warehouse}. Before ${config.delivery.cutoffHour - 12}pm on a working day, it is picked and packed the same day.`],
  ['On its way', 'The moment it leaves the warehouse you get a second email with a tracking link, so you can watch it head your way.'],
]

/** Landing page after Shopify sends the visitor back. Confirms the checkout really completed before clearing the bag:
 *  an abandoned checkout still has its cart, so that visitor goes back to their bag instead. */
export default function Thanks() {
  const { state } = useLocation() as { state: { cartId: string | null } | null }
  const navigate = useNavigate()
  const { clear } = useCart()
  const [confirmed, setConfirmed] = useState(false)
  usePageMeta('Order confirmed')

  useEffect(() => {
    if (!state) { navigate('/', { replace: true }); return }
    let live = true
    const decide = async () => {
      const status = state.cartId ? await cartStatus(state.cartId) : 'completed'
      if (!live) return
      if (status === 'completed') { clear(); setConfirmed(true) }
      else navigate(status === 'open' ? '/bag' : '/', { replace: true })
    }
    void decide()
    return () => { live = false }
  }, [state, navigate, clear])

  if (!confirmed) {
    return (
      <div className="wrap thanks">
        <p className="eyebrow">One moment</p>
        <h1 className="display">Confirming your order…</h1>
      </div>
    )
  }
  return (
    <div className="wrap thanks">
      <p className="eyebrow">Order confirmed</p>
      <h1 className="display">Sorted.</h1>
      <p className="thanks__lede">Thanks for your order. Here is what happens next.</p>
      <div className="story">
        {STEPS.map(([title, body], i) => (
          <article key={title}><div className="num">0{i + 1}</div><h3>{title}</h3><p>{body}</p></article>
        ))}
      </div>
      <div className="hero__cta">
        <Link className="btn" to="/collections/new-in">Keep shopping</Link>
        <Link className="btn btn--ghost" to="/help#delivery">Delivery &amp; returns</Link>
      </div>
      <p className="small">Need to change something? Reply to your confirmation email within the hour and we will catch it before it is packed.</p>
    </div>
  )
}
