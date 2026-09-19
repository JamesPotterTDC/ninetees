// Rebuilds the NineTees logo as vector SVG from the site's own fonts, then writes every variant.
// Geometry constants are proportions of the wordmark width (measured from the approved reference).
import { createRequire } from 'node:module'
import { writeFileSync, mkdirSync } from 'node:fs'
const fontkit = createRequire(import.meta.url)('fontkit')

const FONTS = '/Users/jamespotterdc/ninetees/src/assets/fonts/'
const anton = fontkit.openSync(FONTS + 'anton-400-latin.woff2')
const interVar = fontkit.openSync(FONTS + 'inter-tight-300-800-latin.woff2')
// Google's subset woff2 gives fontkit a variation instance without cmap/hhea, so lay out with the base font and
// borrow only the heavier outlines from the instance; if even that fails, thicken the base outlines with a stroke.
let heavy = null
try { heavy = interVar.getVariation({ wght: 600 }); heavy.getGlyph(interVar.layout('M').glyphs[0].id).path.toSVG() } catch { heavy = null }
const inter = { base: interVar, glyphs: heavy, stroke: heavy ? 0 : 0.035 }

export const C = { ink: '#0A0A0B', bone: '#F3EFE6', blue: '#1A3CFF', red: '#E0202B', acid: '#C9FF2F' }

// ---- proportions (fractions of wordmark width W); tuned from the reference measurements
export const P = {
  wordAspect: 2.243,     // wordmark width / cap height (Anton natural is 3.86, so the letters are stretched vertically)
  wordTracking: -0.035,  // Anton set tighter than its natural spacing, in em
  stripeGap: 19 / 978,   // gap between wordmark baseline and first stripe
  stripeH: 30 / 978,     // height of each stripe
  captionGap: 36 / 978,  // gap between last stripe and caption cap top
  captionCap: 27 / 978,  // caption cap height
  captionLeftW: 365 / 978,   // width of "EST. 1994" (two runs: EST. left-aligned, 1994 right-aligned to this)
  captionRightW: 471 / 978,  // width of "MANCHESTER", right-aligned to the wordmark
}

/** Glyph outlines for a string at a given cap height, as <path>s. Returns { svg, width } in user units.
 *  `face` is a fontkit font, or { base, glyphs, stroke } to lay out with one font and draw with another. */
function text(face, str, capHeight, trackingEm = 0) {
  const base = face.base ?? face
  const s = capHeight / base.capHeight              // user units per font unit, so the cap height matches
  const track = trackingEm * base.unitsPerEm * s
  const run = base.layout(str)
  let x = 0; const parts = []
  run.glyphs.forEach((g, i) => {
    const glyph = face.glyphs ? face.glyphs.getGlyph(g.id) : g
    const d = glyph.path.toSVG()
    const stroke = face.stroke ? ` stroke="currentColor" stroke-width="${(face.stroke * base.unitsPerEm).toFixed(1)}" stroke-linejoin="round"` : ''
    if (d) parts.push(`<path d="${d}"${stroke} transform="translate(${x.toFixed(3)} 0) scale(${s.toFixed(6)} ${(-s).toFixed(6)})"/>`)
    x += run.positions[i].xAdvance * s + (i < run.glyphs.length - 1 ? track : 0)
  })
  return { svg: parts.join(''), width: x }
}
/** Tracking (em) that makes `str` exactly `target` wide at `capHeight`. */
function trackingFor(font, str, capHeight, target) {
  const natural = text(font, str, capHeight, 0).width
  const gaps = (font.base ?? font).layout(str).glyphs.length - 1
  const base = font.base ?? font
  return (target - natural) / gaps / (base.unitsPerEm * capHeight / base.capHeight)
}

/** The full lockup laid out on a wordmark of width W with its top-left at (0,0). Returns svg fragments and total height. */
export function lockup(W, { fill = C.bone, stripes = 'colour', caption = true, bar = true, aspect = P.wordAspect } = {}) {
  // wordmark: natural width at cap height h is (advance/capHeight)*h; we want width W and height W/wordAspect
  const capH = W / aspect
  const wm = text(anton, 'NINETEES', 1, P.wordTracking)   // at cap height 1, then scaled: x to fit W, y to capH
  const sx = W / wm.width
  let y = capH
  const out = [`<g fill="${fill}" transform="translate(0 ${capH.toFixed(2)}) scale(${sx.toFixed(6)} ${capH.toFixed(6)})">${wm.svg}</g>`]
  if (bar) {
    y += P.stripeGap * W
    const h = P.stripeH * W
    const colours = stripes === 'colour' ? [C.blue, C.bone, C.red] : stripes === 'light' ? [C.blue, null, C.red] : [fill, null, fill]
    colours.forEach((c, i) => { if (c) out.push(`<rect x="0" y="${(y + i * h).toFixed(2)}" width="${W}" height="${h.toFixed(2)}" fill="${c}"/>`) })
    y += 3 * h
  }
  if (caption) {
    y += P.captionGap * W
    const cap = P.captionCap * W
    const tr = trackingFor(inter, 'MANCHESTER', cap, P.captionRightW * W)
    const est = text(inter, 'EST.', cap, tr), year = text(inter, '1994', cap, tr), city = text(inter, 'MANCHESTER', cap, tr)
    const baseline = (y + cap).toFixed(2)
    out.push(`<g fill="${fill}" color="${fill}" transform="translate(0 ${baseline})">${est.svg}</g>`)
    out.push(`<g fill="${fill}" color="${fill}" transform="translate(${(P.captionLeftW * W - year.width).toFixed(2)} ${baseline})">${year.svg}</g>`)
    out.push(`<g fill="${fill}" color="${fill}" transform="translate(${(W - city.width).toFixed(2)} ${baseline})">${city.svg}</g>`)
    y += cap
  }
  return { svg: out.join('\n'), height: y }
}

