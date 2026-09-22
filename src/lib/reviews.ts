import type { Product } from './catalogue-core'

export type Fit = 'small' | 'true' | 'large'
export type Review = {
  id: string; name: string; place: string; rating: number; title: string; body: string
  size: string | null; fit: Fit; date: string; helpful: number
}
export type ReviewSummary = { count: number; average: number; histogram: [number, number, number, number, number]; fit: Record<Fit, number> }

/** Small seeded generator (mulberry32 over a string hash) so every product shows the same reviews on every visit. */
function rng(seedStr: string) {
  let h = 1779033703 ^ seedStr.length
  for (let i = 0; i < seedStr.length; i++) { h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19) }
  return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16; return (h >>> 0) / 4294967296 }
}
const pick = <T>(r: () => number, arr: readonly T[]): T => arr[Math.floor(r() * arr.length)]

type Cat = 'tops' | 'outer' | 'bottoms' | 'dresses' | 'shoes' | 'acc'
const CATEGORY: Record<string, Cat> = {
  'T-Shirts': 'tops', Tops: 'tops', Polos: 'tops', Shirts: 'tops', Sweatshirts: 'tops', Hoodies: 'tops', Knitwear: 'tops',
  Jackets: 'outer', Tracksuits: 'outer', Jeans: 'bottoms', Trousers: 'bottoms', Shorts: 'bottoms', Leggings: 'bottoms',
  Dungarees: 'bottoms', Skirts: 'bottoms', Dresses: 'dresses', Footwear: 'shoes', Accessories: 'acc', Bags: 'acc', Hats: 'acc',
}

const NAMES = ['Sophie R.', 'Dan H.', 'Priya K.', 'Callum M.', 'Becky T.', 'Liam O.', 'Aisha B.', 'Jordan W.', 'Megan F.', 'Tom S.', 'Chloe D.', 'Ryan P.',
  'Hannah G.', 'Kieran L.', 'Amara J.', 'Josh C.', 'Ellie N.', 'Sam W.', 'Niamh Q.', 'Marcus A.', 'Gemma H.', 'Ade O.', 'Lauren B.', 'Connor R.',
  'Zara M.', 'Ben T.', 'Katie L.', 'Owen D.', 'Leah S.', 'Harry V.', 'Fran W.', 'Dev P.', 'Rosie K.', 'Jack E.', 'Imogen C.', 'Tyler B.']
const PLACES = ['Manchester', 'Leeds', 'Sheffield', 'Liverpool', 'Glasgow', 'Bristol', 'Newcastle', 'Nottingham', 'Cardiff', 'Brighton', 'Birmingham',
  'Edinburgh', 'Hull', 'Stockport', 'Salford', 'Leicester', 'Norwich', 'Belfast', 'York', 'Preston', 'London', 'Bolton', 'Wigan', 'Derby']

const TITLES_GOOD = ['Proper heavyweight', 'Exactly what I wanted', 'Better than the original', 'Worth every penny', 'Straight back to \'96', 'Fits like a dream',
  'Go up a size', 'Quality is spot on', 'Second one I\'ve bought', 'Compliments all night', 'Does what it says', 'Ace', 'Sound', 'Will buy again',
  'Lived in it all weekend', 'Nailed it', 'Even better in person', 'My new favourite']
const TITLES_MID = ['Alright', 'Runs big', 'Mixed feelings', 'Not quite', 'Decent, not perfect']
const OPENERS = ['Ordered on the Tuesday, arrived Thursday morning.', 'Had one of these first time round and this is honestly closer to the original than I expected.',
  'Bought this for a gig at the Apollo and got asked where it was from three times.', 'Third thing I\'ve bought from here now.', 'Took a punt on this and glad I did.',
  'Colour is exactly like the photos.', 'Cut is relaxed but not sloppy.', 'Went up a size like the guide says and it\'s spot on.', 'Arrived quicker than expected, nicely packed.',
  'Wore it out of the box the same day.', 'Wasn\'t sure about the fit from the pictures but it\'s bang on.', 'Got this as a birthday present for my brother and he hasn\'t taken it off.']
const DETAILS: Record<Cat, string[]> = {
  tops: ['Nice weight to the cotton, not remotely see-through.', 'Neck hasn\'t bagged out after a few washes.', 'Sleeves sit exactly where they should.', 'Heavier fabric than the fast fashion version I had before, and it shows.'],
  outer: ['Properly warm for the walk to the ground.', 'Pockets are deep and the zip feels solid.', 'The lining is a lovely touch.', 'Shoulders sit right and it layers over a hoodie no bother.'],
  bottoms: ['Waist is true to the label and the leg length is bang on.', 'Rigid to start with but softens up quickly.', 'Hem is the right length on the 32 leg for me at 5\'10.', 'Sits high on the waist like it should.'],
  dresses: ['Hangs really well, no clinging.', 'Hits just above the knee on me, which is what I was after.', 'Straps are adjustable, which helps.', 'Fabric has a bit of weight so it moves nicely.'],
  shoes: ['Platform is comfier than it looks.', 'Grip is decent and the sole is properly chunky.', 'Broke them in over a weekend and no blisters.', 'Ran a touch small for me so I swapped, returns were painless.'],
  acc: ['Exactly as pictured and does the job.', 'Good size, not flimsy.', 'Sat on my head in the rain for a full Parklife and survived.', 'Stitching is neat and the hardware feels solid.'],
}
const CLOSERS = ['No notes.', 'Would buy again.', 'Sizing is consistent, which is rarer than it should be.', 'Washed it twice already and it\'s held up.', 'Recommend.', 'Tempted by the other colour now.']
const MID = ['Decent, but the colour is a touch darker than the photos. Kept it, but worth mentioning.', 'Nice enough. Sizing runs bigger than I expected even after reading the guide.',
  'Good quality, took a while to arrive though. Two working days longer than the estimate.', 'Like it, but the fit is boxier than I wanted. Might swap for a size down.']
