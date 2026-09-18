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
npm run build            # type-check and build to dist/
```

Set `VITE_SHOPIFY_STOREFRONT_TOKEN` (a public Storefront API token) to enable checkout. In GitHub it is a repository variable named `SHOPIFY_STOREFRONT_TOKEN`.

## Catalogue scripts

The Admin API token lives outside the repo in `~/.config/helm/shopify-ninetees.env`.

```bash
python3 scripts/catalogue.py                       # validate the catalogue source
python3 scripts/load_shopify.py --only 90S-001     # upsert one product
python3 scripts/load_shopify.py                    # upsert everything
python3 scripts/load_shopify.py --collections      # (re)build smart collections
python3 scripts/export_catalogue.py                # refresh src/data/catalogue.json
```

`scripts/catalogue.py` is the single source of truth: 73 products, UK size schemes, copy and tags. Existing Helm-linked SKUs (`90S-001` to `90S-050`) keep their bare SKU on the original size; every other size is `SKU-<size>`.

Every order placed on the site is a test order. Nothing is charged and nothing is shipped.
