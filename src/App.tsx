import { lazy, Suspense, useEffect } from 'react'
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import BagDrawer from './components/BagDrawer'
import Home from './pages/Home'
// Every route except the home page loads on demand.
const Collection = lazy(() => import('./pages/Collection'))
const Product = lazy(() => import('./pages/Product'))
const Bag = lazy(() => import('./pages/Bag'))
const About = lazy(() => import('./pages/About'))
const Help = lazy(() => import('./pages/Help'))
const Search = lazy(() => import('./pages/Search'))
const Thanks = lazy(() => import('./pages/Thanks'))
const NotFound = lazy(() => import('./pages/NotFound'))
import { useCart } from './lib/cart'
import type { Resume } from './lib/checkout'

/** Scroll to the top on every route change, or to the anchor when the link carries one (/help#delivery).
 *  Routes load lazily, so the anchor may not exist yet: keep looking for it for a moment before giving up. */
function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (!hash) { window.scrollTo({ top: 0 }); return }
    const id = hash.slice(1)
    const deadline = Date.now() + 2000
    let frame = 0
    const tryScroll = () => {
      const el = document.getElementById(id)
      if (el) { el.scrollIntoView(); return }
      if (Date.now() < deadline) frame = requestAnimationFrame(tryScroll)
    }
    tryScroll()
    return () => cancelAnimationFrame(frame)
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
          <Suspense fallback={<div className="wrap" style={{ minHeight: '60vh' }} />}>
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
          </Suspense>
        </main>
        <Footer />
      </div>
      <BagDrawer />
    </>
  )
}
