import { useEffect } from 'react'
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import BagDrawer from './components/BagDrawer'
import Home from './pages/Home'
import Collection from './pages/Collection'
import Product from './pages/Product'
import Bag from './pages/Bag'
import About from './pages/About'
import Help from './pages/Help'
import Search from './pages/Search'
import Thanks from './pages/Thanks'
import NotFound from './pages/NotFound'
import { useCart } from './lib/cart'
import type { Resume } from './lib/checkout'

/** Scroll to the top on every route change, or to the anchor when the link carries one (/help#delivery). */
function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      const el = document.getElementById(hash.slice(1))
      if (el) { el.scrollIntoView(); return }
    }
    window.scrollTo({ top: 0 })
  }, [pathname, hash])
  return null
}

export default function App({ resume }: { resume: Resume }) {
  const { open } = useCart()
  const navigate = useNavigate()
  const returned = resume?.state === 'returned' ? resume : null
  useEffect(() => { if (returned) navigate('/thanks', { replace: true, state: { cartId: returned.cartId } }) }, [returned, navigate])
  if (resume?.state === 'redirecting') {
    return (
      <div className="site" style={{ display: 'grid', placeItems: 'center', minHeight: '100dvh' }}>
        <p className="eyebrow">Taking you to checkout…</p>
      </div>
    )
  }
  return (
    <>
      {/* While the bag is open the rest of the page is inert, so keyboard focus stays inside the drawer. */}
      <div className="site" inert={open}>
        <ScrollToTop />
        <a className="skip" href="#main">Skip to content</a>
        <Header />
        <main id="main" tabIndex={-1}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/collections/:handle" element={<Collection />} />
            <Route path="/products/:handle" element={<Product />} />
            <Route path="/bag" element={<Bag />} />
            <Route path="/about" element={<About />} />
            <Route path="/help" element={<Help />} />
            <Route path="/search" element={<Search />} />
            <Route path="/thanks" element={<Thanks />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        <Footer />
      </div>
      <BagDrawer />
    </>
  )
}