const LOW = ['Arrived with a loose thread on the seam. Returns were painless and the replacement was fine, but still.', 'Not for me. Went back, refund landed in a few days.']

function sizeLabel(product: Product, r: () => number): string | null {
  const v = pick(r, product.variants)
  const parts: string[] = []
  for (const o of product.options) {
    const val = v.options[o.name]; if (!val || val === 'One Size') continue
    parts.push(o.name === 'Waist' ? `W${val}` : o.name === 'Leg' ? `L${val}` : o.name === 'UK Size' ? `UK ${val}` : val)
  }
  return parts.length ? parts.join(' ') : null
}

function generate(product: Product): Review[] {
  const r = rng(`reviews:${product.handle}`)
  const cat = CATEGORY[product.type] ?? 'tops'
  const count = product.newIn ? 1 + Math.floor(r() * 5) : 3 + Math.floor(r() * 12)
  const fitOdds: Record<Cat, [number, number]> = { tops: [.08, .70], outer: [.06, .68], bottoms: [.12, .82], dresses: [.10, .90], shoes: [.20, .90], acc: [.05, .95] }
  const fmt = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  const out: Review[] = []
  for (let i = 0; i < count; i++) {
    const x = r()
    const rating = x < .6 ? 5 : x < .88 ? 4 : x < .97 ? 3 : x < .995 ? 2 : 1
    const f = r(); const [small, trueTo] = fitOdds[cat]
    const fit: Fit = f < small ? 'small' : f < trueTo ? 'true' : 'large'
    const body = rating >= 4 ? `${pick(r, OPENERS)} ${pick(r, DETAILS[cat])}${r() < .55 ? ` ${pick(r, CLOSERS)}` : ''}` : rating === 3 ? pick(r, MID) : pick(r, LOW)
    const daysAgo = 1 + Math.floor(r() * (product.newIn ? 40 : 220))
    out.push({
      id: `${product.handle}-${i}`, name: pick(r, NAMES), place: pick(r, PLACES), rating,
      title: rating >= 4 ? pick(r, TITLES_GOOD) : pick(r, TITLES_MID), body, size: sizeLabel(product, r), fit,
      date: fmt.format(new Date(anchor - daysAgo * 864e5)), helpful: Math.floor(r() * 24),
    })
  }
  return out.sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
}

const cache = new Map<string, Review[]>()
let stats: { count: number; average: number } | null = null
let anchor = Date.now()
/** Review dates are relative to this instant. The catalogue loader sets it to the export time so the prerendered
 *  HTML and the browser produce identical dates; tests and the dev server fall back to now. */
export function setReviewAnchor(ms: number) {
  if (!Number.isFinite(ms) || ms === anchor) return
  anchor = ms; cache.clear(); stats = null
}
export function reviewsFor(product: Product): Review[] {
  let list = cache.get(product.handle)
  if (!list) { list = generate(product); cache.set(product.handle, list) }
  return list
}

export function summarise(list: Review[]): ReviewSummary {
  const histogram: [number, number, number, number, number] = [0, 0, 0, 0, 0]
  const fitCount: Record<Fit, number> = { small: 0, true: 0, large: 0 }
  list.forEach((rv) => { histogram[rv.rating - 1]++; fitCount[rv.fit]++ })
  const count = list.length
  const average = count ? Math.round((list.reduce((n, rv) => n + rv.rating, 0) / count) * 10) / 10 : 0
  const pct = (n: number) => (count ? Math.round((n / count) * 100) : 0)
  return { count, average, histogram, fit: { small: pct(fitCount.small), true: pct(fitCount.true), large: pct(fitCount.large) } }
}

export const ratingFor = (product: Product) => summarise(reviewsFor(product))

/** Store-wide totals for the trust strip and footer. */
export function siteStats(products: Product[]) {
  if (!stats) {
    let count = 0, sum = 0
    products.forEach((p) => reviewsFor(p).forEach((rv) => { count++; sum += rv.rating }))
    stats = { count, average: count ? Math.round((sum / count) * 10) / 10 : 0 }
  }
  return stats
}

/** A few long five-star reviews from photographed products, for the home page. */
export function featuredReviews(products: Product[], n = 3): { review: Review; product: Product }[] {
  const r = rng('featured')
  const pool = products.filter((p) => p.images.length).flatMap((p) => reviewsFor(p).filter((rv) => rv.rating === 5 && rv.body.length > 110).map((review) => ({ review, product: p })))
  const out: typeof pool = []
  const seen = new Set<string>()
  while (out.length < n && pool.length) {
    const cand = pool.splice(Math.floor(r() * pool.length), 1)[0]
    if (seen.has(cand.product.handle)) continue
    seen.add(cand.product.handle); out.push(cand)
  }
  return out
}
