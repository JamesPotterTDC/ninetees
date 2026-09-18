/** Five stars with a fractional fill, sized by font-size. */
export default function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  const pct = (Math.max(0, Math.min(5, rating)) / 5) * 100
  return (
    <span className="stars" style={{ fontSize: size }} role="img" aria-label={`${rating.toFixed(1)} out of 5 stars`}>
      <span aria-hidden="true">★★★★★</span>
      <span className="stars__fill" aria-hidden="true" style={{ width: `${pct}%` }}>★★★★★</span>
    </span>
  )
}
