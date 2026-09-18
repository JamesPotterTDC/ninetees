"""Export the live Shopify catalogue to src/data/catalogue.json for the static storefront.

The site never talks to the Admin API; it reads this file (fast, no keys) and only uses the
public Storefront API for cart and checkout. Re-run after any catalogue change.
"""
import json, os, re, sys, datetime
sys.path.insert(0, os.path.dirname(__file__))
from shopify_client import Shopify

OUT = os.path.join(os.path.dirname(__file__), "..", "src", "data", "catalogue.json")

PRODUCTS_Q = """query($first:Int!,$after:String){ products(first:$first,after:$after,query:"status:active"){ pageInfo{hasNextPage endCursor}
  nodes{ id handle title vendor productType tags descriptionHtml createdAt
    options{name values}
    priceRangeV2{ minVariantPrice{amount} maxVariantPrice{amount} }
    media(first:12){ nodes{ mediaContentType ... on MediaImage{ id alt image{url width height} } } }
    variants(first:100){ nodes{ id sku title price compareAtPrice barcode availableForSale inventoryQuantity selectedOptions{name value} } }
    collections(first:20){ nodes{ handle } }
  } } }"""
COLLECTIONS_Q = """query($first:Int!,$after:String){ collections(first:$first,after:$after){ pageInfo{hasNextPage endCursor}
  nodes{ id handle title descriptionHtml productsCount{count} image{url} } } }"""

def tag_value(tags, prefix):
    for t in tags:
        if t.lower().startswith(prefix + ":"): return t.split(":", 1)[1].strip()
    return None

def main():
    shop = Shopify()
    products = []
    for p in shop.paginate(PRODUCTS_Q, "products"):
        tags = p["tags"]
        gender = next((g for g in ("Women", "Men", "Unisex") if g in tags), "Unisex")
        products.append({
            "id": p["id"], "handle": p["handle"], "title": p["title"], "vendor": p["vendor"], "type": p["productType"],
            "tags": [t for t in tags if ":" not in t], "gender": gender, "colour": tag_value(tags, "colour"),
            "descriptionHtml": p["descriptionHtml"], "description": re.sub("<[^>]+>", " ", p["descriptionHtml"].split("<ul>")[0]).strip(),
            "price": float(p["priceRangeV2"]["minVariantPrice"]["amount"]),
            "priceMax": float(p["priceRangeV2"]["maxVariantPrice"]["amount"]),
            "createdAt": p["createdAt"], "newIn": "New In" in tags,
            "options": p["options"],
            "images": [{"url": m["image"]["url"], "alt": m.get("alt") or p["title"], "width": m["image"]["width"], "height": m["image"]["height"]}
                       for m in p["media"]["nodes"] if m["mediaContentType"] == "IMAGE"],
            "variants": [{"id": v["id"], "sku": v["sku"], "title": v["title"], "price": float(v["price"]),
                          "compareAtPrice": float(v["compareAtPrice"]) if v["compareAtPrice"] else None,
                          "available": bool(v["availableForSale"]), "quantity": v["inventoryQuantity"],
                          "options": {o["name"]: o["value"] for o in v["selectedOptions"]}} for v in p["variants"]["nodes"]],
            "collections": [c["handle"] for c in p["collections"]["nodes"]],
        })
    collections = [{"handle": c["handle"], "title": c["title"], "description": re.sub("<[^>]+>", "", c["descriptionHtml"] or ""),
                    "count": c["productsCount"]["count"], "image": (c.get("image") or {}).get("url")}
                   for c in shop.paginate(COLLECTIONS_Q, "collections") if c["handle"] != "frontpage"]
    out = {"generatedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
           "shop": {"domain": shop.shop, "currency": "GBP", "storefrontApiVersion": "2025-07"},
           "collections": collections, "products": sorted(products, key=lambda x: x["handle"])}
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(out, open(OUT, "w"), indent=1)
    nv = sum(len(p["variants"]) for p in products); ni = sum(len(p["images"]) for p in products)
    print(f"exported {len(products)} products, {nv} variants, {ni} images, {len(collections)} collections -> {os.path.relpath(OUT)}")
    print("products without images:", [p["handle"] for p in products if not p["images"]])

if __name__ == "__main__":
    main()
