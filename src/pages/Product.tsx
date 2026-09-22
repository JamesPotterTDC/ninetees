import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ProductGrid from '../components/ProductGrid'
import Placeholder from '../components/Placeholder'
import Reviews from '../components/Reviews'
import Stars from '../components/Stars'
import { img, productByHandle, related, type Product as ProductInfo, type Variant } from '../lib/catalogue'
import { useCart } from '../lib/cart'
import { money } from '../lib/format'
import { usePageMeta } from '../lib/usePageMeta'
import { useLiveStock } from '../lib/useLiveStock'
import { useCutoff } from '../lib/useCutoff'
import { useRecentlyViewed } from '../lib/recentlyViewed'
import { ratingFor } from '../lib/reviews'
import { config } from '../config'
import NotFound from './NotFound'

const SIZE_GUIDE: Record<string, string> = {
  Size: 'Unisex tops run XS to 2XL and are cut relaxed. Women\'s pieces use UK dress sizes 6 to 16.',
  'UK Size': 'UK shoe sizing. If you are between sizes, go up.',
  Waist: 'Waist in inches, measured flat across the top of the waistband.',
  Leg: 'Inside leg in inches. 32 is our standard.',
}

export default function Product() {
  const { handle = '' } = useParams()
  const product = productByHandle(handle)
  if (!product) return <NotFound />
  // Keyed on the handle so selection, gallery and "added" state start fresh for every product.
  return <ProductView key={product.handle} product={product} />
}

