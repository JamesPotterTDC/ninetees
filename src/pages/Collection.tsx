import { useMemo } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import ProductGrid from '../components/ProductGrid'
import { allSizes, allTypes, collectionByHandle, productsInCollection, sortSizes, type Collection as CollectionInfo, type Product } from '../lib/catalogue'
import { usePageMeta } from '../lib/usePageMeta'
import NotFound from './NotFound'

type Sort = 'featured' | 'new' | 'low' | 'high'
type Gender = 'All' | Product['gender']
const GENDERS: readonly Gender[] = ['All', 'Women', 'Men', 'Unisex']
const SORTS: readonly Sort[] = ['featured', 'new', 'low', 'high']

export default function Collection() {
  const { handle = '' } = useParams()
  const collection = collectionByHandle(handle)
  if (!collection) return <NotFound />
  return <CollectionView key={handle} collection={collection} />
}

/** Filters live in the query string (?gender=Women&type=Jeans&size=M&sort=low) so a filtered view can be shared
 *  and comes back intact from the browser's back button. Unknown values fall back to All. */
function CollectionView({ collection }: { collection: CollectionInfo }) {
  const { handle } = collection
  const [params, setParams] = useSearchParams()
  const base = useMemo(() => productsInCollection(handle), [handle])
  usePageMeta(collection.title, collection.description)

  const sizes = useMemo(() => sortSizes(allSizes(base)), [base])
  const types = useMemo(() => allTypes(base), [base])
  const genders = useMemo(() => new Set(base.map((p) => p.gender)), [base])

  const gender: Gender = (GENDERS as readonly string[]).includes(params.get('gender') ?? '') ? (params.get('gender') as Gender) : 'All'
  const type = types.includes(params.get('type') ?? '') ? (params.get('type') as string) : 'All'
  const size = sizes.includes(params.get('size') ?? '') ? (params.get('size') as string) : 'All'
  const sort: Sort = (SORTS as readonly string[]).includes(params.get('sort') ?? '') ? (params.get('sort') as Sort) : 'featured'

  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value === 'All' || value === 'featured') next.delete(key); else next.set(key, value)
    setParams(next, { replace: true })
  }
  const clear = () => setParams({}, { replace: true })

  // Only offer a control when it can actually narrow the list.
  const showGender = handle !== 'women' && handle !== 'men' && genders.size > 1
  const showType = types.length > 1
  const showSize = sizes.length > 1
  const filtered = gender !== 'All' || type !== 'All' || size !== 'All'

  const list = useMemo(() => {
    let l = base.filter((p) => (gender === 'All' || p.gender === gender || p.gender === 'Unisex') && (type === 'All' || p.type === type))
    if (size !== 'All') l = l.filter((p) => p.variants.some((v) => v.available && Object.entries(v.options).some(([k, val]) => k !== 'Leg' && val === size)))
    const by: Record<Sort, (a: Product, b: Product) => number> = {
      featured: (a, b) => Number(Boolean(b.images.length)) - Number(Boolean(a.images.length)) || Number(b.newIn) - Number(a.newIn) || a.title.localeCompare(b.title),
      new: (a, b) => b.createdAt.localeCompare(a.createdAt),
      low: (a, b) => a.price - b.price,
      high: (a, b) => b.price - a.price,
    }
    return [...l].sort(by[sort])
  }, [base, gender, type, size, sort])

  return (
    <div className="wrap">
      <div className="plp__head">
        <p className="eyebrow">Collection</p>
        <h1 className="display">{collection.title}</h1>
        {collection.description && <p>{collection.description}</p>}
      </div>
      <div className="filters">
        {showGender && GENDERS.map((g) => (
          <button key={g} type="button" className={`chip${gender === g ? ' on' : ''}`} onClick={() => update('gender', g)} aria-pressed={gender === g}>{g}</button>
        ))}
        {showType && (
          <label className="select"><span className="sr-only">Type</span>
            <select value={type} onChange={(e) => update('type', e.target.value)}>
              <option value="All">All types</option>{types.map((t) => <option key={t}>{t}</option>)}
            </select>
          </label>
        )}
        {showSize && (
          <label className="select"><span className="sr-only">Size</span>
            <select value={size} onChange={(e) => update('size', e.target.value)}>
              <option value="All">All sizes</option>{sizes.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
        )}
        <label className="select"><span className="sr-only">Sort</span>
          <select value={sort} onChange={(e) => update('sort', e.target.value)}>
            <option value="featured">Featured</option><option value="new">Newest</option>
            <option value="low">Price: low to high</option><option value="high">Price: high to low</option>
          </select>
        </label>
        {filtered && <button type="button" className="chip chip--clear" onClick={clear}>Clear filters</button>}
        <span className="count">{list.length} of {base.length}</span>
      </div>
      {list.length
        ? <ProductGrid products={list} eagerCount={4} />
        : <p className="empty">Nothing matches that. <button type="button" className="link" onClick={clear}>Clear the filters</button> and try again.</p>}
      <div style={{ height: 72 }} />
    </div>
  )
}