/** Square monogram device: NT in Anton with the tricolour bar, on an optional ink square. */
export function device(S, { fill = C.bone, bg = C.ink, stripes = 'colour' } = {}) {
  const pad = S * 0.12
  const W = S - 2 * pad
  const capH = W / 1.45                                   // NT is two letters, keep the same stretched feel
  const mono = text(anton, 'NT', 1, 0.02)
  const sx = W / mono.width
  const h = S * 0.045
  const gap = S * 0.05
  const total = capH + gap + 3 * h
  const top = (S - total) / 2
  const out = []
  if (bg) out.push(`<rect width="${S}" height="${S}" fill="${bg}"/>`)
  out.push(`<g fill="${fill}" transform="translate(${pad} ${(top + capH).toFixed(2)}) scale(${sx.toFixed(6)} ${capH.toFixed(6)})">${mono.svg}</g>`)
  const colours = stripes === 'colour' ? [C.blue, C.bone, C.red] : stripes === 'light' ? [C.blue, null, C.red] : [fill, null, fill]
  colours.forEach((c, i) => { if (c) out.push(`<rect x="${pad}" y="${(top + capH + gap + i * h).toFixed(2)}" width="${W}" height="${h.toFixed(2)}" fill="${c}"/>`) })
  return out.join('\n')
}

export function svgDoc(w, h, body, bg = null) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w.toFixed(2)} ${h.toFixed(2)}" width="${Math.round(w)}" height="${Math.round(h)}">\n${bg ? `<rect width="${w}" height="${h}" fill="${bg}"/>\n` : ''}${body}\n</svg>\n`
}

const OUT = new URL('./out/', import.meta.url).pathname
mkdirSync(OUT, { recursive: true })
const W = 1000, m = 80   // wordmark width and margin in user units

const variants = []
function add(name, w, h, body, bg = null) { const svg = svgDoc(w, h, body, bg); writeFileSync(OUT + name + '.svg', svg); variants.push({ name, w, h }) }

// 1. full lockup for dark backgrounds (transparent), plus the same on ink for previews / og image
{ const l = lockup(W); add('ninetees-logo-bone', W + 2 * m, l.height + 2 * m, `<g transform="translate(${m} ${m})">${l.svg}</g>`) }
{ const l = lockup(W); add('ninetees-logo-on-ink', W + 2 * m, l.height + 2 * m, `<g transform="translate(${m} ${m})">${l.svg}</g>`, C.ink) }
// 2. full lockup for light backgrounds
{ const l = lockup(W, { fill: C.ink, stripes: 'light' }); add('ninetees-logo-ink', W + 2 * m, l.height + 2 * m, `<g transform="translate(${m} ${m})">${l.svg}</g>`) }
// 3. wordmark alone (bone), and wordmark with bar
{ const l = lockup(W, { caption: false, bar: false }); add('ninetees-wordmark-bone', W + 2 * m, l.height + 2 * m, `<g transform="translate(${m} ${m})">${l.svg}</g>`) }
{ const l = lockup(W, { fill: C.ink, caption: false, bar: false }); add('ninetees-wordmark-ink', W + 2 * m, l.height + 2 * m, `<g transform="translate(${m} ${m})">${l.svg}</g>`) }
{ const l = lockup(W, { caption: false }); add('ninetees-wordmark-bar-bone', W + 2 * m, l.height + 2 * m, `<g transform="translate(${m} ${m})">${l.svg}</g>`) }
// 4. square device in colour on ink, and transparent
add('ninetees-icon', 1000, 1000, device(1000))
add('ninetees-icon-transparent', 1000, 1000, device(1000, { bg: null }))
// 5. single colour device
add('ninetees-icon-mono-ink', 1000, 1000, device(1000, { fill: C.ink, bg: null, stripes: 'mono' }))
add('ninetees-icon-mono-bone', 1000, 1000, device(1000, { fill: C.bone, bg: null, stripes: 'mono' }))

// 7. tight-cropped web set (no margin): the site's header and footer size these by CSS
{ const l = lockup(W, { fill: C.ink, caption: false, bar: false }); add('web-wordmark-ink', W, l.height, l.svg) }
{ const l = lockup(W, { caption: false, bar: false }); add('web-wordmark-bone', W, l.height, l.svg) }
{ const l = lockup(W, { fill: C.ink, caption: false, stripes: 'light' }); add('web-wordmark-bar-ink', W, l.height, l.svg) }
{ const l = lockup(W); add('web-logo-bone', W, l.height, l.svg) }

// 8. header cut: less vertical stretch so the letters read at 40-50px tall (the full logo keeps the tall proportions)
{ const l = lockup(W, { fill: C.ink, caption: false, bar: false, aspect: 3.2 }); add('web-wordmark-ink-header', W, l.height, l.svg) }
{ const l = lockup(W, { caption: false, bar: false, aspect: 3.2 }); add('web-wordmark-bone-header', W, l.height, l.svg) }

// 6. social preview (Open Graph) card: the lockup centred on ink at 1200x630
{ const lw = 760; const l = lockup(lw); add('ninetees-og', 1200, 630, `<g transform="translate(${(1200 - lw) / 2} ${((630 - l.height) / 2).toFixed(2)})">${l.svg}</g>`, C.ink) }

writeFileSync(OUT + 'variants.json', JSON.stringify(variants, null, 2))
console.log('wrote', variants.map((v) => `${v.name} (${Math.round(v.w)}x${Math.round(v.h)})`).join('\n       '))
