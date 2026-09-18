"""Set every NineTees SKU up properly in Helm (company 1017).

Per inventory item: cost price + description + UK VAT tax group, realistic packed weight and dimensions,
PIECE / INNER / OUTER barcodes (GS1 style, PIECE matches the Shopify variant barcode), customs data
(HS code, country of origin, customs value), one supplier link with cost, lead time and MOQ, a category
by garment type, a family per product (style) grouping its sizes, and gender / mood tags.

  python3 scripts/helm_enrich.py --only 90S-044            # one product's variants
  python3 scripts/helm_enrich.py                           # everything (2 workers, ~30 min)
  python3 scripts/helm_enrich.py --verify 90S-044-M        # print an item's full state
Idempotent: safe to re-run. Images cannot be set through the public API; Helm pulls them from the
Shopify channel (download_product_images is on), and the first Shopify image is the product shot.
"""
import argparse, json, os, sys, time, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0, os.path.dirname(__file__))
from catalogue import PRODUCTS, SCHEMES, variants_for
from load_shopify import ean13

ENV = dict(l.strip().split("=", 1) for l in open(os.path.expanduser("~/.config/helm/sandbox.env")) if "=" in l)
B, C, T = ENV["HELM_BASE_URL"], ENV["HELM_COMPANY_ID"], ENV["HELM_TOKEN"]
H = {"Authorization": "Bearer " + T, "Accept": "application/json", "Content-Type": "application/json", "User-Agent": "NineTees-enrich/1.0"}
GBP, UK, PT, TR, CN = 1, 232, 177, 225, 45
BT = {"PACK": 1, "BOX": 2, "CARTON": 3, "INNER": 4, "OUTER": 5, "PIECE": 10}

# ---- suppliers: three real suppliers in this Helm account, mapped by what they would make ----
SUPPLIERS = {
    "uk": {"id": 6,  "country": UK, "lead": 7,  "moq": 24, "label": "NineTees Factory (UK): jersey, knits, woven garments"},
    "tr": {"id": 11, "country": TR, "lead": 28, "moq": 24, "label": "NineTees Factory TR: denim, trousers, tracksuits"},
    "cn": {"id": 12, "country": 45, "lead": 42, "moq": 50, "label": "NineTees Factory CN: footwear, bags, hats, accessories"},
}
SUPPLIER_FOR_TYPE = {"T-Shirts": "uk", "Tops": "uk", "Polos": "uk", "Shirts": "uk", "Sweatshirts": "uk", "Hoodies": "uk", "Knitwear": "uk", "Jackets": "uk", "Dresses": "uk", "Skirts": "uk",
                     "Jeans": "tr", "Trousers": "tr", "Shorts": "tr", "Dungarees": "tr", "Leggings": "tr", "Tracksuits": "tr",
                     "Footwear": "cn", "Accessories": "cn", "Hats": "cn", "Bags": "cn"}
COST_RATIO = {"Footwear": .40, "Accessories": .30, "Hats": .30, "Bags": .32}

# ---- packed dimensions (cm) and weight (kg) by type, scaled a little by size ----
DIMS = {"T-Shirts": (30, 25, 3, .24), "Tops": (28, 22, 3, .20), "Polos": (30, 25, 3, .30), "Shirts": (32, 26, 4, .35),
        "Sweatshirts": (35, 30, 7, .62), "Hoodies": (36, 30, 8, .72), "Knitwear": (35, 30, 8, .60), "Jackets": (45, 35, 10, 1.10),
        "Tracksuits": (40, 32, 10, 1.10), "Trousers": (35, 28, 6, .70), "Jeans": (35, 28, 6, .85), "Shorts": (30, 24, 4, .35),
        "Skirts": (30, 25, 3, .35), "Dresses": (34, 26, 4, .40), "Dungarees": (36, 30, 7, .90), "Leggings": (28, 22, 3, .25),
        "Footwear": (34, 23, 13, 1.00), "Hats": (25, 25, 12, .15), "Bags": (30, 25, 10, .40), "Accessories": (15, 10, 3, .10)}
