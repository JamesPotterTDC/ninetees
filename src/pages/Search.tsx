import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import ProductGrid from '../components/ProductGrid'
import { searchProducts } from '../lib/catalogue'
import { usePageMeta } from '../lib/usePageMeta'

export default function Search() {
  const [params, setParams] = useSearchParams()
  const q = params.get('q') ?? ''
  const results = useMemo(() => searchProducts(q), [q])
  usePageMeta(q ? `Search: ${q}` : 'Search')
  return (
    <div className="wrap" style={{ paddingBottom: 96 }}>
      <h1 className="display page-title">Search</h1>
      <div className="searchbar">
        <input type="search" autoFocus value={q} placeholder="Try parka, platform, tie-dye…" aria-label="Search products"
          onChange={(e) => setParams(e.target.value ? { q: e.target.value } : {}, { replace: true })} />
      </div>
      {q && <p className="small" style={{ marginBottom: 20 }}>{results.length} result{results.length === 1 ? '' : 's'} for “{q}”</p>}
      {results.length ? <ProductGrid products={results} eagerCount={4} /> : q ? <p className="empty">Nothing for that. Try a decade-appropriate word.</p> : null}
    </div>
  )
}
