// Public configuration. The Storefront token is a *public* token by design (it can only read
// products and create carts) so it is safe to ship in the bundle. The Admin token never comes near this repo.
export const config = {
  shopDomain: 'jamesinternaltesting.myshopify.com',
  storefrontApiVersion: '2025-07',
  storefrontToken: (import.meta.env.VITE_SHOPIFY_STOREFRONT_TOKEN as string | undefined) ?? '',
  // The development store keeps Shopify's storefront password on, and Shopify's checkout insists on the
  // matching cookie. This is a demo shop, so the password is public: the site posts it for the visitor.
  storePassword: 'yeltao',
  siteUrl: 'https://jamespottertdc.github.io/ninetees/',
  brand: {
    name: 'NineTees',
    tagline: 'Britpop, reissued.',
    strap: 'Nineties UK fashion. Cut for now.',
    est: 1994,
    city: 'Manchester',
    heroUrl: 'https://cdn.shopify.com/s/files/1/0786/6607/2331/files/hero-skatepark.png?v=1789764682',
    markUrl: 'https://cdn.shopify.com/s/files/1/0786/6607/2331/files/NineTees.png?v=1789759916',
  },
}
