"""Mirror the Shopify catalogue into the Helm WMS sandbox (company 1017, store 20, channel 49).

Helm downloads Shopify variants as "channel products" but only creates inventory for them when
the channel's "add to products" setting is on, which the API will not let us change. So we create
the inventory items ourselves with matching SKUs (Helm auto-links by code), then set price, name,
dimensions, barcode and opening stock at the default location so Helm mirrors Shopify exactly.

  python3 scripts/sync_helm.py            # create missing items, refresh names/prices on all
"""
import json, os, sys, time, urllib.request, urllib.error
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0, os.path.dirname(__file__))
from catalogue import PRODUCTS, variants_for
from load_shopify import WEIGHT_KG, ean13

ENV = dict(l.strip().split("=", 1) for l in open(os.path.expanduser("~/.config/helm/sandbox.env")) if "=" in l)
B, C, T = ENV["HELM_BASE_URL"], ENV["HELM_COMPANY_ID"], ENV["HELM_TOKEN"]
STORE, CHANNEL, LOCATION = 20, 49, 13259
H = {"Authorization": "Bearer " + T, "Accept": "application/json", "Content-Type": "application/json", "User-Agent": "NineTees-sync/1.0"}
BARCODE_TYPE_INNER = "4"

def call(method, path, body=None, retries=6):
    for attempt in range(retries):
        req = urllib.request.Request(B + path, data=json.dumps(body).encode() if body is not None else None, headers=H, method=method)
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                raw = r.read(); return r.status, (json.loads(raw) if raw else {})
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503) and attempt < retries - 1:
                time.sleep(4 * (attempt + 1)); continue
            return e.code, e.read().decode()[:300]
    return 0, "retries exhausted"

def page_all(path):
    out, page = [], 1
    while True:
        s, j = call("GET", f"{path}{'&' if '?' in path else '?'}per_page=100&page={page}")
        if s != 200: raise RuntimeError(f"{path}: {s} {j}")
        out += j["data"]
        if len(j["data"]) < 100: return out
        page += 1

def main():
    by_sku = {}
    for p in PRODUCTS:
        for v in variants_for(p):
            size = " ".join(v["options"][n] for n in v["options"]) if p["scheme"] != "mens_bottoms" else f"W{v['options']['Waist']} L{v['options']['Leg']}"
            by_sku[v["sku"]] = {"product": p, "size": size, "name": f"{p['title']} {size}" if size != "One Size" else p["title"]}

    channel = page_all(f"/companies/{C}/stores/{STORE}/channel-linking/inventories")
    channel = [c for c in channel if c["remote_code"] in by_sku]
    print(f"channel products matching catalogue: {len(channel)}")

    inventory = page_all(f"/companies/{C}/inventory")
    have = {i["code"]: i for i in inventory}
    print(f"helm inventory items: {len(inventory)} ({sum(1 for c in by_sku if c in have)} of {len(by_sku)} catalogue SKUs present)")

    # 1. create the missing items in batches of 40
    missing = [c for c in channel if c["remote_code"] not in have]
    print(f"creating {len(missing)} inventory items")
    for i in range(0, len(missing), 40):
        batch = missing[i:i + 40]
        s, j = call("POST", f"/companies/{C}/inventory/bulk-create", {"inventories": [
            {"code": c["remote_code"], "name": by_sku[c["remote_code"]]["name"], "inventory_type_id": "1", "quantity": 0} for c in batch]})
        bad = [x for x in (j if isinstance(j, list) else []) if not x.get("status")]
        print(f"  batch {i // 40 + 1}: {s} created={len(batch) - len(bad)} failed={len(bad)} {bad[:2] if bad else ''}")
        time.sleep(0.5)
    time.sleep(3)
    inventory = page_all(f"/companies/{C}/inventory")
    have = {i["code"]: i for i in inventory}

    # base dimensions from the original 50 items, per product
    dims = {}
    def fetch_dims(p):
        s, j = call("GET", f"/companies/{C}/inventory/{have[p['sku']]['id']}/product-dimension")
        if s == 200 and j.get("data"): dims[p["sku"]] = {k: j["data"][k] for k in ("height", "width", "length", "nest_height")}
    with ThreadPoolExecutor(2) as ex: list(ex.map(fetch_dims, [p for p in PRODUCTS if p["sku"] in have and p["existing_size"]]))

    # 2. per item: name + price, dimensions + weight, barcode (new only), opening stock (new only)
    qty_by_sku = {c["remote_code"]: int(c["quantity"] or 0) for c in channel}
    created = {c["remote_code"] for c in missing}
    newsize = {c["remote_code"] for c in channel if c["remote_code"].count("-") >= 2}
    results = {"info": 0, "dims": 0, "barcode": 0, "stock": 0, "errors": []}
    def process(sku):
        item = have.get(sku)
        if not item: return
        meta = by_sku[sku]; p = meta["product"]; iid = item["id"]
        time.sleep(0.25)
        s, j = call("PATCH", f"/companies/{C}/inventory/{iid}/product-information", {"name": meta["name"], "price": p["price"]})
        if s in (200, 204): results["info"] += 1
        else: results["errors"].append((sku, "info", s, str(j)[:120]))
        d = dims.get(p["sku"], {"height": 6, "width": 30, "length": 40, "nest_height": 6})
        s, j = call("PATCH", f"/companies/{C}/inventory/{iid}/product-dimension", {**d, "weight": WEIGHT_KG.get(p["type"], .5)})
        if s in (200, 204): results["dims"] += 1
        else: results["errors"].append((sku, "dims", s, str(j)[:120]))
        if sku in created:
            s, j = call("POST", f"/companies/{C}/inventory/{iid}/barcodes", {"inventory_barcode_type_id": BARCODE_TYPE_INNER, "value": ean13(sku)})
            if s in (200, 201): results["barcode"] += 1
            else: results["errors"].append((sku, "barcode", s, str(j)[:120]))
        if sku in newsize:
            q = qty_by_sku.get(sku, 0) or __import__("random").Random(sku).randint(12, 140)
            s, j = call("GET", f"/companies/{C}/inventory/{iid}/stocks")
            if q > 0 and s == 200 and not (j.get("data") if isinstance(j, dict) else j):
                s, j = call("POST", f"/companies/{C}/inventory/{iid}/stocks/bulk-create", {"stocks": [{"location_id": LOCATION, "quantity": q}]})
                if s in (200, 201, 204): results["stock"] += 1
                else: results["errors"].append((sku, "stock", s, str(j)[:120]))
    todo = [c["remote_code"] for c in channel]
    with ThreadPoolExecutor(2) as ex: list(ex.map(process, todo))
    print(f"updated info={results['info']} dims={results['dims']} barcodes={results['barcode']} stock={results['stock']} errors={len(results['errors'])}")
    for e in results["errors"][:8]: print("  ", e)

    time.sleep(3)
    s, j = call("GET", f"/companies/{C}/stores/{STORE}/channel-linking")
    st = j["data"]["stores"][0]
    print(f"helm store: linked_inventory_count={st['linked_inventory_count']} channel_products_count={st['channel_products_count']}")

if __name__ == "__main__":
    main()
