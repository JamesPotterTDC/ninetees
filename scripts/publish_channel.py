"""Publish every active product and every collection to the Online Store channel.

The Storefront API (which the site uses for checkout and live stock) only sees what is published to
the Online Store. Products created by load_shopify.py start unpublished, so run this after loading
new lines. Idempotent: anything already published is skipped.

    python3 scripts/publish_channel.py            # publish whatever is missing
    python3 scripts/publish_channel.py --dry-run  # just list what would change
"""
import sys, time, os
sys.path.insert(0, os.path.dirname(__file__))
from shopify_client import Shopify

PUBLICATION_NAME = "Online Store"
PRODUCTS_Q = """query($first:Int!,$after:String){ products(first:$first,after:$after,query:"status:active"){
  pageInfo{hasNextPage endCursor} nodes{ id handle publishedAt } } }"""
COLLECTIONS_Q = """query($first:Int!,$after:String){ collections(first:$first,after:$after){
  pageInfo{hasNextPage endCursor} nodes{ id handle resourcePublicationsV2(first:10){ nodes{ publication{ id } isPublished } } } } }"""
PUBLISH_M = "mutation($id:ID!,$pub:ID!){ publishablePublish(id:$id, input:[{publicationId:$pub}]){ userErrors{ field message } } }"

def main():
    dry = "--dry-run" in sys.argv
    shop = Shopify()
    pubs = shop.gql("{ publications(first: 25) { nodes { id name } } }")["data"]["publications"]["nodes"]
    pub = next((p["id"] for p in pubs if p["name"] == PUBLICATION_NAME), None)
    if not pub:
        sys.exit(f"no publication called {PUBLICATION_NAME!r}; found {[p['name'] for p in pubs]}")
    products = [p for p in shop.paginate(PRODUCTS_Q, "products") if not p["publishedAt"]]
    collections = [c for c in shop.paginate(COLLECTIONS_Q, "collections")
                   if not any(n["publication"]["id"] == pub and n["isPublished"] for n in c["resourcePublicationsV2"]["nodes"])]
    print(f"{len(products)} products and {len(collections)} collections to publish to {PUBLICATION_NAME}")
    for item in products + collections:
        print(f"  {item['handle']}")
        if dry: continue
        out = shop.gql(PUBLISH_M, {"id": item["id"], "pub": pub})
        errs = (out.get("data") or {}).get("publishablePublish", {}).get("userErrors") or out.get("errors")
        if errs: print("    FAILED:", errs)
        time.sleep(0.3)
    if dry: print("dry run, nothing changed")

if __name__ == "__main__":
    main()