function ProductView({ product }: { product: ProductInfo }) {
  const { add } = useCart()
  // Pre-select any option that only has one value (One Size). A hat's two-value list is left for the visitor.
  const [sel, setSel] = useState<Record<string, string>>(() => {
    const auto: Record<string, string> = {}
    product.options.forEach((o) => { if (o.values.length === 1) auto[o.name] = o.values[0] })
    return auto
  })
  const [imgIdx, setImgIdx] = useState(0)
  const [added, setAdded] = useState(false)
  usePageMeta(product.title, product.description)
  const despatch = useCutoff()
  const recent = useRecentlyViewed(product.handle)
  const rating = useMemo(() => ratingFor(product), [product])

  // Live numbers from Shopify (which the warehouse keeps in step) override the exported snapshot once they arrive.
  const live = useLiveStock(product.handle)
  const stockOf = (v: Variant) => {
    const l = live?.[v.id]
    return { available: l ? l.available : v.available, quantity: l?.quantity ?? v.quantity }
  }

  const variant = useMemo(() => product.variants.find((v) => product.options.every((o) => v.options[o.name] === sel[o.name])), [product, sel])
  const others = useMemo(() => related(product, 4), [product])

  const complete = product.options.every((o) => sel[o.name])
  const availableFor = (name: string, value: string) =>
    product.variants.some((v) => stockOf(v).available && v.options[name] === value && product.options.every((o) => o.name === name || !sel[o.name] || v.options[o.name] === sel[o.name]))
  const stock = variant ? stockOf(variant) : null
  const onAdd = () => { if (stock?.available && variant) { add(variant.id); setAdded(true); setTimeout(() => setAdded(false), 1800) } }
  const [details] = product.descriptionHtml.split('<ul>')
  const bullets = product.descriptionHtml.includes('<ul>') ? '<ul>' + product.descriptionHtml.split('<ul>')[1] : ''
  const main = product.images[imgIdx]
  const shownPrice = variant ? variant.price : product.price
  const d = config.delivery

  return (
    <div className="wrap">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/">Home</Link> / <Link to={`/collections/${product.collections.find((c) => ['women', 'men'].includes(c)) ?? 'new-in'}`}>{product.gender}</Link> / {product.type}
      </nav>
      <div className="pdp">
        <div className="gallery">
          {product.images.length > 1 && (
            <div className="gallery__thumbs">
              {product.images.map((im, i) => (
                <button key={im.url} type="button" className={i === imgIdx ? 'on' : ''} onClick={() => setImgIdx(i)} aria-label={`Image ${i + 1}`}>
                  <img src={img(im.url, 160)} alt="" />
                </button>
              ))}
            </div>
          )}
          <div className="gallery__main" style={product.images.length <= 1 ? { gridColumn: '1 / -1' } : undefined}>
            {main
              ? <img src={img(main.url, 1200)} srcSet={`${img(main.url, 600)} 600w, ${img(main.url, 900)} 900w, ${img(main.url, 1200)} 1200w`} sizes="(max-width: 860px) 100vw, 55vw" alt={main.alt} fetchPriority="high" />
              : <Placeholder product={product} />}
          </div>
        </div>
        <div className="buy">
          <p className="eyebrow">{product.type}{product.colour ? ` · ${product.colour}` : ''}{product.newIn ? ' · New in' : ''}</p>
          <h1 className="display">{product.title}</h1>
          {rating.count > 0 && (
            <p className="buy__rating"><Stars rating={rating.average} size={13} /><a href="#reviews">{rating.average.toFixed(1)} · {rating.count} review{rating.count === 1 ? '' : 's'}</a></p>
          )}
          <div className="price">{variant ? money(variant.price) : product.priceMax > product.price ? `${money(product.price)} – ${money(product.priceMax)}` : money(product.price)}</div>
          {shownPrice >= 30 && <p className="payin3">Or 3 interest-free payments of {money(Math.round((shownPrice / 3) * 100) / 100)}</p>}
          <p className="lede" dangerouslySetInnerHTML={{ __html: details }} />
          {product.options.map((o) => (
            <div className="opt" key={o.name}>
              <div className="opt__head"><span style={{ color: 'inherit', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase' }}>{o.name}</span><span>{sel[o.name] ?? `Select ${o.name.toLowerCase()}`}</span></div>
              <div className="opt__vals">
                {o.values.map((val) => {
                  const ok = availableFor(o.name, val)
                  return (
                    <button key={val} type="button" className={`${sel[o.name] === val ? 'on' : ''}${ok ? '' : ' off'}`}
                      onClick={() => setSel((s) => ({ ...s, [o.name]: val }))} aria-pressed={sel[o.name] === val}>
                      {val}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
          {variant && stock && (
            <p className={`stock${stock.available && stock.quantity > 0 && stock.quantity < 20 ? ' stock--low' : ''}`}>
              {!stock.available ? 'Sold out in this size' : stock.quantity < 20 ? `Only ${stock.quantity} left in this size` : 'In stock'}
              {' · '}<span className="small">Ref {variant.sku}</span>
            </p>
          )}
          {despatch && <p className="cutoff">{despatch}</p>}
          <button type="button" className="btn btn--full" disabled={!complete || !stock?.available} onClick={onAdd}>
            {added ? 'Added to bag' : !complete ? 'Select your size' : stock?.available && variant ? `Add to bag · ${money(variant.price)}` : 'Sold out'}
          </button>
          <div className="acc">
            <details open><summary>Details</summary><div className="body" dangerouslySetInnerHTML={{ __html: bullets }} /></details>
            <details><summary>Size &amp; fit</summary><div className="body">
              <ul>{product.options.map((o) => <li key={o.name}>{SIZE_GUIDE[o.name] ?? o.name}</li>)}</ul>
              {rating.count > 0 && <p style={{ marginTop: 10 }}>{rating.fit.true}% of reviewers say it fits true to size.</p>}
              <p style={{ marginTop: 10 }}><Link to="/help#sizing" className="link">Full size guide</Link></p>
            </div></details>
            <details><summary>Delivery &amp; returns</summary><div className="body">
              <p>UK standard delivery {money(d.standard)}, free over {money(d.freeOver)}. Next day {money(d.nextDay)} if you order before {d.cutoffHour - 12}pm.</p>
              <p>Free returns within {d.returnsDays} days, unworn and with the tags on. Print a label from your order page or bring it into the shop. <Link to="/help#delivery" className="link">More on delivery and returns</Link>.</p>
            </div></details>
          </div>
        </div>
      </div>
      <Reviews product={product} />
      <section className="section section--tight">
        <div className="section__head"><div><p className="eyebrow">Goes with</p><h2 className="display">Complete the look</h2></div></div>
        <ProductGrid products={others} />
      </section>
      {recent.length > 0 && (
        <section className="section section--tight" style={{ paddingTop: 0 }}>
          <div className="section__head"><div><p className="eyebrow">Recently viewed</p><h2 className="display">Still thinking about these?</h2></div></div>
          <ProductGrid products={recent} />
        </section>
      )}
    </div>
  )
}
