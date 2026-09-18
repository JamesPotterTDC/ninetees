import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { cartStatus } from '../lib/checkout'
import { useCart } from '../lib/cart'
import { usePageMeta } from '../lib/usePageMeta'

const STEPS = [
  ['Shopify takes the order', 'The checkout you just used is Shopify\'s own. It hands the order straight over, the way it would for any independent label.'],
  ['Helm picks it up', 'Within a minute or two the order lands in Helm, the warehouse system behind the shop, and stock is adjusted on every size you bought.'],
  ['Picked, packed, despatched', 'It is picked, packed and marked as despatched on screen. Then, because none of it is real, nothing turns up.'],
]

/** Landing page after Shopify sends the visitor back. Confirms the order really completed before clearing the bag:
 *  an abandoned checkout still has its cart, so that visitor goes back to their bag instead. */
export default function Thanks() {
  const { state } = useLocation() as { state: { cartId: string | null } | null }
  const navigate = useNavigate()
  const { clear } = useCart()
  const [confirmed, setConfirmed] = useState(false)
  usePageMeta('Order placed')

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
        <h1 className="display">Checking your order…</h1>
      </div>
    )
  }
  return (
    <div className="wrap thanks">
      <p className="eyebrow">Order placed</p>
      <h1 className="display">Sorted.</h1>
      <p className="thanks__lede">Your test order is on its way to the warehouse in Yorkshire. Nothing has been charged and nothing will be shipped, but everything else that happens next is real.</p>
      <div className="story">
        {STEPS.map(([title, body], i) => (
          <article key={title}><div className="num">0{i + 1}</div><h3>{title}</h3><p>{body}</p></article>
        ))}
      </div>
      <div className="hero__cta">
        <Link className="btn" to="/collections/new-in">Keep shopping</Link>
        <Link className="btn btn--ghost" to="/help#orders">How this works</Link>
      </div>
      <p className="small">Go back to a size you just bought and the stock line on its page will already show the new number.</p>
    </div>
  )
}
