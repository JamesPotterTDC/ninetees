import type { Product } from '../lib/catalogue'
import ProductCard from './ProductCard'

export default function ProductGrid({ products, eagerCount = 0 }: { products: Product[]; eagerCount?: number }) {
  return (
    <div className="grid">
      {products.map((p, i) => <ProductCard key={p.handle} product={p} eager={i < eagerCount} />)}
    </div>
  )
}
