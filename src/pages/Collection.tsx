import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import ProductGrid from '../components/ProductGrid'
import { allSizes, allTypes, collectionByHandle, productsInCollection, type Collection as CollectionInfo, type Product } from '../lib/catalogue'
import { usePageMeta } from '../lib/usePageMeta'
import NotFound from './NotFound'

const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', '2XL', 'UK 6', 'UK 8', 'UK 10', 'UK 12', 'UK 14', 'UK 16', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '30', '32', '34', '36', '38', 'S/M', 'L/XL', 'One Size']
type Sort = 'featured' | 'new' | 'low' | 'high'
type Gender = 'All' | Product['gender']

export default function Collection() {
  const { handle = '' } = useParams()
  const collection = collectionByHandle(handle)
  if (!collection) return <NotFound />
  // Keyed on the handle so the filters reset when you move from one collection to another.
  return <CollectionView key={handle} collection={collection} />
}

function CollectionView({ collection }: { collection: CollectionInfo }) {
  const { handle } = collection
  const base = useMemo(() => productsInCollection(handle), [handle])
  const [gender, setGender] = useState<Gender>('All')
  const [type, setType] = useState('All')
  const [size, setSize] = useState('All')
  const [sort, setSort] = useState<Sort>('featured')
  usePageMeta(collection.title, collection.description)

  const sizes = useMemo(() => allSizes(base).sort((a, b) => SIZE_ORDER.indexOf(a) - SIZE_ORDER.indexOf(b)), [base])
  const types = useMemo(() => allTypes(base), [base])
  const genders = useMemo(() => new Set(base.map((p) => p.gender)), [base])

  // Only offer a control when it can actually narrow the list.
  const showGender = handle !== 'women' && handle !== 'men' && genders.size > 1
  const showType = types.length > 1
  const showSize = sizes.length > 1
  const filtered = gender !== 'All' || type !== 'All' || size !== 'All'
  const clear = () => { setGender('All'); setType('All'); setSize('All') }

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
        {showGender && (['All', 'Women', 'Men', 'Unisex'] as const).map((g) => (
          <button key={g} type="button" className={`chip${gender === g ? ' on' : ''}`} onClick={() => setGender(g)} aria-pressed={gender === g}>{g}</button>
        ))}
        {showType && (
          <label className="select"><span className="sr-only">Type</span>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="All">All types</option>{types.map((t) => <option key={t}>{t}</option>)}
            </select>
          </label>
        )}
        {showSize && (
          <label className="select"><span className="sr-only">Size</span>
            <select value={size} onChange={(e) => setSize(e.target.value)}>
              <option value="All">All sizes</option>{sizes.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
        )}
        <label className="select"><span className="sr-only">Sort</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
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
