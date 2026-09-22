import catalogueUrl from '../data/catalogue.json?url'
import { buildCatalogue, type Catalogue } from './catalogue-core'
import { setReviewAnchor } from './reviews'

export * from './catalogue-core'

async function load(): Promise<Catalogue> {
  if (import.meta.env.SSR) {
    // Prerendering in Node: read the export straight from disk; there is no server to fetch it from.
    const mod = await import('../data/catalogue.json')
    return mod.default as unknown as Catalogue
  }
  // In the browser the catalogue ships as its own hashed asset rather than inside the JavaScript bundle, so it
  // is cached independently of code changes and parsed as JSON rather than as script.
  const res = await fetch(catalogueUrl)
  if (!res.ok) throw new Error(`Could not load the catalogue (${res.status})`)
  return (await res.json()) as Catalogue
}

// Every module that imports from here waits on this top-level await, so the app renders with the data in hand.
const data = await load()
// Review dates hang off the export time, so the prerendered HTML and the browser agree on them.
setReviewAnchor(Date.parse(data.generatedAt))
export const { catalogue, products, collections, productByHandle, collectionByHandle, productsInCollection, lookupVariant, newIn, related, collectionCover, searchProducts } =
  buildCatalogue(data)
