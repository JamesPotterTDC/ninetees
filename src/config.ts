// Public configuration. The Storefront token is a *public* token by design (it can only read
// products and create carts) so it is safe to ship in the bundle. The Admin token never comes near this repo.
export const config = {
  shopDomain: 'jamesinternaltesting.myshopify.com',
  storefrontApiVersion: '2025-07',
  storefrontToken: (import.meta.env.VITE_SHOPIFY_STOREFRONT_TOKEN as string | undefined) ?? '',
  brand: {
    name: 'NineTees',
    tagline: 'Britpop, reissued.',
    strap: 'Nineties UK fashion. Cut for now.',
    est: 1994,
    city: 'Manchester',
  },
}
