import { Link } from 'react-router-dom'
import { config } from '../config'
import { usePageMeta } from '../lib/usePageMeta'
import { money } from '../lib/format'

const SECTIONS: [string, string][] = [
  ['delivery', 'Delivery'], ['returns', 'Returns'], ['sizing', 'Size guide'],
  ['orders', 'Orders & payment'], ['faq', 'Questions'], ['contact', 'Contact'],
]

// Body measurements in inches. Relaxed nineties shapes, so these are generous by modern standards.
const UNISEX = [['XS', '34-36', '28-30'], ['S', '36-38', '30-32'], ['M', '38-40', '32-34'], ['L', '40-42', '34-36'], ['XL', '42-44', '36-38'], ['2XL', '44-46', '38-40']]
const WOMEN = [['UK 6', '31', '24', '34'], ['UK 8', '32', '25', '35'], ['UK 10', '34', '27', '37'], ['UK 12', '36', '29', '39'], ['UK 14', '38', '31', '41'], ['UK 16', '40', '33', '43']]
const SHOES = [['2', '35'], ['3', '36'], ['4', '37'], ['5', '38'], ['6', '39'], ['7', '40.5'], ['8', '42'], ['9', '43'], ['10', '44.5'], ['11', '46'], ['12', '47']]

const d = config.delivery
const FAQ: [string, string][] = [
  ['Where is my order?', `Once it leaves the warehouse you get an email with a tracking link, and the same link sits in your order confirmation. Orders placed before ${d.cutoffHour - 12}pm on a working day are despatched the same day. If nothing has arrived within five working days, email us with your order number and we will chase it.`],
  ['Can I change or cancel an order?', 'If it has not been picked yet, yes. Reply to your confirmation email straight away and we will catch it. Once it has left the warehouse, the easiest route is to return it when it lands.'],
  ['Will you restock sold-out sizes?', 'Usually. We make in small runs and restock what sells rather than discontinuing lines, so a missing size normally comes back within a few weeks. Sign up to the mailing list to hear first.'],
  ['Do you have a shop?', `One, in ${config.brand.city}. ${config.contact.address.join(', ')}, open ${config.contact.shopHours}. Everything on the site is on the rail there too.`],
  ['Do you ship outside the UK?', 'Not yet. UK only for now, including Northern Ireland, the Highlands and the islands at the same rate. Sign up to the newsletter to hear when that changes.'],
  ['What size am I?', 'Check the size guide above. If you are between sizes, go up. The nineties were never about a close fit.'],
  ['How do I look after it?', 'Cold wash, inside out, hang to dry. Denim as little as you can get away with. Anything with a print, no tumble dryer, ever.'],
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
          <p>Everything ships from our own warehouse in {config.brand.warehouse}. UK only, one price wherever you are.</p>
          <Table head={['Service', 'Cost', 'When it arrives']} rows={[
            ['UK standard', `${money(d.standard)}, free over ${money(d.freeOver)}`, '2 to 4 working days'],
            ['UK next day', money(d.nextDay), `Next working day if you order before ${d.cutoffHour - 12}pm, Monday to Friday`],
          ]} />
          <p>You will get an email when your order is despatched, with a tracking link. Standard orders go Royal Mail Tracked 48, next day goes DPD.</p>

          <h2 id="returns">Returns</h2>
          <p>Free returns within {d.returnsDays} days of delivery. Unworn, unwashed and with the tags still on. Print a label from your order page and drop the parcel at any Post Office, or bring it into the shop.</p>
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
          <p>We take {config.payments.slice(0, -1).join(', ')} and {config.payments.at(-1)}. Your card is charged when you place the order, and you can spread the cost over three payments on anything over £30.</p>
          <p>Orders placed before {d.cutoffHour - 12}pm Monday to Friday are picked and packed the same day in {config.brand.warehouse}. Anything after that goes out the next working day. You get one email when the order is confirmed and another when it is on its way, with tracking. Stock on the site is live from the warehouse, so if a size shows as low or sold out, that is the real position.</p>

          <h2 id="faq">Questions</h2>
          <div className="acc">
            {FAQ.map(([q, a], i) => (
              <details key={q} open={i === 0}><summary>{q}</summary><div className="body"><p>{a}</p></div></details>
            ))}
          </div>

          <h2 id="contact">Contact</h2>
          <p>Email <a className="link" href={`mailto:${config.contact.email}`}>{config.contact.email}</a> or call <a className="link" href={`tel:${config.contact.phone.replace(/\s/g, '')}`}>{config.contact.phone}</a>, {config.contact.hours}. We usually reply within one working day, quicker if you include your order number.</p>
          <p>{config.brand.legalName}<br />{config.contact.address.map((l) => <span key={l}>{l}<br /></span>)}</p>
          <p>Prefer to browse? <Link to="/collections/new-in" className="link">Start with what's new</Link>.</p>
        </div>
      </div>
    </div>
  )
}
