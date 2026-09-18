import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import Ticker from '../components/Ticker'
import ProductGrid from '../components/ProductGrid'
import ProductCard from '../components/ProductCard'
import Stars from '../components/Stars'
import { collectionByHandle, collectionCover, img, newIn, productByHandle, products, productsInCollection } from '../lib/catalogue'
import { featuredReviews, siteStats } from '../lib/reviews'
import { config } from '../config'
import { usePageMeta } from '../lib/usePageMeta'

const TILES = ['women', 'men', 'the-britpop-edit', 'footwear', 'rave', 'accessories']
const WEARING: [string, string, string][] = [
  ['wannabe-platform-sandals', '@sophie.rae', 'Manchester'], ['camden-denim-jacket', '@dan_hartley', 'Leeds'], ['supernova-shell-jacket', '@priya.kaur', 'Glasgow'],
  ['tartan-kilt-mini', '@bex.tomlinson', 'Sheffield'], ['big-beat-platform-trainers', '@callum.m', 'Liverpool'], ['firestarter-shell-tracksuit', '@aisha.b', 'Bristol'],
]
const STAPLES = ['fishtail-mod-parka', 'bittersweet-satin-slip-dress', 'tipped-knit-polo', 'wannabe-platform-sandals', 'breton-stripe-long-sleeve', 'bootcut-flares', 'suede-terrace-trainers', 'puffa-jacket']

function Hero() {
  // Shopify's CDN will transcode the PNG master to a progressive JPEG, which is a tenth of the size.
  const src = `${config.brand.heroUrl}&format=pjpg`
  return (
    <section className="hero hero--photo">
      <img className="hero__img" src={img(src, 1800)} srcSet={`${img(src, 900)} 900w, ${img(src, 1400)} 1400w, ${img(src, 1800)} 1800w`} sizes="100vw"
        alt="Four friends in NineTees clothing at a Manchester skate park" fetchPriority="high" />
      <div className="hero__shade" aria-hidden="true" />
      <div className="wrap hero__content">
        <div className="hero__inner">
        <p className="eyebrow eyebrow--light">{config.brand.city} · Est. {config.brand.est} · Only ever the nineties</p>
        <h1 className="display">Britpop,<br /><span className="hl">reissued</span>.</h1>
        <p>Parkas, platforms, baby tees and baggy denim, cut the way they should have been the first time. Nineties UK fashion for people who were there, and people who wish they had been.</p>
        <div className="hero__cta">
          <Link className="btn btn--bone" to="/collections/women">Shop women</Link>
          <Link className="btn btn--ghost-light" to="/collections/men">Shop men</Link>
        </div>
        <div className="hero__meta">
          <div><strong>{products.length}</strong>pieces, one decade</div>
          <div><strong>UK 2–12</strong>footwear sizing</div>
          <div><strong>XS–2XL</strong>unisex sizing</div>
        </div>
        </div>
      </div>
    </section>
  )
}

function Trust() {
  const stats = siteStats()
  const d = config.delivery
  return (
    <div className="wrap trust">
      <div>Free UK delivery over £{d.freeOver}</div>
      <div>Free returns within {d.returnsDays} days</div>
      <div>Same-day despatch before {d.cutoffHour - 12}pm</div>
      <div><Stars rating={stats.average} size={12} /> {stats.average.toFixed(1)} from {stats.count.toLocaleString('en-GB')} reviews</div>
    </div>
  )
}

function Voices() {
  const picks = featuredReviews(3)
  return (
    <section className="section section--tight">
      <div className="wrap">
        <div className="section__head">
          <div><p className="eyebrow">Reviews</p><h2 className="display">Don't take our word for it</h2></div>
        </div>
        <div className="voices">
          {picks.map(({ review, product }) => (
            <article className="voice" key={review.id}>
              <Stars rating={review.rating} size={14} />
              <blockquote>“{review.body}”</blockquote>
              <p className="voice__who">{review.name}, {review.place} · <Link to={`/products/${product.handle}`}>{product.title}</Link></p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function Wearing() {
  const tiles = WEARING.map(([h, who, where]) => ({ p: productByHandle(h), who, where })).filter((t) => t.p?.images.length)
  return (
    <section className="section section--tight" id="wearing">
      <div className="wrap">
        <div className="section__head">
          <div><p className="eyebrow">#ninetees</p><h2 className="display">Wearing NineTees</h2></div>
          <p>Tag us on Instagram or TikTok and we will put you here.</p>
        </div>
        <div className="gallery-grid">
          {tiles.map(({ p, who, where }) => (
            <Link to={`/products/${p!.handle}`} className="ugc" key={p!.handle}>
              <img src={img(p!.images[0].url, 600)} alt={`${who} wearing the ${p!.title}`} loading="lazy" />
              <span className="ugc__cap">{who} · {where}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

function Tiles() {
  const used = new Set<string>()
  const covers = TILES.map((h) => { const c = collectionCover(h, used); if (c) used.add(c.handle); return c })
  return (
    <section className="section section--tight">
      <div className="wrap">
        <div className="section__head">
          <div><p className="eyebrow">Shop by mood</p><h2 className="display">Pick your decade. It's the same one.</h2></div>
        </div>
        <div className="tiles">
          {TILES.map((h, i) => {
            const c = collectionByHandle(h); const cover = covers[i]
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
          <article><div className="num">03</div><h3>Made in the North</h3><p>Designed in {config.brand.city}, picked and packed in our own {config.brand.warehouse} warehouse, and shipped in a box you will want to keep.</p></article>
        </div>
      </div>
    </section>
  )
}

function Newsletter() {
  const [done, setDone] = useState(false)
  const submit = (e: FormEvent) => { e.preventDefault(); setDone(true) }
  return (
    <section className="section" id="newsletter">
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
  usePageMeta()
  const picked = STAPLES.map(productByHandle).filter((p): p is NonNullable<typeof p> => Boolean(p && p.images.length))
  const fill = products.filter((p) => p.images.length > 1 && !picked.includes(p)).slice(0, Math.max(0, 8 - picked.length))
  const staples = [...picked, ...fill]
  const fresh = newIn.slice(0, 4)
  return (
    <>
      <Hero />
      <Ticker />
      <Trust />
      <Tiles />
      <section className="section section--tight">
        <div className="wrap">
          <div className="section__head">
            <div><p className="eyebrow">The staples</p><h2 className="display">Start here</h2></div>
            <Link to="/collections/the-britpop-edit" className="link">Shop the edit</Link>
          </div>
          <ProductGrid products={staples} eagerCount={4} />
        </div>
      </section>
      <Britpop />
      <Voices />
      <section className="section section--tight">
        <div className="wrap">
          <div className="section__head">
            <div><p className="eyebrow">Just landed</p><h2 className="display">New in</h2></div>
            <Link to="/collections/new-in" className="link">View all {newIn.length}</Link>
          </div>
          <ProductGrid products={fresh} />
        </div>
      </section>
      <Story />
      <Wearing />
      <Newsletter />
    </>
  )
}
