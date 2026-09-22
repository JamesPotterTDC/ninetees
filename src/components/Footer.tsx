import { Link } from 'react-router-dom'
import { config } from '../config'
import Stars from './Stars'
import { siteStats } from '../lib/reviews'
import logo from '../assets/brand/logo-bone.svg'
import { products } from '../lib/catalogue'

export default function Footer() {
  const stats = siteStats(products)
  return (
    <footer className="ftr">
      <div className="wrap ftr__grid">
        <div>
          <img className="ftr__logo" src={logo} alt={`${config.brand.name}, est. ${config.brand.est}, ${config.brand.city}`} width="240" height="151" loading="lazy" />
          <p>{config.brand.strap} Only ever the nineties, only ever from {config.brand.city}. Parkas, platforms and a bit of swagger, cut properly.</p>
          <div className="ftr__social">
            <a href={config.social.instagram.url} target="_blank" rel="noopener">Instagram {config.social.instagram.handle}</a>
            <a href={config.social.tiktok.url} target="_blank" rel="noopener">TikTok {config.social.tiktok.handle}</a>
          </div>
          <p className="ftr__rating"><Stars rating={stats.average} size={12} /> {stats.average.toFixed(1)} from {stats.count.toLocaleString('en-GB')} reviews</p>
        </div>
        <div>
          <h3>Shop</h3>
          <ul>
            <li><Link to="/collections/new-in">New In</Link></li>
            <li><Link to="/collections/women">Women</Link></li>
            <li><Link to="/collections/men">Men</Link></li>
            <li><Link to="/collections/the-britpop-edit">The Britpop Edit</Link></li>
            <li><Link to="/collections/rave">Rave &amp; Madchester</Link></li>
          </ul>
        </div>
        <div>
          <h3>Help</h3>
          <ul>
            <li><Link to="/help">Help &amp; FAQ</Link></li>
            <li><Link to="/help#delivery">Delivery &amp; returns</Link></li>
            <li><Link to="/help#orders">Where's my order?</Link></li>
            <li><Link to="/help#sizing">Size guide</Link></li>
            <li><Link to="/help#contact">Contact us</Link></li>
          </ul>
        </div>
        <div>
          <h3>Company</h3>
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
