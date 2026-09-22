// Post-build step. Renders every route to static HTML (body included) with its own title, description, social
// preview tags and structured data, so crawlers and link unfurlers get the real page without running JavaScript
// and the browser hydrates what is already on screen. GitHub Pages serves dist/products/<handle>.html at
// /products/<handle>. Also writes sitemap.xml, robots.txt and a prerendered 404.html.
// GitHub redirects the old jamespottertdc.github.io/ninetees/ address to the custom domain.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const { render, config, img } = await import(pathToFileURL(join(root, 'dist-ssr/entry-server.js')).href)

const SITE = config.siteUrl
const BRAND = config.brand.name
const TAGLINE = config.brand.tagline

const template = readFileSync(join(dist, 'index.html'), 'utf8')
if (!template.includes('<div id="root"></div>')) throw new Error('index.html has no empty #root to fill')
const catalogue = JSON.parse(readFileSync(join(root, 'src/data/catalogue.json'), 'utf8'))
const defaultImage = template.match(/<meta property="og:image" content="([^"]*)"/)?.[1] ?? ''
const defaultDescription = template.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? ''

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const text = (s, n = 160) => { const t = String(s).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t }
const ld = (obj) => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`
/** Preload hint for the page's largest image, matching the <img>'s srcset/sizes so the browser reuses the fetch. */
const preload = (url, widths, sizes) =>
  `<link rel="preload" as="image" href="${esc(img(url, widths.at(-1)))}" imagesrcset="${esc(widths.map((w) => `${img(url, w)} ${w}w`).join(', '))}" imagesizes="${sizes}" fetchpriority="high" />`

async function shell({ path, title, description, image = defaultImage, type = 'website', noindex = false, extra = [] }) {
  const url = SITE + path
  const fullTitle = title ? `${title} | ${BRAND}` : `${BRAND} · ${TAGLINE}`
  const body = await render('/' + path.replace(/^\//, ''))
  const head = [
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:type" content="${type}" />`,
    `<meta property="og:site_name" content="${BRAND}" />`,
    `<meta property="og:locale" content="en_GB" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    noindex ? `<meta name="robots" content="noindex" />` : '',
    ...extra,
  ].filter(Boolean).map((l) => `    ${l}`).join('\n')
  return template
    .replace(/<title>.*?<\/title>/s, `<title>${esc(fullTitle)}</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${esc(description)}" />`)
    .replace(/<meta property="og:title" content="[^"]*"\s*\/?>/, `<meta property="og:title" content="${esc(fullTitle)}" />`)
    .replace(/<meta property="og:description" content="[^"]*"\s*\/?>/, `<meta property="og:description" content="${esc(text(description, 200))}" />`)
    .replace(/<meta property="og:image" content="[^"]*"\s*\/?>/, `<meta property="og:image" content="${esc(image)}" />`)
    .replace('</head>', `${head}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${body}</div>`)
}

function write(path, html) {
  const file = path === '' ? join(dist, 'index.html') : join(dist, `${path}.html`)
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, html)
}

const urls = []
const add = (path, lastmod, priority) => urls.push({ loc: SITE + path, lastmod, priority })
const today = new Date().toISOString().slice(0, 10)
const exported = catalogue.generatedAt.slice(0, 10)

// Home: hero preload plus the organisation record
const hero = `${config.brand.heroUrl}&format=pjpg`
const org = {
  '@context': 'https://schema.org', '@type': 'Organization', name: BRAND, url: SITE, logo: `${SITE}apple-touch-icon.png`,
  sameAs: [config.social.instagram.url, config.social.tiktok.url],
}
write('', await shell({ path: '', title: '', description: defaultDescription, extra: [preload(hero, [900, 1400, 1800], '100vw'), ld(org)] })); add('', today, '1.0')
write('about', await shell({ path: 'about', title: 'Our story', description: `${BRAND} started in 1994 in Manchester with one rule: if it isn't the nineties, we don't sell it.` })); add('about', today, '0.6')
write('help', await shell({ path: 'help', title: 'Help & FAQ', description: `Delivery, returns, sizing and everything else you might want to know before you order from ${BRAND}.` })); add('help', today, '0.6')
write('search', await shell({ path: 'search', title: 'Search', description: defaultDescription, noindex: true }))
write('bag', await shell({ path: 'bag', title: 'Your bag', description: defaultDescription, noindex: true }))
write('thanks', await shell({ path: 'thanks', title: 'Order confirmed', description: defaultDescription, noindex: true }))

const collectionTitle = Object.fromEntries(catalogue.collections.map((c) => [c.handle, c.title]))
for (const c of catalogue.collections) {
  const cover = catalogue.products.find((p) => p.collections.includes(c.handle) && p.images.length && p.newIn) ?? catalogue.products.find((p) => p.collections.includes(c.handle) && p.images.length)
  write(`collections/${c.handle}`, await shell({
    path: `collections/${c.handle}`, title: c.title, description: c.description || `${c.title} from ${BRAND}. ${TAGLINE}`,
    image: cover ? img(cover.images[0].url, 1200) : defaultImage,
    extra: [ld({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
      { '@type': 'ListItem', position: 2, name: c.title, item: `${SITE}collections/${c.handle}` },
    ] })],
  }))
  add(`collections/${c.handle}`, exported, '0.8')
}
for (const p of catalogue.products) {
  const inStock = p.variants.some((v) => v.available)
  const parent = p.collections.find((h) => h === 'women' || h === 'men') ?? 'new-in'
  const product = {
    '@context': 'https://schema.org', '@type': 'Product', name: p.title, description: text(p.description, 300),
    image: p.images.map((i) => img(i.url, 1200)), sku: p.variants[0]?.sku, brand: { '@type': 'Brand', name: BRAND },
    url: `${SITE}products/${p.handle}`,
    offers: {
      '@type': 'AggregateOffer', priceCurrency: 'GBP', lowPrice: p.price.toFixed(2), highPrice: p.priceMax.toFixed(2), offerCount: p.variants.length,
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', url: `${SITE}products/${p.handle}`,
    },
  }
  const crumbs = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
      { '@type': 'ListItem', position: 2, name: collectionTitle[parent] ?? parent, item: `${SITE}collections/${parent}` },
      { '@type': 'ListItem', position: 3, name: p.title, item: `${SITE}products/${p.handle}` },
    ],
  }
  write(`products/${p.handle}`, await shell({
    path: `products/${p.handle}`, title: p.title, description: text(p.description), type: 'product',
    image: p.images[0] ? img(p.images[0].url, 1200) : defaultImage,
    extra: [
      p.images[0] ? preload(p.images[0].url, [600, 900, 1200], '(max-width: 860px) 100vw, 55vw') : '',
      `<meta property="product:price:amount" content="${p.price.toFixed(2)}" />`,
      `<meta property="product:price:currency" content="GBP" />`,
      ld(product), ld(crumbs),
    ],
  }))
  add(`products/${p.handle}`, exported, '0.7')
}

// The 404 page is a real render of the not-found route, so the client hydrates what it will show anyway.
writeFileSync(join(dist, '404.html'), await shell({ path: 'this-page-does-not-exist', title: 'Page not found', description: defaultDescription, noindex: true }))
writeFileSync(join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod><priority>${u.priority}</priority></url>`).join('\n')}\n</urlset>\n`)
writeFileSync(join(dist, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /bag\nDisallow: /search\nDisallow: /thanks\n\nSitemap: ${SITE}sitemap.xml\n`)
console.log(`prerendered ${urls.length + 3} routes with body HTML, sitemap with ${urls.length} URLs, robots.txt, 404.html`)