WEIGHT_OVERRIDE = [("puffa", 1.3), ("parka", 1.6), ("boot", 1.6), ("biker", 1.4), ("bomber", .9), ("belt", .3), ("watch", .15), ("shades", .12), ("scrunchie", .03), ("choker", .03), ("gloves", .08)]

def hs_code(p):
    t, title, desc, g = p["type"], p["title"].lower(), p["desc"].lower(), p["gender"]
    men = g == "Men"
    syn = any(k in title + desc for k in ("mesh", "velvet", "satin", "velour", "nylon", "shell", "faux leather", "crinkle", "polyester", "stretch-mesh"))
    if t == "T-Shirts": return "61099020" if syn else "61091000"
    if t == "Tops": return "61099020" if syn else "61091000"
    if t == "Polos": return "61051000"
    if t == "Shirts": return "62052000" if men else "62063000"
    if t in ("Sweatshirts", "Hoodies"): return "61102099"
    if t == "Knitwear": return "61101190" if any(k in title + desc for k in ("wool", "merino", "aran")) else "61102099"
    if t == "Jackets":
        if "faux leather" in desc or "biker" in title: return "39262000"
        if "denim" in title or "denim" in desc or "cord" in desc or "cotton" in desc: return "62019200" if men or g == "Unisex" else "62029200"
        return "62019300" if men or g == "Unisex" else "62029300"
    if t == "Tracksuits": return "61121200" if "velour" in title else ("62113300" if men or g == "Unisex" else "62114300")
    if t == "Trousers": return ("62034390" if men or g == "Unisex" else "62046318") if syn or "track" in title else ("62034235" if men or g == "Unisex" else "62046231")
    if t == "Jeans": return "62034231" if men else "62046211"
    if t == "Shorts": return "61046300" if "cycle" in title else ("62034290" if men or g == "Unisex" else "62046290")
    if t == "Skirts": return "62045300" if syn else "62045200"
    if t == "Dresses": return "62044300" if syn else "62044200"
    if t == "Dungarees": return "62046211"
    if t == "Leggings": return "61046300"
    if t == "Footwear":
        if "boot" in title: return "64039196"
        if "sandal" in title: return "64029990"
        if "leather" in title or "suede" in title: return "64039991"
        return "64041100"
    if t == "Hats": return "65050030" if "beanie" in title else "65050090"
    if t == "Bags": return "42029298"
    if "belt" in title: return "42033000"
    if "glove" in title: return "61169300"
    if "watch" in title: return "91021200"
    if "shades" in title or "sunglasses" in desc: return "90041091"
    if "choker" in title: return "71171900"
    return "61178010"

def size_index(p, values):
    names, combos = SCHEMES[p["scheme"]]
    return combos.index(tuple(values)) / max(1, len(combos) - 1)  # 0 (smallest) .. 1 (largest)

def dims_for(p, values):
    L, W, Hh, kg = DIMS.get(p["type"], (30, 25, 5, .5))
    for k, w in WEIGHT_OVERRIDE:
        if k in p["title"].lower(): kg = w
    f = 0.92 + 0.16 * size_index(p, values)  # ±8% by size
    if p["scheme"] == "one_size": f = 1.0
    return {"length": round(L * (0.97 + 0.06 * f), 1), "width": round(W * (0.97 + 0.06 * f), 1), "height": round(Hh * f, 1),
            "nest_height": round(Hh * f * 0.8, 1), "weight": round(kg * f, 3)}

def gtin14(indicator, ean):
    body = str(indicator) + ean[:12]
    check = (10 - sum(int(d) * (3 if i % 2 == 0 else 1) for i, d in enumerate(body)) % 10) % 10
    return body + str(check)

def cost_price(p): return round(p["price"] * COST_RATIO.get(p["type"], .36), 2)

