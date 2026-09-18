import { Link } from 'react-router-dom'
import { usePageMeta } from '../lib/usePageMeta'

export default function NotFound() {
  usePageMeta('Page not found')
  return (
    <div className="wrap" style={{ padding: '80px 0 120px' }}>
      <p className="eyebrow">404</p>
      <h1 className="display" style={{ fontSize: 'clamp(48px, 9vw, 130px)' }}>Lost in the nineties</h1>
      <p style={{ marginTop: 16, fontSize: 17 }}>That page never existed, or it went the way of the Hacienda. <Link to="/" className="link">Back to the shop</Link>.</p>
    </div>
  )
}
