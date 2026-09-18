import { Link, NavLink } from 'react-router-dom'
import { useCart } from '../lib/cart'
import { config } from '../config'

const NAV = [
  ['new-in', 'New In'], ['women', 'Women'], ['men', 'Men'], ['the-britpop-edit', 'Britpop Edit'],
  ['footwear', 'Footwear'], ['accessories', 'Accessories'],
]

export default function Header() {
  const { count, open, setOpen } = useCart()
  return (
    <header className="hdr">
      <div className="wrap hdr__row">
        <Link to="/" className="logo" aria-label={`${config.brand.name} home`}>
          {config.brand.name.toUpperCase()} <small>EST. {config.brand.est}</small>
        </Link>
        <nav className="nav" aria-label="Shop">
          {NAV.map(([h, label]) => <NavLink key={h} to={`/collections/${h}`}>{label}</NavLink>)}
        </nav>
        <div className="hdr__actions">
          <Link to="/search">Search</Link>
          <button type="button" onClick={() => setOpen(true)} aria-label={`Open bag, ${count} items`} aria-haspopup="dialog" aria-expanded={open} aria-controls="bag-drawer">
            Bag <span className="pill">{count}</span>
          </button>
        </div>
      </div>
    </header>
  )
}