SINGULAR = {"T-Shirts": "t-shirt", "Tops": "top", "Polos": "polo shirt", "Shirts": "shirt", "Sweatshirts": "sweatshirt", "Hoodies": "hooded sweatshirt",
            "Knitwear": "knitted jumper", "Jackets": "jacket", "Tracksuits": "tracksuit", "Trousers": "trousers", "Jeans": "denim jeans", "Shorts": "shorts",
            "Skirts": "skirt", "Dresses": "dress", "Dungarees": "dungarees", "Leggings": "leggings", "Footwear": "footwear", "Hats": "hat", "Bags": "bag", "Accessories": "accessory"}
def customs_desc(p):
    g = {"Men": "Men's", "Women": "Women's", "Unisex": "Unisex"}[p["gender"]]
    return f"{g} {SINGULAR.get(p['type'], p['type'].lower())}: {p['title']}"[:120]

# ---- http ----
def call(method, path, body=None, retries=6):
    for attempt in range(retries):
        req = urllib.request.Request(B + path, data=json.dumps(body).encode() if body is not None else None, headers=H, method=method)
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                raw = r.read(); return r.status, (json.loads(raw) if raw else {})
        except urllib.error.HTTPError as e:
            txt = e.read().decode()[:400]
            if e.code in (429, 500, 502, 503) and attempt < retries - 1: time.sleep(4 * (attempt + 1)); continue
            return e.code, txt
    return 0, "retries exhausted"

def page_all(path):
    out, page = [], 1
    while True:
        s, j = call("GET", f"{path}{'&' if '?' in path else '?'}per_page=100&page={page}")
        if s != 200: raise RuntimeError(f"{path}: {s} {j}")
        out += j["data"]
        if len(j["data"]) < 100: return out
        page += 1

# ---- shared setup (once) ----
def ensure_tax_group():
    s, j = call("GET", f"/companies/{C}/tax-groups?per_page=50")
    for g in j.get("data", []):
        if g.get("name") == "UK VAT 20%": return g["id"]
    s, j = call("POST", f"/companies/{C}/tax-groups", {"name": "UK VAT 20%", "description": "Standard rate VAT on clothing and footwear sold in the UK", "status": True,
                                                    "parameters": [{"country_id": UK, "region": [], "tax_rate": "20"}]})
    if s in (200, 201): return (j.get("data") or j).get("id")
    print("tax group create failed:", s, j); return None

PARENTS = {"Outerwear": ["Jackets"], "Tops": ["T-Shirts", "Tops", "Polos", "Shirts", "Sweatshirts", "Hoodies"], "Knitwear": ["Knitwear"],
           "Bottoms": ["Jeans", "Trousers", "Shorts", "Leggings", "Dungarees"], "Dresses & Skirts": ["Dresses", "Skirts"],
           "Sportswear": ["Tracksuits"], "Footwear": ["Footwear"], "Accessories": ["Accessories", "Hats", "Bags"]}
def ensure_categories():
    have = {c["name"]: c for c in page_all(f"/companies/{C}/inventory/category")}
    for parent, kids in PARENTS.items():
        if parent not in have:
            s, j = call("POST", f"/companies/{C}/inventory/category", {"name": parent, "description": f"NineTees {parent.lower()}"})
            have[parent] = (j.get("data") or j) if s in (200, 201) else None
        pid = have[parent]["id"] if have.get(parent) else None
        for k in kids:
            if k not in have:
                s, j = call("POST", f"/companies/{C}/inventory/category", {"name": k, "parent_id": pid, "description": f"NineTees {k.lower()}"})
                if s in (200, 201): have[k] = (j.get("data") or j)
                else: print("category create failed", k, s, j)
    return {k: v["id"] for k, v in have.items() if v}

def ensure_families():
    have = {f["name"]: f["id"] for f in page_all(f"/companies/{C}/inventory-families")}
    missing = [p for p in PRODUCTS if p["title"] not in have]
    for i in range(0, len(missing), 25):
        batch = missing[i:i + 25]
        s, j = call("POST", f"/companies/{C}/inventory-families/bulk-create", {"families": [{"name": p["title"], "description": f"{p['colour']} · {p['type']} · style {p['sku']}"} for p in batch]})
        if s not in (200, 201): print("families bulk-create failed", s, j)
        time.sleep(0.3)
    return {f["name"]: f["id"] for f in page_all(f"/companies/{C}/inventory-families")}

