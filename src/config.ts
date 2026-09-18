// Public configuration. The Storefront token is a *public* token by design (it can only read
// products and create carts) so it is safe to ship in the bundle. The Admin token never comes near this repo.
export const config = {
  shopDomain: 'jamesinternaltesting.myshopify.com',
  storefrontApiVersion: '2025-07',
  storefrontToken: (import.meta.env.VITE_SHOPIFY_STOREFRONT_TOKEN as string | undefined) ?? '',
  // The store keeps Shopify's storefront password on and Shopify's checkout insists on the matching
  // cookie, so the site posts the password for the visitor before handing over to checkout.
  storePassword: 'yeltao',
  siteUrl: 'https://jamespottertdc.github.io/ninetees/',
  brand: {
    name: 'NineTees',
    legalName: 'NineTees Ltd',
    tagline: 'Britpop, reissued.',
    strap: 'Nineties UK fashion. Cut for now.',
    est: 1994,
    city: 'Manchester',
    warehouse: 'Yorkshire',
    heroUrl: 'https://cdn.shopify.com/s/files/1/0786/6607/2331/files/hero-skatepark.png?v=1789764682',
    markUrl: 'https://cdn.shopify.com/s/files/1/0786/6607/2331/files/NineTees.png?v=1789759916',
  },
  contact: {
    email: 'hello@ninetees.co.uk',
    phone: '0161 496 0194',
    hours: 'Monday to Friday, 9am to 5.30pm',
    address: ['Unit 7, Hilton Street', 'Northern Quarter', 'Manchester M1 2EH'],
    shopHours: 'Thursday to Sunday, 11am to 6pm',
  },
  social: { instagram: '@ninetees', tiktok: '@ninetees.uk' },
  payments: ['Visa', 'Mastercard', 'Amex', 'Apple Pay', 'Google Pay', 'PayPal', 'Klarna'],
  delivery: { standard: 3.95, nextDay: 6.95, freeOver: 75, cutoffHour: 14, returnsDays: 28 },
  fulfilment: 'Helm',
}
