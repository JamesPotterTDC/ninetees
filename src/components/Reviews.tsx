import { useMemo, useState, type FormEvent } from 'react'
import Stars from './Stars'
import { reviewsFor, summarise } from '../lib/reviews'
import type { Product } from '../lib/catalogue'

export default function Reviews({ product }: { product: Product }) {
  const list = useMemo(() => reviewsFor(product), [product])
  const summary = useMemo(() => summarise(list), [list])
  const [shown, setShown] = useState(4)
  const [writing, setWriting] = useState(false)
  const [sent, setSent] = useState(false)
  const [voted, setVoted] = useState<Set<string>>(() => new Set())
  const [stars, setStars] = useState(5)

  const submit = (e: FormEvent) => { e.preventDefault(); setSent(true); setWriting(false) }
  const vote = (id: string) => setVoted((v) => { const next = new Set(v); next.add(id); return next })

  return (
    <section className="reviews" id="reviews">
      <div className="section__head">
        <div><p className="eyebrow">Reviews</p><h2 className="display">What people say</h2></div>
        {!writing && !sent && <button type="button" className="btn btn--ghost" onClick={() => setWriting(true)}>Write a review</button>}
      </div>
      <div className="reviews__grid">
        <aside className="reviews__summary">
          <div className="reviews__avg">{summary.average.toFixed(1)}</div>
          <Stars rating={summary.average} size={18} />
          <p className="small">Based on {summary.count} review{summary.count === 1 ? '' : 's'}</p>
          <ul className="hist">
            {[5, 4, 3, 2, 1].map((star) => {
              const n = summary.histogram[star - 1]
              return (
                <li key={star}><span>{star}★</span><span className="hist__bar"><span style={{ width: `${summary.count ? (n / summary.count) * 100 : 0}%` }} /></span><span>{n}</span></li>
              )
            })}
          </ul>
          {summary.count > 0 && (
            <div className="fitbar">
              <p className="eyebrow">Fit</p>
              <div className="fitbar__track"><span style={{ width: `${summary.fit.small}%` }} /><span style={{ width: `${summary.fit.true}%` }} /><span style={{ width: `${summary.fit.large}%` }} /></div>
              <div className="fitbar__labels"><span>Runs small</span><span>True to size</span><span>Runs large</span></div>
              <p className="small">{summary.fit.true}% say it fits true to size</p>
            </div>
          )}
        </aside>
        <div className="reviews__list">
          {sent && <div className="review-form"><p style={{ fontWeight: 600 }}>Thanks. We read every review before it goes live, so yours will appear within a day or two.</p></div>}
          {writing && (
            <form className="review-form" onSubmit={submit}>
              <div className="rate" role="radiogroup" aria-label="Your rating">
                {[1, 2, 3, 4, 5].map((n) => <button key={n} type="button" className={n <= stars ? 'on' : ''} onClick={() => setStars(n)} aria-label={`${n} star${n === 1 ? '' : 's'}`} aria-pressed={n === stars}>★</button>)}
              </div>
              <input required placeholder="Title your review" aria-label="Review title" />
              <textarea required placeholder="What did you think? How was the fit?" aria-label="Your review" />
              <input required placeholder="Your name" aria-label="Your name" />
              <div className="hero__cta" style={{ marginTop: 0 }}>
                <button type="submit" className="btn">Submit review</button>
                <button type="button" className="btn btn--ghost" onClick={() => setWriting(false)}>Cancel</button>
              </div>
            </form>
          )}
          {list.slice(0, shown).map((rv) => (
            <article className="review" key={rv.id}>
              <div className="review__head"><Stars rating={rv.rating} size={13} /><span className="review__title">{rv.title}</span></div>
              <div className="review__meta">
                <span>{rv.name}, {rv.place}</span><span className="verified">✓ Verified buyer</span><span>{rv.date}</span>
                {rv.size && <span>Bought {rv.size}</span>}
                <span>{rv.fit === 'true' ? 'True to size' : rv.fit === 'large' ? 'Runs large' : 'Runs small'}</span>
              </div>
              <p>{rv.body}</p>
              <div className="review__foot">
                <button type="button" onClick={() => vote(rv.id)} disabled={voted.has(rv.id)}>Helpful ({rv.helpful + (voted.has(rv.id) ? 1 : 0)})</button>
              </div>
            </article>
          ))}
          {shown < list.length && <button type="button" className="btn btn--ghost btn--more" onClick={() => setShown((s) => s + 6)}>Show more reviews</button>}
        </div>
      </div>
    </section>
  )
}
