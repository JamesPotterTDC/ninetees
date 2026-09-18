import { describe, expect, it } from 'vitest'
import raw from '../data/catalogue.json'
import { allSizes, buildCatalogue, sortSizes, type Catalogue } from './catalogue-core'

const cat = buildCatalogue(raw as unknown as Catalogue)

describe('searchProducts', () => {
  it('returns nothing for a blank query', () => expect(cat.searchProducts('   ')).toEqual([]))
  it('finds products by a word in the title and ranks title matches first', () => {
    const hits = cat.searchProducts('parka')
    expect(hits.length).toBeGreaterThan(0)
    expect(hits[0].title.toLowerCase()).toContain('parka')
  })
  it('matches on colour and tags too', () => {
    expect(cat.searchProducts('tartan').length).toBeGreaterThan(0)
  })
})

describe('related', () => {
  const p = cat.products[0]
  it('never includes the product itself and honours n', () => {
    const r = cat.related(p, 4)
    expect(r).toHaveLength(4)
    expect(r.map((q) => q.handle)).not.toContain(p.handle)
  })
  it('prefers products of the same type', () => {
    const sameType = cat.products.filter((q) => q.type === p.type && q.handle !== p.handle)
    if (sameType.length) expect(cat.related(p, 1)[0].type).toBe(p.type)
  })
})

describe('sortSizes', () => {
  it('orders letters, UK dress sizes, shoe sizes, waists and hats, unknown last', () => {
    expect(sortSizes(['L', 'UK 8', 'XS', 'One Size', '32', '7', 'S/M', 'Bizarre'])).toEqual(['XS', 'L', 'UK 8', '7', '32', 'S/M', 'One Size', 'Bizarre'])
  })
  it('does not mutate its input', () => {
    const input = ['M', 'S']; sortSizes(input); expect(input).toEqual(['M', 'S'])
  })
})

describe('catalogue integrity', () => {
  it('every product handle is unique and resolvable', () => {
    const handles = cat.products.map((p) => p.handle)
    expect(new Set(handles).size).toBe(handles.length)
    handles.forEach((h) => expect(cat.productByHandle(h)?.handle).toBe(h))
  })
  it('every variant id resolves back to its product', () => {
    cat.products.forEach((p) => p.variants.forEach((v) => expect(cat.lookupVariant(v.id)?.product.handle).toBe(p.handle)))
  })
  it('every collection a product lists exists (frontpage is Shopify\'s home collection and is not exported)', () => {
    const known = new Set(cat.collections.map((c) => c.handle))
    cat.products.forEach((p) => p.collections.filter((c) => c !== 'frontpage').forEach((c) => expect(known.has(c), `${p.handle} -> ${c}`).toBe(true)))
  })
  it('allSizes ignores the Leg option but keeps every other option value', () => {
    const jeans = { ...cat.products[0], options: [{ name: 'Waist', values: ['30'] }, { name: 'Leg', values: ['99'] }],
      variants: [{ ...cat.products[0].variants[0], options: { Waist: '30', Leg: '99' } }] }
    const sizes = allSizes([jeans])
    expect(sizes).toContain('30')
    expect(sizes).not.toContain('99')
  })
})
