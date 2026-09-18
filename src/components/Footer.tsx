import { Link } from 'react-router-dom'
import { config } from '../config'

export default function Footer() {
  return (
    <footer className="ftr">
      <div className="wrap ftr__grid">
        <div>
          <div className="logo">{config.brand.name.toUpperCase()} <small>EST. {config.brand.est}</small></div>
          <p>{config.brand.strap} Only ever the nineties, only ever from {config.brand.city}. Parkas, platforms and a bit of swagger, cut properly.</p>
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
            <li><Link to="/about">Our story</Link></li>
            <li><Link to="/about#delivery">Delivery &amp; returns</Link></li>
            <li><Link to="/about#sizing">Size guide</Link></li>
            <li><Link to="/bag">Your bag</Link></li>
          </ul>
        </div>
        <div>
          <h4>Follow</h4>
          <ul>
            <li><span>Instagram</span></li>
            <li><span>TikTok</span></li>
            <li><span>Newsletter</span></li>
          </ul>
        </div>
      </div>
      <div className="wrap ftr__bar">
        <span><i className="ftr__flag" />© {new Date().getFullYear()} {config.brand.name}. Designed in {config.brand.city}.</span>
        <span>Demonstration store. Every order is a test order: nothing is charged and nothing is shipped.</span>
      </div>
    </footer>
  )
}
