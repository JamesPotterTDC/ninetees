import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useCart } from '../lib/cart'
import { config } from '../config'
import wordmark from '../assets/brand/wordmark-ink-header.svg'

const NAV = [
  ['new-in', 'New In'], ['women', 'Women'], ['men', 'Men'], ['the-britpop-edit', 'Britpop Edit'],
  ['footwear', 'Footwear'], ['accessories', 'Accessories'],
]

export default function Header() {
  const { count, open, setOpen } = useCart()
  const [menu, setMenu] = useState(false)
  const close = () => setMenu(false)

  // On phones the nav lives in a full-screen panel. Escape closes it and the page behind does not scroll.
  useEffect(() => {
    if (!menu) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(false) }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [menu])

  return (
    <header className="hdr">
      <div className="wrap hdr__row">
        <Link to="/" className="logo" aria-label={`${config.brand.name} home`} onClick={close}>
          <img src={wordmark} alt={config.brand.name} width="141" height="44" />
        </Link>
        <nav className="nav" aria-label="Shop">
          {NAV.map(([h, label]) => <NavLink key={h} to={`/collections/${h}`}>{label}</NavLink>)}
        </nav>
        <div className="hdr__actions">
          <Link to="/search" onClick={close}>Search</Link>
          <button type="button" onClick={() => { close(); setOpen(true) }} aria-label={`Open bag, ${count} items`} aria-haspopup="dialog" aria-expanded={open} aria-controls="bag-drawer">
            Bag <span className="pill">{count}</span>
          </button>
          <button type="button" className="hdr__menu" onClick={() => setMenu((m) => !m)} aria-expanded={menu} aria-controls="site-menu">
            {menu ? 'Close' : 'Menu'}
          </button>
        </div>
      </div>
      <div className={`menu${menu ? ' open' : ''}`} id="site-menu" inert={!menu}>
        <nav className="menu__nav" aria-label="Shop">
          {NAV.map(([h, label]) => <NavLink key={h} to={`/collections/${h}`} onClick={close}>{label}</NavLink>)}
        </nav>
        <div className="menu__more">
          <Link to="/help" onClick={close}>Help &amp; FAQ</Link>
          <Link to="/help#delivery" onClick={close}>Delivery &amp; returns</Link>
          <Link to="/about" onClick={close}>Our story</Link>
          <Link to="/help#contact" onClick={close}>Contact</Link>
          <a href={config.social.instagram.url} target="_blank" rel="noopener">Instagram</a>
          <a href={config.social.tiktok.url} target="_blank" rel="noopener">TikTok</a>
        </div>
        <p className="menu__foot">Free UK delivery over £{config.delivery.freeOver} · Free returns within {config.delivery.returnsDays} days</p>
      </div>
    </header>
  )
}
