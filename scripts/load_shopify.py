"""Push the NineTees catalogue into Shopify with productSet (upsert).

  python3 scripts/load_shopify.py --only 90S-001,90S-003   # a few products
  python3 scripts/load_shopify.py                          # everything
  python3 scripts/load_shopify.py --collections            # (re)create smart collections
Existing products are matched by SKU base; their existing variant keeps its id and SKU.
"""
import argparse, json, os, random, sys, time
sys.path.insert(0, os.path.dirname(__file__))
from catalogue import PRODUCTS, SCHEMES, VENDOR, variants_for
from shopify_client import Shopify

LOCATION_ID = "gid://shopify/Location/88336662795"
WEIGHT_KG = {"T-Shirts": .25, "Tops": .2, "Shirts": .35, "Polos": .3, "Hoodies": .7, "Sweatshirts": .6, "Knitwear": .6,
             "Jackets": 1.1, "Tracksuits": 1.2, "Trousers": .6, "Jeans": .8, "Shorts": .35, "Skirts": .35, "Dresses": .4,
             "Dungarees": .9, "Leggings": .25, "Footwear": 1.0, "Hats": .15, "Bags": .4, "Accessories": .1}
FIT = {"tops": "Unisex sizing, XS to 2XL. Relaxed through the body.", "womens": "UK women's sizing, 6 to 16. True to size.",
       "womens_bottoms": "UK women's sizing, 6 to 16. Sits on the waist.", "mens_bottoms": "Men's waist 30 to 38, leg 30 to 34.",
       "womens_shoes": "UK women's sizes 2 to 9. Take your usual size.", "mens_shoes": "UK men's sizes 6 to 12. Take your usual size.",
       "unisex_shoes": "UK sizes 3 to 12. Take your usual size.", "hats": "Two sizes: S/M fits up to 57cm, L/XL up to 61cm.", "one_size": "One size."}
CARE = {"Footwear": "Wipe clean. Store out of direct sunlight.", "Accessories": "Spot clean only.", "Bags": "Spot clean only.",
        "Jackets": "Cool machine wash inside out. Do not tumble dry.", "Knitwear": "Hand wash cold. Dry flat.", "Jeans": "Wash rarely, cold, inside out.",
        "Hats": "Hand wash. Reshape while damp."}

def ean13(seed):
    rnd = random.Random(seed); digits = [5, 0, 6, 0] + [rnd.randint(0, 9) for _ in range(8)]
    check = (10 - sum(d * (3 if i % 2 else 1) for i, d in enumerate(digits)) % 10) % 10
    return "".join(map(str, digits + [check]))

def description_html(p):
    care = CARE.get(p["type"], "Machine wash cold. Do not tumble dry.")
    return (f"<p>{p['desc']}</p><ul>"
            f"<li><strong>Colour:</strong> {p['colour']}</li>"
            f"<li><strong>Fit:</strong> {FIT[p['scheme']]}</li>"
            f"<li><strong>Care:</strong> {care}</li>"
            f"<li><strong>Style code:</strong> {p['sku']}</li></ul>")

def existing_index(shop):
    """sku base -> (product gid, existing variant gid, existing barcode, option names)."""
    q = """query($first:Int!,$after:String){ products(first:$first,after:$after){ pageInfo{hasNextPage endCursor}
           nodes{ id title options{id name values} variants(first:5){nodes{id sku barcode}} } } }"""
    idx = {}
    for prod in shop.paginate(q, "products"):
        for v in prod["variants"]["nodes"]:
            if v["sku"]: idx[v["sku"].split("-")[0] + "-" + v["sku"].split("-")[1]] = (prod["id"], v["id"], v["barcode"], prod["options"])
    return idx

def build_input(p, existing):
    names, _ = SCHEMES[p["scheme"]]
    variants = []
    for vi, v in enumerate(variants_for(p)):
        item = {
            "optionValues": [{"optionName": n, "name": v["options"][n]} for n in names],
            "sku": v["sku"], "price": f"{p['price']:.2f}",
            "barcode": ean13(v["sku"]),
            "inventoryPolicy": "DENY",
            "inventoryItem": {"tracked": True, "measurement": {"weight": {"unit": "KILOGRAMS", "value": WEIGHT_KG.get(p["type"], .5)}}},
        }
        if v["is_existing"] and existing:
            item["id"] = existing[1]
            if existing[2]: item["barcode"] = existing[2]
        else:
            item["inventoryQuantities"] = [{"locationId": LOCATION_ID, "name": "available",
                                            "quantity": random.Random(v["sku"]).randint(12, 140)}]
        variants.append(item)
    values_by_option = {n: [] for n in names}
    for v in variants_for(p):
        for n in names:
            if v["options"][n] not in values_by_option[n]: values_by_option[n].append(v["options"][n])
    inp = {
        "title": p["title"], "handle": p["handle"], "descriptionHtml": description_html(p),
        "vendor": VENDOR, "productType": p["type"], "status": "ACTIVE",
        "tags": sorted(set(p["tags"] + [p["gender"], "NineTees", f"colour:{p['colour']}", f"type:{p['type']}"])),
        "productOptions": [{"name": n, "position": i + 1, "values": [{"name": val} for val in values_by_option[n]]} for i, n in enumerate(names)],
        "variants": variants,
    }
    if existing: inp["id"] = existing[0]
    return inp

