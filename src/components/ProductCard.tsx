import { Link } from 'react-router-dom'
import { img, type Product } from '../lib/catalogue'
import { money } from '../lib/format'
import Placeholder from './Placeholder'

export default function ProductCard({ product, eager = false }: { product: Product; eager?: boolean }) {
  const [a, b] = product.images
  const soldOut = !product.variants.some((v) => v.available)
  const from = product.priceMax > product.price
  return (
    <Link to={`/products/${product.handle}`} className="card">
      <div className="card__media">
        {product.newIn && <span className="badge">New</span>}
        {soldOut && <span className="badge badge--ink" style={{ left: 'auto', right: 10 }}>Sold out</span>}
        {a ? (
          <>
            <img src={img(a.url, 720)} srcSet={`${img(a.url, 480)} 480w, ${img(a.url, 720)} 720w, ${img(a.url, 1024)} 1024w`} sizes="(max-width: 860px) 50vw, 25vw" alt={a.alt} loading={eager ? 'eager' : 'lazy'} />
            {b && <img className="alt" src={img(b.url, 720)} alt="" loading="lazy" />}
          </>
        ) : <Placeholder product={product} compact />}
      </div>
      <div className="card__body">
        <div className="card__title">{product.title}</div>
        <div className="card__price">{from ? 'From ' : ''}{money(product.price)}</div>
        <div className="card__meta">{product.type}{product.colour ? ` · ${product.colour}` : ''}</div>
      </div>
    </Link>
  )
}
