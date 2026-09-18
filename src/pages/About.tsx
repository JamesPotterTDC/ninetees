import { Link } from 'react-router-dom'
import { config } from '../config'
import { usePageMeta } from '../lib/usePageMeta'

export default function About() {
  usePageMeta('Our story', `${config.brand.name} started in ${config.brand.est} in ${config.brand.city} with one rule: if it isn't the nineties, we don't sell it. Thirty years on, the rule still stands.`)
  return (
    <div className="wrap" style={{ paddingBottom: 96 }}>
      <h1 className="display page-title">Our story</h1>
      <div className="about-grid">
      <div className="prose">
        <p>{config.brand.name} started in {config.brand.est} in a lock-up off Oldham Street, {config.brand.city}, with a rail of second-hand parkas, a box of bucket hats and one rule: if it isn't the nineties, we don't sell it.</p>
        <p>Thirty years on, the rule still stands. We never widened the range, never chased a trend that hadn't already happened, and never once stocked anything from the noughties. What changed is how we make it. The shapes are faithful to the originals, but the fabrics are heavier, the fits are cut for real bodies and the size ranges are the ones the high street should have offered in 1996.</p>
        <h2>What we make</h2>
        <p>Harringtons and fishtail parkas for the terraces. Baby tees, slip dresses and platforms for the dancefloor. Baggy denim, shell suits and tie-dye for the field at four in the morning. Every piece is designed in {config.brand.city} and picked, packed and posted from our own warehouse in {config.brand.warehouse}.</p>
        <h2>How we make it</h2>
        <p>Heavyweight cottons, proper rigid denim and hardware that outlasts the reunion tour. We make in small runs and restock what sells rather than chasing volume, so if a size is gone it usually comes back rather than being discontinued. Buy one, keep it for a decade. That was always the point.</p>
        <h2 id="shop">Our shop</h2>
        <p>We still have the one shop, a few doors along from where we started. {config.contact.address.join(', ')}. Open {config.contact.shopHours}. Come and try things on, and bring the old one if you want to compare.</p>
        <h2>The practical bit</h2>
        <p>Sizing, delivery, returns and the questions we get asked most all live on the <Link to="/help" className="link">Help page</Link>. Short version: if you are between sizes, go up. The nineties were never about a close fit.</p>
      </div>
      <aside className="about-mark"><img src={`${config.brand.markUrl}&width=900`} alt="NineTees brand mark" /></aside>
      </div>
    </div>
  )
}