# ---- per item ----
def enrich_item(item, p, values, ctx, log):
    iid, sku = item["id"], item["code"]
    ok = lambda s: s in (200, 201, 204)
    def rec(step, s, j):
        if not ok(s): log.append((sku, step, s, str(j)[:160]))
    time.sleep(0.2)
    cp = cost_price(p)
    # 1. product information: price, cost, description, VAT
    body = {"name": item.get("_name") or f"{p['title']} {' '.join(values) if p['scheme'] != 'mens_bottoms' else f'W{values[0]} L{values[1]}'}".replace(" One Size", ""),
            "price": p["price"], "cost_price": cp, "description": p["desc"], "count_period": "1"}
    if ctx["tax_group"]: body["tax_group_id"] = ctx["tax_group"]
    s, j = call("PATCH", f"/companies/{C}/inventory/{iid}/product-information", body); rec("info", s, j)
    # 2. dimensions
    s, j = call("PATCH", f"/companies/{C}/inventory/{iid}/product-dimension", dims_for(p, values)); rec("dims", s, j)
    # 3. barcodes: PIECE = EAN-13 (Shopify), INNER/OUTER = GTIN-14
    ean = ean13(sku); want = {BT["PIECE"]: ean, BT["INNER"]: gtin14(1, ean), BT["OUTER"]: gtin14(2, ean)}
    s, j = call("GET", f"/companies/{C}/inventory/{iid}/barcodes"); existing = j.get("data", []) if s == 200 else []
    by_type = {}
    for b in existing: by_type.setdefault(int(b["inventory_barcode_type_id"]), []).append(b)
    spare = [b for t, bs in by_type.items() if t not in want for b in bs]  # e.g. PACK from the early test
    for t, val in want.items():
        cur = by_type.get(t, [])
        if cur:
            if cur[0]["value"] != val:
                s, j = call("PUT", f"/companies/{C}/inventory/{iid}/barcodes/{cur[0]['id']}", {"inventory_barcode_type_id": str(t), "value": val}); rec(f"barcode-{t}", s, j)
        elif spare:
            b = spare.pop(); s, j = call("PUT", f"/companies/{C}/inventory/{iid}/barcodes/{b['id']}", {"inventory_barcode_type_id": str(t), "value": val}); rec(f"barcode-{t}", s, j)
        else:
            s, j = call("POST", f"/companies/{C}/inventory/{iid}/barcodes", {"inventory_barcode_type_id": str(t), "value": val}); rec(f"barcode-{t}", s, j)
    # 4. customs
    sup = SUPPLIERS[SUPPLIER_FOR_TYPE.get(p["type"], "uk")]
    s, j = call("PATCH", f"/companies/{C}/inventory/{iid}/customs-information",
                {"country_id": sup["country"], "hs_code": hs_code(p), "description": customs_desc(p), "customs_value": cp, "export_values": []}); rec("customs", s, j)
    # 5. supplier: exactly one link, to the mapped supplier
    s, j = call("GET", f"/companies/{C}/inventory/{iid}/suppliers"); links = j.get("data", []) if s == 200 else []
    keep = [l for l in links if l["supplier_id"] == sup["id"]]
    for l in links:
        if l["supplier_id"] != sup["id"]:
            s, j = call("DELETE", f"/companies/{C}/inventory/{iid}/suppliers/{l['id']}"); rec("supplier-del", s, j)
    payload = {"supplier_id": sup["id"], "currency_id": GBP, "supplier_code": f"NT-{sku}", "item_cost": cp, "lead_time": sup["lead"], "lead_time_type": "1", "minimum_order_quantity": sup["moq"]}
    if keep:
        k = keep[0]
        if any(str(k.get(f)) != str(payload[f]) for f in ("supplier_code", "item_cost", "lead_time", "minimum_order_quantity")):
            payload["id"] = k["id"]
            s, j = call("POST", f"/companies/{C}/inventory/{iid}/suppliers", {"suppliers": [payload]}); rec("supplier-upd", s, j)
    else:
        s, j = call("POST", f"/companies/{C}/inventory/{iid}/suppliers", {"suppliers": [payload]}); rec("supplier", s, j)
    # 6. category (child by type) and 7. family (style)
    cid = ctx["categories"].get(p["type"])
    if cid:
        s, j = call("POST", f"/companies/{C}/inventory/{iid}/category/{cid}/attach", {})
        if not ok(s) and "already" not in str(j).lower(): rec("category", s, j)
    fid = ctx["families"].get(p["title"])
    if fid:
        s, j = call("POST", f"/companies/{C}/inventory/{iid}/families/{fid}/attach", {})
        if not ok(s) and "already" not in str(j).lower(): rec("family", s, j)
    # 8. tags: gender + up to two mood tags
    s, j = call("GET", f"/companies/{C}/inventory/{iid}/tags"); have = {t["name"].lower() for t in (j.get("data", []) if s == 200 else [])}
    wanted = [p["gender"]] + [t for t in p["tags"] if t in ("Britpop", "Rave", "Madchester", "Festival", "Grunge", "Mod", "Skate", "Girl Power", "Sportswear", "Denim")][:2]
    for tag in wanted:
        if tag.lower() in have: continue
        s, j = call("POST", f"/companies/{C}/inventory/{iid}/tags", {"name": tag})
        if not ok(s) and "already" not in str(j).lower(): rec(f"tag-{tag}", s, j)

