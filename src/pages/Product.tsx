import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import ProductGrid from '../components/ProductGrid'
import Placeholder from '../components/Placeholder'
import { img, productByHandle, related, type Product as ProductInfo } from '../lib/catalogue'
import { useCart } from '../lib/cart'
import { money } from '../lib/format'
import { usePageMeta } from '../lib/usePageMeta'
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

  const variant = useMemo(() => product.variants.find((v) => product.options.every((o) => v.options[o.name] === sel[o.name])), [product, sel])
  const others = useMemo(() => related(product, 4), [product])

  const complete = product.options.every((o) => sel[o.name])
  const availableFor = (name: string, value: string) =>
    product.variants.some((v) => v.available && v.options[name] === value && product.options.every((o) => o.name === name || !sel[o.name] || v.options[o.name] === sel[o.name]))
  const onAdd = () => { if (variant?.available) { add(variant.id); setAdded(true); setTimeout(() => setAdded(false), 1800) } }
  const [details] = product.descriptionHtml.split('<ul>')
  const bullets = product.descriptionHtml.includes('<ul>') ? '<ul>' + product.descriptionHtml.split('<ul>')[1] : ''
  const main = product.images[imgIdx]

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
            {main ? <img src={img(main.url, 1200)} alt={main.alt} /> : <Placeholder product={product} />}
            {product.images.length === 1 && <span className="gallery__hint">Model shots coming soon</span>}
          </div>
        </div>
        <div className="buy">
          <p className="eyebrow">{product.type}{product.colour ? ` · ${product.colour}` : ''}{product.newIn ? ' · New in' : ''}</p>
          <h1 className="display">{product.title}</h1>
          <div className="price">{variant ? money(variant.price) : product.priceMax > product.price ? `${money(product.price)} – ${money(product.priceMax)}` : money(product.price)}</div>
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
          {variant && (
            <p className={`stock${variant.quantity > 0 && variant.quantity < 20 ? ' stock--low' : ''}`}>
              {!variant.available ? 'Sold out in this size' : variant.quantity < 20 ? `Low stock: ${variant.quantity} left` : 'In stock, ships within 24 hours'}
              {' · '}<span className="small">Ref {variant.sku}</span>
            </p>
          )}
          <button type="button" className="btn btn--full" disabled={!complete || !variant?.available} onClick={onAdd}>
            {added ? 'Added to bag' : !complete ? 'Select your size' : variant?.available ? `Add to bag · ${money(variant.price)}` : 'Sold out'}
          </button>
          <div className="acc">
            <details open><summary>Details</summary><div className="body" dangerouslySetInnerHTML={{ __html: bullets }} /></details>
            <details><summary>Size &amp; fit</summary><div className="body">
              <ul>{product.options.map((o) => <li key={o.name}>{SIZE_GUIDE[o.name] ?? o.name}</li>)}</ul>
              <p style={{ marginTop: 10 }}><Link to="/help#sizing" className="link">Full size guide</Link></p>
            </div></details>
            <details><summary>Delivery &amp; returns</summary><div className="body">
              <p>UK standard delivery £3.95, free over £75. Next day £6.95 if you order before 2pm.</p>
              <p>Free returns within 28 days, unworn and with the tags on. Print a label from your order page. <Link to="/help#delivery" className="link">More on delivery and returns</Link>.</p>
            </div></details>
          </div>
        </div>
      </div>
      <section className="section section--tight" style={{ paddingTop: 0 }}>
        <div className="section__head"><div><p className="eyebrow">Goes with</p><h2 className="display">Complete the look</h2></div></div>
        <ProductGrid products={others} />
      </section>
    </div>
  )
}
