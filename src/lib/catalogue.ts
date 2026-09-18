import raw from '../data/catalogue.json'

export type Variant = {
  id: string; sku: string; title: string; price: number; compareAtPrice: number | null
  available: boolean; quantity: number; options: Record<string, string>
}
export type Image = { url: string; alt: string; width: number; height: number }
export type Product = {
  id: string; handle: string; title: string; vendor: string; type: string; tags: string[]
  gender: 'Women' | 'Men' | 'Unisex'; colour: string | null; descriptionHtml: string; description: string
  price: number; priceMax: number; createdAt: string; newIn: boolean
  options: { name: string; values: string[] }[]; images: Image[]; variants: Variant[]; collections: string[]
}
export type Collection = { handle: string; title: string; description: string; count: number; image: string | null }
export type Catalogue = {
  generatedAt: string; shop: { domain: string; currency: string; storefrontApiVersion: string }
  collections: Collection[]; products: Product[]
}

export const catalogue = raw as unknown as Catalogue
export const products: Product[] = catalogue.products
export const collections: Collection[] = catalogue.collections

const byHandle = new Map(products.map((p) => [p.handle, p]))
const variantIndex = new Map(products.flatMap((p) => p.variants.map((v) => [v.id, { product: p, variant: v }] as const)))

export const productByHandle = (handle: string) => byHandle.get(handle)
export const collectionByHandle = (handle: string) => collections.find((c) => c.handle === handle)
export const productsInCollection = (handle: string) => products.filter((p) => p.collections.includes(handle))
export const lookupVariant = (id: string) => variantIndex.get(id)
export const newIn = products.filter((p) => p.newIn)

/** Products that share a type or a mood tag, most-similar first. */
export function related(p: Product, n = 4): Product[] {
  const score = (q: Product) =>
    (q.type === p.type ? 3 : 0) + (q.gender === p.gender ? 1 : 0) + q.tags.filter((t) => p.tags.includes(t)).length
  return products.filter((q) => q.handle !== p.handle).sort((a, b) => score(b) - score(a)).slice(0, n)
}

/** Shopify CDN images accept a width parameter; use it rather than shipping 1024px thumbnails. */
export const img = (url: string, width: number) => `${url}${url.includes('?') ? '&' : '?'}width=${width}`

/** Cover product for a collection tile: gender-matched where the collection is gendered, photographed
 *  sets first, and never a product already used by another tile. */
export function collectionCover(handle: string, exclude: Set<string> = new Set()): Product | undefined {
  const want = handle === 'women' ? 'Women' : handle === 'men' ? 'Men' : null
  const rank = (p: Product) => (want && p.gender === want ? 4 : 0) + (p.images.length > 1 ? 2 : 0) + (p.newIn ? 1 : 0)
  return productsInCollection(handle)
    .filter((p) => p.images.length && !exclude.has(p.handle))
    .sort((a, b) => rank(b) - rank(a))[0]
}

export const allSizes = (list: Product[]) => {
  const seen = new Map<string, number>()
  list.forEach((p) => p.variants.forEach((v) => Object.entries(v.options).forEach(([k, val]) => {
    if (k !== 'Leg') seen.set(val, (seen.get(val) ?? 0) + 1)
  })))
  return [...seen.keys()]
}
export const allTypes = (list: Product[]) => [...new Set(list.map((p) => p.type))].sort()

export function searchProducts(q: string): Product[] {
  const s = q.trim().toLowerCase()
  if (!s) return []
  const words = s.split(/\s+/)
  return products
    .map((p) => {
      const hay = `${p.title} ${p.type} ${p.colour ?? ''} ${p.tags.join(' ')} ${p.description}`.toLowerCase()
      const hits = words.filter((w) => hay.includes(w)).length
      return { p, hits: hits + (p.title.toLowerCase().includes(s) ? 2 : 0) }
    })
    .filter((x) => x.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .map((x) => x.p)
}
