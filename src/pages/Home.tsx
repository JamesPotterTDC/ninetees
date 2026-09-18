import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import Ticker from '../components/Ticker'
import ProductGrid from '../components/ProductGrid'
import ProductCard from '../components/ProductCard'
import { collectionByHandle, collectionCover, img, newIn, products, productsInCollection } from '../lib/catalogue'
import { config } from '../config'

const TILES = ['women', 'men', 'the-britpop-edit', 'footwear', 'rave', 'accessories']

function Hero() {
  const picks = ['terrace-harrington-jacket', 'wannabe-platform-sandals', 'supernova-shell-jacket']
    .map((h) => products.find((p) => p.handle === h && p.images.length)).filter(Boolean) as typeof products
  return (
    <section className="hero">
      <div className="wrap hero__grid">
        <div>
          <p className="eyebrow">{config.brand.city} · Est. {config.brand.est} · Only ever the nineties</p>
          <h1 className="display" style={{ marginTop: 18 }}>
            Britpop,<br /><span className="hl">reissued</span><span className="ol">.</span>
          </h1>
          <p>Parkas, platforms, baby tees and baggy denim, cut the way they should have been the first time. Nineties UK fashion for people who were there, and people who wish they had been.</p>
          <div className="hero__cta">
            <Link className="btn" to="/collections/women">Shop women</Link>
            <Link className="btn btn--ghost" to="/collections/men">Shop men</Link>
          </div>
          <div className="hero__meta">
            <div><strong>{products.length}</strong>pieces, one decade</div>
            <div><strong>UK 2–12</strong>footwear sizing</div>
            <div><strong>XS–2XL</strong>everything else</div>
          </div>
        </div>
        <div className="collage" aria-hidden="true">
          <div className="collage__block" />
          <div className="collage__check" />
          {picks.map((p) => (
            <div className="collage__card" key={p.handle}><img src={img(p.images[0].url, 640)} alt="" /></div>
          ))}
          <div className="collage__tag">New season</div>
        </div>
      </div>
    </section>
  )
}

function Tiles() {
  return (
    <section className="section section--tight">
      <div className="wrap">
        <div className="section__head">
          <div><p className="eyebrow">Shop by mood</p><h2 className="display">Pick your decade. It's the same one.</h2></div>
        </div>
        <div className="tiles">
          {TILES.map((h) => {
            const c = collectionByHandle(h); const cover = collectionCover(h)
            if (!c) return null
            return (
              <Link to={`/collections/${h}`} className="tile" key={h}>
                {cover?.images[0] && <img src={img(cover.images[0].url, 600)} alt="" loading="lazy" />}
                <div className="tile__label"><small>{c.count} pieces</small>{c.title}</div>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function Britpop() {
  const picks = productsInCollection('the-britpop-edit').filter((p) => p.images.length).slice(0, 3)
  return (
    <section className="section section--ink">
      <div className="wrap band">
        <div>
          <p className="eyebrow" style={{ color: 'var(--grey-2)' }}>The edit</p>
          <h2 className="display">Cool <span className="acid">Britannia</span>, minus the hangover</h2>
          <p>Harringtons, roll necks, tartan and a parka you could live in. Everything in the Britpop Edit is cut sharp and built to last longer than the reunion tour.</p>
          <Link to="/collections/the-britpop-edit" className="btn btn--acid">Shop the edit</Link>
        </div>
        <div className="band__grid">{picks.map((p) => <ProductCard key={p.handle} product={p} />)}</div>
      </div>
    </section>
  )
}

function Story() {
  return (
    <section className="section section--bone">
      <div className="wrap">
        <div className="section__head">
          <div><p className="eyebrow">Why NineTees</p><h2 className="display">One decade. Done properly.</h2></div>
          <Link to="/about" className="link">Read our story</Link>
        </div>
        <div className="story">
          <article><div className="num">01</div><h3>Only the nineties</h3><p>We never sold anything from any other decade and we are not about to start. If it wasn't on Top of the Pops, it isn't on the rail.</p></article>
          <article><div className="num">02</div><h3>Cut for now</h3><p>The shapes are faithful. The fabrics, fits and sizing are not stuck in 1996. Heavyweight cottons, proper denim, real size ranges.</p></article>
          <article><div className="num">03</div><h3>Made in the North</h3><p>Designed in {config.brand.city}, packed in Yorkshire, and shipped in a box you will want to keep.</p></article>
        </div>
      </div>
    </section>
  )
}

function Newsletter() {
  const [done, setDone] = useState(false)
  const submit = (e: FormEvent) => { e.preventDefault(); setDone(true) }
  return (
    <section className="section">
      <div className="wrap news">
        <div><p className="eyebrow">Mailing list</p><h2 className="display">Drops, early. Spam, never.</h2></div>
        <div>
          {done ? <p style={{ fontSize: 18, fontWeight: 600 }}>Sorted. You're on the list.</p> : (
            <form onSubmit={submit}>
              <input type="email" required placeholder="your@email.co.uk" aria-label="Email address" />
              <button className="btn" type="submit">Sign up</button>
            </form>
          )}
          <p className="note">One email a fortnight, at most. Unsubscribe whenever.</p>
        </div>
      </div>
    </section>
  )
}

export default function Home() {
  const fresh = newIn.slice(0, 8)
  return (
    <>
      <Hero />
      <Ticker />
      <Tiles />
      <section className="section section--tight">
        <div className="wrap">
          <div className="section__head">
            <div><p className="eyebrow">Just landed</p><h2 className="display">New in</h2></div>
            <Link to="/collections/new-in" className="link">View all {newIn.length}</Link>
          </div>
          <ProductGrid products={fresh} eagerCount={4} />
        </div>
      </section>
      <Britpop />
      <Story />
      <Newsletter />
    </>
  )
}
