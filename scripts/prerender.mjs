// Post-build step. Writes a static HTML shell for every route with its own title, description and
// social preview tags, so a shared link unfurls as that product or collection rather than the generic
// home page. GitHub Pages serves dist/products/<handle>.html at /products/<handle>. The body is still
// rendered by the app; only the head differs. Also writes sitemap.xml, robots.txt and the SPA 404.html.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const SITE = 'https://jamespottertdc.github.io/ninetees/'
const BRAND = 'NineTees'
const TAGLINE = 'Britpop, reissued.'

const template = readFileSync(join(dist, 'index.html'), 'utf8')
const catalogue = JSON.parse(readFileSync(join(root, 'src/data/catalogue.json'), 'utf8'))
const heroImage = template.match(/<meta property="og:image" content="([^"]*)"/)?.[1] ?? ''
const defaultDescription = template.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? ''

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const text = (s, n = 160) => { const t = String(s).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t }
const width = (url, w) => `${url}${url.includes('?') ? '&' : '?'}width=${w}`

function shell({ path, title, description, image = heroImage, type = 'website', noindex = false, extra = '' }) {
  const url = SITE + path
  const fullTitle = title ? `${title} | ${BRAND}` : `${BRAND} · ${TAGLINE}`
  let out = template
    .replace(/<title>.*?<\/title>/s, `<title>${esc(fullTitle)}</title>`)
    .replace(/<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${esc(description)}" />`)
    .replace(/<meta property="og:title" content="[^"]*"\s*\/?>/, `<meta property="og:title" content="${esc(fullTitle)}" />`)
    .replace(/<meta property="og:description" content="[^"]*"\s*\/?>/, `<meta property="og:description" content="${esc(text(description, 200))}" />`)
    .replace(/<meta property="og:image" content="[^"]*"\s*\/?>/, `<meta property="og:image" content="${esc(image)}" />`)
  const head = [
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:type" content="${type}" />`,
    `<meta property="og:site_name" content="${BRAND}" />`,
    `<meta property="og:locale" content="en_GB" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    noindex ? `<meta name="robots" content="noindex" />` : '',
    extra,
  ].filter(Boolean).map((l) => `    ${l}`).join('\n')
  return out.replace('</head>', `${head}\n  </head>`)
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

write('', shell({ path: '', title: '', description: defaultDescription })); add('', today, '1.0')
write('about', shell({ path: 'about', title: 'Our story', description: `${BRAND} started in 1994 in Manchester with one rule: if it isn't the nineties, we don't sell it.` })); add('about', today, '0.6')
write('help', shell({ path: 'help', title: 'Help & FAQ', description: `Delivery, returns, sizing and everything else you might want to know before you order from ${BRAND}.` })); add('help', today, '0.6')
write('search', shell({ path: 'search', title: 'Search', description: defaultDescription, noindex: true }))
write('bag', shell({ path: 'bag', title: 'Your bag', description: defaultDescription, noindex: true }))
write('thanks', shell({ path: 'thanks', title: 'Order confirmed', description: defaultDescription, noindex: true }))

const byHandle = new Map(catalogue.products.map((p) => [p.handle, p]))
for (const c of catalogue.collections) {
  const cover = catalogue.products.find((p) => p.collections.includes(c.handle) && p.images.length && p.newIn) ?? catalogue.products.find((p) => p.collections.includes(c.handle) && p.images.length)
  write(`collections/${c.handle}`, shell({
    path: `collections/${c.handle}`, title: c.title, description: c.description || `${c.title} from ${BRAND}. ${TAGLINE}`,
    image: cover ? width(cover.images[0].url, 1200) : heroImage,
  }))
  add(`collections/${c.handle}`, exported, '0.8')
}
for (const p of catalogue.products) {
  const inStock = p.variants.some((v) => v.available)
  const ld = {
    '@context': 'https://schema.org', '@type': 'Product', name: p.title, description: text(p.description, 300),
    image: p.images.map((i) => width(i.url, 1200)), sku: p.variants[0]?.sku, brand: { '@type': 'Brand', name: BRAND },
    url: `${SITE}products/${p.handle}`,
    offers: {
      '@type': 'AggregateOffer', priceCurrency: 'GBP', lowPrice: p.price.toFixed(2), highPrice: p.priceMax.toFixed(2), offerCount: p.variants.length,
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', url: `${SITE}products/${p.handle}`,
    },
  }
  write(`products/${p.handle}`, shell({
    path: `products/${p.handle}`, title: p.title, description: text(p.description), type: 'product',
    image: p.images[0] ? width(p.images[0].url, 1200) : heroImage,
    extra: [
      `<meta property="product:price:amount" content="${p.price.toFixed(2)}" />`,
      `<meta property="product:price:currency" content="GBP" />`,
      `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`,
    ].join('\n    '),
  }))
  add(`products/${p.handle}`, exported, '0.7')
}
void byHandle

copyFileSync(join(dist, 'index.html'), join(dist, '404.html'))
writeFileSync(join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u.loc}</loc><lastmod>${u.lastmod}</lastmod><priority>${u.priority}</priority></url>`).join('\n')}\n</urlset>\n`)
writeFileSync(join(dist, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /ninetees/bag\nDisallow: /ninetees/search\nDisallow: /ninetees/thanks\n\nSitemap: ${SITE}sitemap.xml\n`)
console.log(`prerendered ${urls.length + 3} route shells, sitemap with ${urls.length} URLs, robots.txt, 404.html`)
