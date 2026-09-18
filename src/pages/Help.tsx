import { Link } from 'react-router-dom'
import { config } from '../config'
import { usePageMeta } from '../lib/usePageMeta'

const SECTIONS: [string, string][] = [
  ['delivery', 'Delivery'], ['returns', 'Returns'], ['sizing', 'Size guide'],
  ['orders', 'Orders & payment'], ['faq', 'Questions'], ['contact', 'Contact'],
]

// Body measurements in inches. Relaxed nineties shapes, so these are generous by modern standards.
const UNISEX = [['XS', '34-36', '28-30'], ['S', '36-38', '30-32'], ['M', '38-40', '32-34'], ['L', '40-42', '34-36'], ['XL', '42-44', '36-38'], ['2XL', '44-46', '38-40']]
const WOMEN = [['UK 6', '31', '24', '34'], ['UK 8', '32', '25', '35'], ['UK 10', '34', '27', '37'], ['UK 12', '36', '29', '39'], ['UK 14', '38', '31', '41'], ['UK 16', '40', '33', '43']]
const SHOES = [['2', '35'], ['3', '36'], ['4', '37'], ['5', '38'], ['6', '39'], ['7', '40.5'], ['8', '42'], ['9', '43'], ['10', '44.5'], ['11', '46'], ['12', '47']]

const FAQ: [string, string][] = [
  ['Are the clothes real?', `No. ${config.brand.name} is a demonstration brand. The photography is generated, the stock is imaginary and the nostalgia is entirely genuine.`],
  ['Will I be charged?', 'No. Every order is a test order. Nothing is charged and nothing is shipped. The order exists to show how the shop, the warehouse and the stock system talk to each other.'],
  ['What happens after I order?', 'Your order lands in a real warehouse system within a minute or two, where it is picked, packed and marked as despatched on screen. Then, because none of it is real, nothing turns up.'],
  ['Why does the checkout look like Shopify?', 'Because it is Shopify. The shop front is ours, the till is theirs. It is the same checkout a real independent label would use.'],
  ['Do you ship outside the UK?', 'UK only, in the story. Everywhere else can wait for the reunion tour.'],
  ['What size am I?', 'Check the size guide above. If you are between sizes, go up. The nineties were never about a close fit.'],
]

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead><tr>{head.map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
        <tbody>{rows.map((r) => <tr key={r[0]}>{r.map((c, i) => <td key={i}>{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  )
}

export default function Help() {
  usePageMeta('Help & FAQ', 'Delivery, returns, sizing and everything else you might want to know before you order from NineTees.')
  return (
    <div className="wrap" style={{ paddingBottom: 96 }}>
      <h1 className="display page-title">Help</h1>
      <div className="help-grid">
        <nav className="help-nav" aria-label="On this page">
          {SECTIONS.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}
        </nav>
        <div className="prose">
          <p>Everything you need before you order, and a few things you did not ask about. If you are after the story behind the brand, that is over on <Link to="/about" className="link">Our story</Link>.</p>

          <h2 id="delivery">Delivery</h2>
          <p>Everything ships from our warehouse in Yorkshire. UK only.</p>
          <Table head={['Service', 'Cost', 'When it arrives']} rows={[
            ['UK standard', '£3.95, free over £75', '2 to 4 working days'],
            ['UK next day', '£6.95', 'Next working day if you order before 2pm, Monday to Friday'],
          ]} />
          <p>You will get an email when your order is despatched, with tracking where the service supports it.</p>

          <h2 id="returns">Returns</h2>
          <p>Free returns within 28 days of delivery. Unworn, unwashed and with the tags still on. Print a label from your order page and drop the parcel at any Post Office.</p>
          <p>Refunds land within five working days of the parcel reaching us. If you need a different size, the quickest route is to order the new one and send the old one back.</p>

          <h2 id="sizing">Size guide</h2>
          <p>The shapes are faithful to the nineties, which means relaxed. Measurements below are body measurements in inches, not garment measurements. If you are between sizes, go up.</p>
          <h3>Unisex tops, outerwear and sportswear</h3>
          <Table head={['Size', 'To fit chest', 'To fit waist']} rows={UNISEX} />
          <h3>Women's pieces</h3>
          <Table head={['Size', 'Bust', 'Waist', 'Hips']} rows={WOMEN} />
          <h3>Men's jeans, trousers and shorts</h3>
          <p>Waist 30 to 38 in even sizes, with a 30, 32 or 34 inch inside leg. The waist is the number on the label, measured flat across the top of the waistband. A 32 leg is our standard.</p>
          <h3>Footwear</h3>
          <p>Platforms and trainers are unisex, so order your usual UK size. If you are between sizes, go up.</p>
          <Table head={['UK', 'EU']} rows={SHOES} />
          <h3>Hats</h3>
          <p>S/M fits up to 57cm around the head. L/XL fits 58cm and over. One Size fits most, which is what everyone says.</p>

          <h2 id="orders">Orders &amp; payment</h2>
          <p>Every order placed here is a test order. Checkout is handled by Shopify, so it looks and behaves like the real thing, but nothing is charged and nothing is shipped.</p>
          <p>Behind the till, the order flows straight into a live warehouse system where it is picked, packed and despatched on screen. Stock levels on the site are real numbers from that warehouse. If a size shows as low stock or sold out, that is because the warehouse says so.</p>

          <h2 id="faq">Questions</h2>
          <div className="acc">
            {FAQ.map(([q, a], i) => (
              <details key={q} open={i === 0}><summary>{q}</summary><div className="body"><p>{a}</p></div></details>
            ))}
          </div>

          <h2 id="contact">Contact</h2>
          <p>There is no customer service team, because there are no customers. If someone sent you this link, they are your best bet for questions about the shop, the warehouse behind it or how the two talk to each other.</p>
          <p>Prefer to browse? <Link to="/collections/new-in" className="link">Start with what's new</Link>.</p>
        </div>
      </div>
    </div>
  )
}
