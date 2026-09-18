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

/** Shopify CDN images accept a width parameter; use it rather than shipping 1024px thumbnails. */
export const img = (url: string, width: number) => `${url}${url.includes('?') ? '&' : '?'}width=${width}`

/** Display order for size values across every scheme the catalogue uses; anything unknown sorts last. */
export const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', '2XL', 'UK 6', 'UK 8', 'UK 10', 'UK 12', 'UK 14', 'UK 16', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '30', '32', '34', '36', '38', 'S/M', 'L/XL', 'One Size']
export const sortSizes = (sizes: string[]) => {
  const rank = (s: string) => { const i = SIZE_ORDER.indexOf(s); return i === -1 ? SIZE_ORDER.length : i }
  return [...sizes].sort((a, b) => rank(a) - rank(b) || a.localeCompare(b))
}

export const allSizes = (list: Product[]) => {
  const seen = new Set<string>()
  list.forEach((p) => p.variants.forEach((v) => Object.entries(v.options).forEach(([k, val]) => { if (k !== 'Leg') seen.add(val) })))
  return [...seen]
}
export const allTypes = (list: Product[]) => [...new Set(list.map((p) => p.type))].sort()

/** Everything the site needs to know about the catalogue, derived once from the exported JSON. */
export function buildCatalogue(data: Catalogue) {
  const products = data.products
  const collections = data.collections
  const byHandle = new Map(products.map((p) => [p.handle, p]))
  const variantIndex = new Map(products.flatMap((p) => p.variants.map((v) => [v.id, { product: p, variant: v }] as const)))

  const productByHandle = (handle: string) => byHandle.get(handle)
  const collectionByHandle = (handle: string) => collections.find((c) => c.handle === handle)
  const productsInCollection = (handle: string) => products.filter((p) => p.collections.includes(handle))
  const lookupVariant = (id: string) => variantIndex.get(id)
  const newIn = products.filter((p) => p.newIn)

  /** Products that share a type or a mood tag, most-similar first. */
  function related(p: Product, n = 4): Product[] {
    const score = (q: Product) => (q.type === p.type ? 3 : 0) + (q.gender === p.gender ? 1 : 0) + q.tags.filter((t) => p.tags.includes(t)).length
    return products.filter((q) => q.handle !== p.handle).sort((a, b) => score(b) - score(a)).slice(0, n)
  }

  function collectionCover(handle: string, exclude: Set<string> = new Set()): Product | undefined {
    const want = handle === 'women' ? 'Women' : handle === 'men' ? 'Men' : null
    const rank = (p: Product) => (want && p.gender === want ? 4 : 0) + (p.images.length > 1 ? 2 : 0) + (p.newIn ? 1 : 0)
    return productsInCollection(handle)
      .filter((p) => p.images.length && !exclude.has(p.handle))
      .sort((a, b) => rank(b) - rank(a))[0]
  }

  function searchProducts(q: string): Product[] {
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

  return { catalogue: data, products, collections, productByHandle, collectionByHandle, productsInCollection, lookupVariant, newIn, related, collectionCover, searchProducts }
}