def verify(sku):
    items = {i["code"]: i for i in page_all(f"/companies/{C}/inventory")}
    it = items[sku]; iid = it["id"]
    for label, path in [("info", "product-information"), ("dims", "product-dimension"), ("barcodes", "barcodes"), ("customs", "customs-information"), ("suppliers", "suppliers"), ("categories", "categories"), ("families", "families"), ("tags", "tags")]:
        s, j = call("GET", f"/companies/{C}/inventory/{iid}/{path}"); d = j.get("data", j) if isinstance(j, dict) else j
        if label == "barcodes": d = [(b["inventory_barcode_type_name"], b["value"]) for b in d]
        if label == "suppliers": d = [{k: l[k] for k in ("supplier_id", "supplier_code", "item_cost", "lead_time", "minimum_order_quantity")} for l in d]
        if label == "tags": d = [t["name"] for t in d]
        print(f"  {label:10} {json.dumps(d)[:300]}")
    print("  levels:", it["levels"])

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--only"); ap.add_argument("--verify"); ap.add_argument("--workers", type=int, default=2)
    a = ap.parse_args()
    if a.verify: verify(a.verify); return
    ctx = {"tax_group": ensure_tax_group(), "categories": ensure_categories(), "families": ensure_families()}
    print(f"tax group {ctx['tax_group']} | {len(ctx['categories'])} categories | {len(ctx['families'])} families")
    items = {i["code"]: i for i in page_all(f"/companies/{C}/inventory")}
    todo = []
    for p in PRODUCTS:
        if a.only and p["sku"] not in a.only.split(","): continue
        for v in variants_for(p):
            it = items.get(v["sku"])
            if it: todo.append((it, p, tuple(v["options"][n] for n in SCHEMES[p["scheme"]][0])))
    print(f"enriching {len(todo)} items with {a.workers} workers")
    log = []; done = [0]
    def work(t):
        try: enrich_item(*t, ctx, log)
        except Exception as e: log.append((t[0]["code"], "exception", 0, str(e)[:160]))
        done[0] += 1
        if done[0] % 50 == 0: print(f"  {done[0]}/{len(todo)} done, {len(log)} errors")
    with ThreadPoolExecutor(a.workers) as ex: list(ex.map(work, todo))
    print(f"finished: {len(todo)} items, {len(log)} errors")
    for e in log[:12]: print("  ", e)
    json.dump(log, open(os.path.expanduser("~/ninetees-work/helm-enrich-errors.json"), "w"), indent=1)

if __name__ == "__main__":
    main()
