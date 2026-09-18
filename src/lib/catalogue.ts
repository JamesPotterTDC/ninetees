import catalogueUrl from '../data/catalogue.json?url'
import { buildCatalogue, type Catalogue } from './catalogue-core'

export * from './catalogue-core'

// The catalogue ships as its own hashed asset rather than inside the JavaScript bundle, so it is cached
// independently of code changes and parsed as JSON rather than as script. Every module that imports from
// here waits on this top-level await, so the app renders with the data already in hand.
const res = await fetch(catalogueUrl)
if (!res.ok) throw new Error(`Could not load the catalogue (${res.status})`)
export const { catalogue, products, collections, productByHandle, collectionByHandle, productsInCollection, lookupVariant, newIn, related, collectionCover, searchProducts } =
  buildCatalogue((await res.json()) as Catalogue)
