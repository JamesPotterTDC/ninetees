# NineTees

Storefront for **NineTees**, a demonstration nineties UK fashion brand. Britpop, reissued.

- **Site**: static React app (Vite) deployed to GitHub Pages.
- **Catalogue**: `src/data/catalogue.json`, exported from the Shopify store by `scripts/export_catalogue.py`. The site never calls the Admin API.
- **Checkout**: the bag lives in the browser; checkout creates a Shopify cart through the public Storefront API and hands off to Shopify's hosted checkout.
- **Warehouse**: the Shopify store is connected to a Helm WMS sandbox, so test orders flow through picking and despatch.

## Working on it

```bash
npm install
npm run dev              # local dev server
npm run build            # type-check, build to dist/, then write per-route HTML shells, sitemap and robots
npm run lint             # oxlint
npm test                 # unit tests (Vitest) for the catalogue helpers, reviews and despatch countdown
npm run e2e              # Playwright smoke test against the built site (run npm run build first)
npm run serve            # serve dist/ like GitHub Pages does, at http://127.0.0.1:4173/
```

The deploy workflow runs lint, unit tests, build and the browser suite before publishing. `refresh-catalogue.yml` re-exports the catalogue from Shopify every morning and redeploys if anything changed; it needs a `SHOPIFY_ADMIN_TOKEN` repository secret.

- **Catalogue at runtime**: `src/lib/catalogue.ts` fetches the exported JSON as its own hashed asset (top-level await) and builds the lookups in `catalogue-core.ts`, which is what the unit tests import.
- **Prerender**: the build also compiles `src/entry-server.tsx` (`vite build --ssr`) and `scripts/prerender.mjs` renders every product, collection and static page to full HTML, body included, with its own title, description, Open Graph tags, image preload and JSON-LD (Product, BreadcrumbList, Organization). The browser hydrates that HTML. GitHub Pages serves `products/<handle>.html` at `/products/<handle>`; `npm run serve` mimics that locally and is what the Playwright suite runs against.
- **Hydration rule**: anything that depends on the browser (bag contents, recently viewed, the despatch countdown, live stock) is read after mount, never during the first render, so the prerendered HTML and the first client render match. Review dates hang off the catalogue's export time for the same reason.
- **Reviews** are generated deterministically per product in `src/lib/reviews.ts`.

Set `VITE_SHOPIFY_STOREFRONT_TOKEN` (a public Storefront API token) to enable checkout. In GitHub it is a repository variable named `SHOPIFY_STOREFRONT_TOKEN`.

## Catalogue scripts

The Admin API token lives outside the repo in `~/.config/helm/shopify-ninetees.env`.

```bash
python3 scripts/catalogue.py                       # validate the catalogue source
python3 scripts/load_shopify.py --only 90S-001     # upsert one product
python3 scripts/load_shopify.py                    # upsert everything
python3 scripts/load_shopify.py --collections      # (re)build smart collections
python3 scripts/export_catalogue.py                # refresh src/data/catalogue.json
python3 scripts/publish_channel.py                 # publish new products/collections to the Online Store channel (Storefront API visibility)
```

`scripts/catalogue.py` is the single source of truth: 73 products, UK size schemes, copy and tags. Existing Helm-linked SKUs (`90S-001` to `90S-050`) keep their bare SKU on the original size; every other size is `SKU-<size>`.

Every order placed on the site is a test order. Nothing is charged and nothing is shipped.