PRODUCT_SET = """mutation productSet($input: ProductSetInput!) {
  productSet(input: $input, synchronous: true) {
    product { id handle title options{name values} variants(first:100){ nodes{ id sku title price barcode inventoryQuantity } } }
    userErrors { field message code }
  } }"""

def load(only=None):
    shop = Shopify(); idx = existing_index(shop)
    todo = [p for p in PRODUCTS if not only or p["sku"] in only]
    log = []
    for p in todo:
        existing = idx.get(p["sku"])
        out = shop.gql(PRODUCT_SET, {"input": build_input(p, existing)})
        res = (out.get("data") or {}).get("productSet") or {}
        errs = res.get("userErrors") or out.get("errors")
        prod = res.get("product")
        status = "ERROR" if errs else ("updated" if existing else "created")
        n = len(prod["variants"]["nodes"]) if prod else 0
        print(f"  {p['sku']} {status:8} {p['title'][:34]:34} variants={n:3} {'' if not errs else json.dumps(errs)[:300]}")
        log.append({"sku": p["sku"], "status": status, "errors": errs, "product_id": prod and prod["id"], "variants": n})
        time.sleep(0.3)
    os.makedirs(os.path.expanduser("~/ninetees-work"), exist_ok=True)
    json.dump(log, open(os.path.expanduser("~/ninetees-work/load-log.json"), "w"), indent=1)
    ok = sum(1 for l in log if l["status"] != "ERROR")
    print(f"\n{ok}/{len(log)} products ok, {sum(l['variants'] for l in log)} variants")
    return log

COLLECTIONS = [
    ("new-in", "New In", "The latest drops, fresh from the van.", [("TAG", "EQUALS", "New In")], True),
    ("men", "Men", "Parkas, polos, proper denim and terrace trainers.", [("TAG", "EQUALS", "Men"), ("TAG", "EQUALS", "Unisex")], False),
    ("women", "Women", "Slip dresses, baby tees, platforms and mum jeans.", [("TAG", "EQUALS", "Women"), ("TAG", "EQUALS", "Unisex")], False),
    ("outerwear", "Outerwear", "Parkas, Harringtons, puffas and shells.", [("TAG", "EQUALS", "Outerwear")], True),
    ("denim", "Denim", "Baggy, ripped, flared and stonewashed.", [("TAG", "EQUALS", "Denim")], True),
    ("tees", "Tees & Tops", "Graphic tees, baby tees and crops.", [("TAG", "EQUALS", "Tees"), ("TAG", "EQUALS", "Tops")], False),
    ("knitwear", "Knitwear", "Roll necks, cardigans and oversized jumpers.", [("TAG", "EQUALS", "Knitwear")], True),
    ("sportswear", "Sportswear", "Shell suits, track tops and five-a-side kit.", [("TAG", "EQUALS", "Sportswear")], True),
    ("footwear", "Footwear", "Platforms, terrace trainers and eight-eye boots.", [("TAG", "EQUALS", "Footwear")], True),
    ("accessories", "Accessories", "Bucket hats, bum bags, chokers and shades.", [("TAG", "EQUALS", "Accessories"), ("TAG", "EQUALS", "Hats"), ("TAG", "EQUALS", "Bags")], False),
    ("the-britpop-edit", "The Britpop Edit", "Parklife, parkas and a bit of swagger. Everything with a Union Jack heart.", [("TAG", "EQUALS", "Britpop"), ("TAG", "EQUALS", "Mod")], False),
    ("rave", "Rave & Madchester", "Tie-dye, smileys, bucket hats and shell suits. Hacienda hours.", [("TAG", "EQUALS", "Rave"), ("TAG", "EQUALS", "Madchester"), ("TAG", "EQUALS", "Festival")], False),
]

def collections():
    shop = Shopify()
    have = {c["handle"]: c["id"] for c in shop.paginate("query($first:Int!,$after:String){ collections(first:$first,after:$after){ pageInfo{hasNextPage endCursor} nodes{id handle} } }", "collections")}
    for handle, title, desc, rules, conj in COLLECTIONS:
        rule_set = {"appliedDisjunctively": not conj, "rules": [{"column": c, "relation": r, "condition": v} for c, r, v in rules]}
        if handle in have:
            out = shop.gql("mutation($input:CollectionInput!){ collectionUpdate(input:$input){ collection{id handle productsCount{count}} userErrors{message} } }",
                           {"input": {"id": have[handle], "title": title, "descriptionHtml": f"<p>{desc}</p>", "ruleSet": rule_set}})
            res = out["data"]["collectionUpdate"]
        else:
            out = shop.gql("mutation($input:CollectionInput!){ collectionCreate(input:$input){ collection{id handle productsCount{count}} userErrors{message} } }",
                           {"input": {"handle": handle, "title": title, "descriptionHtml": f"<p>{desc}</p>", "ruleSet": rule_set}})
            res = out["data"]["collectionCreate"]
        print(f"  {handle:18} {'updated' if handle in have else 'created'}  {res.get('userErrors') or ''}")

if __name__ == "__main__":
    ap = argparse.ArgumentParser(); ap.add_argument("--only"); ap.add_argument("--collections", action="store_true")
    a = ap.parse_args()
    if a.collections: collections()
    else: load(set(a.only.split(",")) if a.only else None)
