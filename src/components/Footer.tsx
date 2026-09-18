import { Link } from 'react-router-dom'
import { config } from '../config'
import Stars from './Stars'
import { siteStats } from '../lib/reviews'

export default function Footer() {
  const stats = siteStats()
  return (
    <footer className="ftr">
      <div className="wrap ftr__grid">
        <div>
          <img className="ftr__mark" src={`${config.brand.markUrl}&width=240`} alt="" width="96" height="96" loading="lazy" />
          <div className="logo">{config.brand.name.toUpperCase()} <small>EST. {config.brand.est}</small></div>
          <p>{config.brand.strap} Only ever the nineties, only ever from {config.brand.city}. Parkas, platforms and a bit of swagger, cut properly.</p>
          <div className="ftr__social">
            <Link to="/#wearing">Instagram {config.social.instagram}</Link>
            <Link to="/#wearing">TikTok {config.social.tiktok}</Link>
          </div>
          <p className="ftr__rating"><Stars rating={stats.average} size={12} /> {stats.average.toFixed(1)} from {stats.count.toLocaleString('en-GB')} reviews</p>
        </div>
        <div>
          <h4>Shop</h4>
          <ul>
            <li><Link to="/collections/new-in">New In</Link></li>
            <li><Link to="/collections/women">Women</Link></li>
            <li><Link to="/collections/men">Men</Link></li>
            <li><Link to="/collections/the-britpop-edit">The Britpop Edit</Link></li>
            <li><Link to="/collections/rave">Rave &amp; Madchester</Link></li>
          </ul>
        </div>
        <div>
          <h4>Help</h4>
          <ul>
            <li><Link to="/help">Help &amp; FAQ</Link></li>
            <li><Link to="/help#delivery">Delivery &amp; returns</Link></li>
            <li><Link to="/help#orders">Where's my order?</Link></li>
            <li><Link to="/help#sizing">Size guide</Link></li>
            <li><Link to="/help#contact">Contact us</Link></li>
          </ul>
        </div>
        <div>
          <h4>Company</h4>
          <ul>
            <li><Link to="/about">Our story</Link></li>
            <li><Link to="/about#shop">Our shop</Link></li>
            <li><Link to="/#newsletter">Newsletter</Link></li>
            <li><Link to="/bag">Your bag</Link></li>
          </ul>
        </div>
      </div>
      <div className="wrap ftr__bar">
        <span><i className="ftr__flag" />© {new Date().getFullYear()} {config.brand.legalName}. Designed in {config.brand.city}, packed in {config.brand.warehouse}.</span>
        <ul className="pay" aria-label="Payment methods">{config.payments.map((p) => <li key={p}>{p}</li>)}</ul>
        <span>Fulfilment powered by <span className="helm">{config.fulfilment}</span></span>
      </div>
    </footer>
  )
}
