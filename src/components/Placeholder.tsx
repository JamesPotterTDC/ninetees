import type { Product } from '../lib/catalogue'

const SWATCH: Record<string, string> = {
  black: '#111', white: '#f6f6f6', navy: '#1d2a4a', olive: '#5a6b3a', khaki: '#a58e5e', mustard: '#d9a51c', lilac: '#c9b3e3',
  tobacco: '#7a4a25', 'baby blue': '#a8cbe8', grey: '#8a8a8f', indigo: '#2a3775', cream: '#f0e8d6', champagne: '#e7d3b1',
  oxblood: '#5a1a22', pink: '#ee5fa2', lime: '#c9ff2f', yellow: '#f5d90a', purple: '#6a2fb3', teal: '#1d9e9e', red: '#d1242f',
  blue: '#1a3cff', green: '#1f6a3a', stone: '#cfc6b4', charcoal: '#3a3a3f', oatmeal: '#d9cdb8', silver: '#c8c8cc', clear: '#d9eef7',
}
function swatch(colour: string | null) {
  const c = (colour ?? '').toLowerCase()
  const hit = Object.keys(SWATCH).find((k) => c.includes(k))
  return hit ? SWATCH[hit] : '#9a9aa0'
}
function hue(s: string) { let h = 0; for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) % 360; return h }

/** Designed stand-in for products still waiting on photography. */
export default function Placeholder({ product, compact = false }: { product: Product; compact?: boolean }) {
  const h = hue(product.handle)
  return (
    <div className="ph" style={{ background: `linear-gradient(160deg, hsl(${h} 25% 92%), hsl(${(h + 40) % 360} 30% 84%))` }} aria-label={`${product.title} image coming soon`}>
      <div className="ph__type" style={compact ? { fontSize: 'clamp(28px, 6vw, 56px)' } : undefined}>{product.type}</div>
      <span className="ph__swatch" style={{ background: swatch(product.colour) }} />
      {!compact && <div className="ph__title">{product.title}<small>Photography coming soon</small></div>}
    </div>
  )
}
