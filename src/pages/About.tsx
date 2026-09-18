import { config } from '../config'

export default function About() {
  return (
    <div className="wrap" style={{ paddingBottom: 96 }}>
      <h1 className="display page-title">Our story</h1>
      <div className="prose">
        <p>{config.brand.name} started in {config.brand.est} in a lock-up off Oldham Street, {config.brand.city}, with a rail of second-hand parkas, a box of bucket hats and one rule: if it isn't the nineties, we don't sell it.</p>
        <p>Thirty years on, the rule still stands. We never widened the range, never chased a trend that hadn't already happened, and never once stocked anything from the noughties. What changed is how we make it. The shapes are faithful to the originals, but the fabrics are heavier, the fits are cut for real bodies and the size ranges are the ones the high street should have offered in 1996.</p>
        <h2>What we make</h2>
        <p>Harringtons and fishtail parkas for the terraces. Baby tees, slip dresses and platforms for the dancefloor. Baggy denim, shell suits and tie-dye for the field at four in the morning. Every piece is designed in {config.brand.city} and packed in Yorkshire.</p>
        <h2 id="sizing">Sizing</h2>
        <p>Unisex tops run XS to 2XL. Women's pieces use UK dress sizes 6 to 16. Men's trousers come in waist 30 to 38 and leg 30 to 34. Footwear runs UK 2 to 12 depending on the style. If you are between sizes, go up: the nineties were never about a close fit.</p>
        <h2 id="delivery">Delivery and returns</h2>
        <p>UK standard delivery is £3.95, or free on orders over £75. Next-day is £6.95 if you order before 2pm. Returns are free within 28 days, unworn and with the tags on.</p>
        <h2>The honest bit</h2>
        <p>{config.brand.name} is a demonstration brand. It exists to show what a modern independent label looks like when its shop, its warehouse and its stock all talk to each other properly. Every order placed here is a test order: nothing is charged and nothing is shipped. The clothes, sadly, are not real. The nostalgia is.</p>
      </div>
    </div>
  )
}
