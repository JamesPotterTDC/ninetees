import { useEffect, useState } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import BagDrawer from './components/BagDrawer'
import Home from './pages/Home'
import Collection from './pages/Collection'
import Product from './pages/Product'
import Bag from './pages/Bag'
import About from './pages/About'
import Search from './pages/Search'
import NotFound from './pages/NotFound'
import { resumeCheckout } from './lib/cart'

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo({ top: 0 }) }, [pathname])
  return null
}

export default function App() {
  const [state] = useState(() => resumeCheckout())
  if (state === 'redirecting') {
    return (
      <div className="site" style={{ display: 'grid', placeItems: 'center', minHeight: '100dvh' }}>
        <p className="eyebrow">Taking you to checkout…</p>
      </div>
    )
  }
  return (
    <div className="site">
      <ScrollToTop />
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/collections/:handle" element={<Collection />} />
          <Route path="/products/:handle" element={<Product />} />
          <Route path="/bag" element={<Bag />} />
          <Route path="/about" element={<About />} />
          <Route path="/search" element={<Search />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Footer />
      <BagDrawer />
    </div>
  )
}
