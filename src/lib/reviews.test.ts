import { describe, expect, it } from 'vitest'
import raw from '../data/catalogue.json'
import { buildCatalogue, type Catalogue } from './catalogue-core'
import { featuredReviews, reviewsFor, siteStats, summarise } from './reviews'

const { products } = buildCatalogue(raw as unknown as Catalogue)

describe('reviewsFor', () => {
  it('is deterministic for a product', () => {
    const a = reviewsFor(products[3]).map((r) => `${r.id}|${r.name}|${r.rating}|${r.title}`)
    const b = reviewsFor(products[3]).map((r) => `${r.id}|${r.name}|${r.rating}|${r.title}`)
    expect(a).toEqual(b)
  })
  it('gives every product at least one review with sane fields', () => {
    products.forEach((p) => {
      const list = reviewsFor(p)
      expect(list.length).toBeGreaterThan(0)
      list.forEach((r) => {
        expect(r.rating).toBeGreaterThanOrEqual(1); expect(r.rating).toBeLessThanOrEqual(5)
        expect(r.body.length).toBeGreaterThan(10); expect(r.title.length).toBeGreaterThan(2)
      })
    })
  })
  it('newest first', () => {
    const list = reviewsFor(products[0])
    for (let i = 1; i < list.length; i++) expect(Date.parse(list[i - 1].date)).toBeGreaterThanOrEqual(Date.parse(list[i].date))
  })
})

describe('summarise', () => {
  it('histogram and fit add up', () => {
    const list = reviewsFor(products[5])
    const s = summarise(list)
    expect(s.count).toBe(list.length)
    expect(s.histogram.reduce((a, b) => a + b, 0)).toBe(s.count)
    const fitTotal = s.fit.small + s.fit.true + s.fit.large
    expect(fitTotal).toBeGreaterThanOrEqual(98); expect(fitTotal).toBeLessThanOrEqual(102)
    expect(s.average).toBeGreaterThanOrEqual(1); expect(s.average).toBeLessThanOrEqual(5)
  })
  it('handles an empty list', () => expect(summarise([]).count).toBe(0))
})

describe('siteStats and featuredReviews', () => {
  it('totals match the per-product lists', () => {
    const total = products.reduce((n, p) => n + reviewsFor(p).length, 0)
    expect(siteStats(products).count).toBe(total)
  })
  it('features distinct products with five-star reviews', () => {
    const picks = featuredReviews(products, 3)
    expect(picks).toHaveLength(3)
    expect(new Set(picks.map((x) => x.product.handle)).size).toBe(3)
    picks.forEach((x) => expect(x.review.rating).toBe(5))
  })
})
