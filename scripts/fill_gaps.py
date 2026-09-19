"""Fill the operational gaps around the NineTees products in Shopify and Helm.

  python3 scripts/fill_gaps.py shopify     # inventory item cost/origin/HS, taxonomy + SEO, metafields, UK shipping rates, policies, checkout branding, discounts
  python3 scripts/fill_gaps.py helm        # supplier addresses/contacts/terms, reorder controls, case containers, three purchase orders
  python3 scripts/fill_gaps.py <step>      # one step: items | products | metafields | shipping | policies | branding | discounts | suppliers | reorder | containers | po
"""
import json, os, random, sys, time, datetime
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0, os.path.dirname(__file__))
from catalogue import PRODUCTS, SCHEMES, variants_for
from load_shopify import FIT, CARE
import helm_enrich as he
from shopify_client import Shopify

ORIGIN_CODE = {"uk": "GB", "tr": "TR", "cn": "CN"}
def supplier_key(p): return he.SUPPLIER_FOR_TYPE.get(p["type"], "uk")

# ------------------------------------------------------------------ Shopify
def composition(p):
    t, s = p["type"], (p["title"] + " " + p["desc"]).lower()
    if "faux leather" in s: return "100% polyurethane, 100% polyester lining"
    if "puffa" in s: return "Shell 100% nylon, fill 100% recycled polyester"
    if "satin" in s: return "100% polyester satin"
    if "velour" in s or "velvet" in s: return "92% polyester, 8% elastane"
    if "mesh" in s: return "100% polyester mesh"
    if "shell" in s or "nylon" in s or "crinkle" in s: return "100% recycled nylon, mesh lining"
    if "cord" in s: return "100% cotton corduroy"
    if t == "Jeans": return "98% cotton, 2% elastane" if "stretch" in s else "100% cotton rigid denim, 14oz"
    if t in ("Trousers", "Shorts") and "cargo" in s or "combat" in s: return "100% cotton ripstop"
    if t == "Knitwear": return "80% wool, 20% nylon" if any(k in s for k in ("wool", "merino", "aran")) else "100% cotton"
    if t == "Footwear":
        if "suede" in s: return "Suede upper, rubber sole"
        if "leather" in s or "boot" in s: return "Leather upper, rubber sole"
        if "sandal" in s: return "PU upper, EVA platform sole"
        return "Leather and textile upper, rubber sole"
    if t == "Hats": return "100% acrylic" if "beanie" in s else "100% cotton"
    if t == "Bags": return "100% nylon, metal hardware"
    if t == "Accessories":
        if "belt" in s: return "Leather, metal hardware"
        if "glove" in s: return "100% acrylic"
        if "watch" in s: return "Polycarbonate case, rubber strap"
        if "shades" in s: return "Polycarbonate lens, nylon frame"
        if "scrunchie" in s: return "100% polyester velvet"
        return "Velvet, zinc alloy"
    if t in ("Sweatshirts", "Hoodies"): return "80% cotton, 20% polyester loopback"
    if t in ("Jackets",): return "100% cotton" if "denim" in s or "harrington" in s else "65% polyester, 35% cotton"
    return "100% cotton"

def model_wears(p):
    if p["scheme"] == "one_size": return None
    if p["scheme"] in ("womens", "womens_bottoms"): return "Model is 5ft 9in and wears a UK 10"
    if p["scheme"] in ("mens_bottoms",): return "Model is 6ft and wears W32 L32"
    if p["scheme"] == "womens_shoes": return "Model wears a UK 6"
    if p["scheme"] in ("mens_shoes", "unisex_shoes"): return "Model wears a UK 9"
    if p["scheme"] == "hats": return "Model wears S/M"
    return "Model is 5ft 10in and wears size M" if p["gender"] != "Women" else "Model is 5ft 9in and wears size S"

TAX_SEARCH = {  # type -> [(search, must-contain-in-fullName)], first hit wins
    "T-Shirts": [("T-Shirts", "Clothing > Clothing Tops > T-Shirts")], "Tops": [("Blouses", "Clothing Tops > Blouses"), ("Tank Tops", "Clothing Tops > Tank Tops"), ("Shirts", "Clothing Tops > Shirts")],
    "Polos": [("Polos", "Clothing Tops > Polos")], "Shirts": [("Shirts", "Clothing Tops > Shirts")], "Sweatshirts": [("Sweatshirts", "Clothing Tops > Sweatshirts")], "Hoodies": [("Hoodies", "Clothing Tops > Hoodies")],
    "Knitwear": [("Sweaters", "Clothing Tops > Sweaters")], "Jackets": [("Coats & Jackets", "Outerwear > Coats & Jackets")], "Tracksuits": [("Activewear", "Clothing > Activewear")],
    "Trousers": [("Pants", "Apparel & Accessories > Clothing > Pants")], "Jeans": [("Jeans", "Clothing > Pants > Jeans")], "Shorts": [("Shorts", "Apparel & Accessories > Clothing > Shorts")],
    "Skirts": [("Skirts", "Apparel & Accessories > Clothing > Skirts")], "Dresses": [("Dresses", "Apparel & Accessories > Clothing > Dresses")], "Dungarees": [("Overalls", "Clothing > Overalls"), ("Pants", "Apparel & Accessories > Clothing > Pants")],
    "Leggings": [("Leggings", "Clothing > Pants > Leggings")], "Footwear": [("Sneakers", "Shoes > Sneakers")], "Hats": [("Hats", "Clothing Accessories > Hats")], "Bags": [("Backpacks", "Luggage & Bags > Backpacks"), ("Handbags", "Luggage & Bags")],
    "Accessories": [("Hair Accessories", "Clothing Accessories > Hair Accessories")],
}
KEYWORD_TAX = [("cardigan", "Cardigans", "Clothing Tops > Cardigans"), ("boot", "Boots", "Shoes > Boots"), ("sandal", "Sandals", "Shoes > Sandals"), ("belt", "Belts", "Clothing Accessories > Belts"),
               ("glove", "Gloves", "Clothing Accessories > Gloves"), ("watch", "Watches", "Jewelry > Watches"), ("shades", "Sunglasses", "Clothing Accessories > Sunglasses"), ("choker", "Necklaces", "Jewelry > Necklaces"),
               ("bum bag", "Fanny Packs", "Fanny Packs"), ("puffa", "Puffer Jackets", "Coats & Jackets"), ("denim jacket", "Denim Jackets", "Coats & Jackets"), ("bomber", "Bomber Jackets", "Coats & Jackets"), ("parka", "Parkas", "Coats & Jackets"),
               ("cargo", "Cargo Pants", "Pants"), ("track pants", "Track Pants", "Activewear")]
_tax_cache = {}
def taxonomy_id(shop, p):
    s = p["title"].lower()
    tries = [(q, must) for k, q, must in KEYWORD_TAX if k in s] + TAX_SEARCH.get(p["type"], [])
    for q, must in tries:
        if (q, must) in _tax_cache: 
            if _tax_cache[(q, must)]: return _tax_cache[(q, must)]
            continue
        r = shop.gql('query($q:String!){ taxonomy{ categories(first:10, search:$q){ nodes{ id fullName isLeaf } } } }', {"q": q})
        hit = next((n["id"] for n in r["data"]["taxonomy"]["categories"]["nodes"] if must in n["fullName"] and "Baby" not in n["fullName"] and "Pet" not in n["fullName"] and "Maternity" not in n["fullName"]), None)
        _tax_cache[(q, must)] = hit
        if hit: return hit
    return None

def shopify_products_index(shop):
    q = """query($first:Int!,$after:String){ products(first:$first,after:$after,query:"vendor:NineTees"){ pageInfo{hasNextPage endCursor}
           nodes{ id handle variants(first:100){nodes{ id sku inventoryItem{id} }} } } }"""
    return {p["handle"]: p for p in shop.paginate(q, "products")}

def step_items(shop):
    idx = shopify_products_index(shop); n = err = 0
    for p in PRODUCTS:
        sp = idx.get(p["handle"]);
        if not sp: continue
        origin = ORIGIN_CODE[supplier_key(p)]; hs = he.hs_code(p); cost = he.cost_price(p)
        for v in sp["variants"]["nodes"]:
            r = shop.gql('mutation($id:ID!,$input:InventoryItemInput!){ inventoryItemUpdate(id:$id,input:$input){ inventoryItem{id} userErrors{field message} } }',
                         {"id": v["inventoryItem"]["id"], "input": {"cost": f"{cost:.2f}", "countryCodeOfOrigin": origin, "harmonizedSystemCode": hs}})
            ue = (r.get("data") or {}).get("inventoryItemUpdate", {}).get("userErrors") or r.get("errors")
            if ue: err += 1; print("  item err", v["sku"], json.dumps(ue)[:160])
            else: n += 1
            time.sleep(0.15)
    print(f"items: {n} inventory items updated with cost, origin and HS code; {err} errors")

def step_products(shop):
    idx = shopify_products_index(shop); n = err = 0; misses = []
    for p in PRODUCTS:
        sp = idx.get(p["handle"])
        if not sp: continue
        cat = taxonomy_id(shop, p)
        if not cat: misses.append(p["title"])
        seo_title = f"{p['title']} | NineTees"[:70]
        seo_desc = (p["desc"] if len(p["desc"]) <= 155 else p["desc"][:152].rsplit(" ", 1)[0] + "...")
        inp = {"id": sp["id"], "seo": {"title": seo_title, "description": seo_desc}}
        if cat: inp["category"] = cat
        r = shop.gql('mutation($input:ProductUpdateInput!){ productUpdate(product:$input){ product{id category{fullName}} userErrors{field message} } }', {"input": inp})
        ue = (r.get("data") or {}).get("productUpdate", {}).get("userErrors") or r.get("errors")
        if ue: err += 1; print("  product err", p["handle"], json.dumps(ue)[:200])
        else: n += 1
        time.sleep(0.2)
    print(f"products: {n} updated with taxonomy + SEO; {err} errors; no taxonomy match for: {misses or 'none'}")

def step_metafields(shop):
    defs = [("composition", "Composition", "single_line_text_field"), ("care", "Care", "single_line_text_field"), ("fit", "Fit", "single_line_text_field"), ("model_wears", "Model wears", "single_line_text_field"), ("colour", "Colour", "single_line_text_field")]
    for key, name, typ in defs:
        r = shop.gql('mutation($d:MetafieldDefinitionInput!){ metafieldDefinitionCreate(definition:$d){ createdDefinition{id} userErrors{code message} } }',
                     {"d": {"namespace": "custom", "key": key, "name": name, "type": typ, "ownerType": "PRODUCT", "pin": True}})
        ue = r["data"]["metafieldDefinitionCreate"]["userErrors"]
        if ue and ue[0]["code"] != "TAKEN": print("  def err", key, ue)
    idx = shopify_products_index(shop); mfs = []
    for p in PRODUCTS:
        sp = idx.get(p["handle"])
        if not sp: continue
        vals = {"composition": composition(p), "care": CARE.get(p["type"], "Machine wash cold. Do not tumble dry."), "fit": FIT[p["scheme"]], "model_wears": model_wears(p), "colour": p["colour"]}
        mfs += [{"ownerId": sp["id"], "namespace": "custom", "key": k, "type": "single_line_text_field", "value": v} for k, v in vals.items() if v]
    n = 0
    for i in range(0, len(mfs), 25):
        r = shop.gql('mutation($m:[MetafieldsSetInput!]!){ metafieldsSet(metafields:$m){ metafields{id} userErrors{field message} } }', {"m": mfs[i:i + 25]})
        ue = r["data"]["metafieldsSet"]["userErrors"]
        if ue: print("  metafield err", json.dumps(ue)[:200])
        else: n += len(mfs[i:i + 25])
        time.sleep(0.3)
    print(f"metafields: {n} values set across {len(idx)} products")

def step_shipping(shop):
    r = shop.gql('{ deliveryProfiles(first:3){ nodes{ id default profileLocationGroups{ locationGroup{id} locationGroupZones(first:10){ nodes{ zone{id name} methodDefinitions(first:20){nodes{id}} } } } } } }')
    prof = next(p for p in r["data"]["deliveryProfiles"]["nodes"] if p["default"])
    lg = prof["profileLocationGroups"][0]; uk = next(z for z in lg["locationGroupZones"]["nodes"] if z["zone"]["name"] == "United Kingdom")
    old = [m["id"] for m in uk["methodDefinitions"]["nodes"]]
    gbp = lambda a: {"amount": a, "currencyCode": "GBP"}
    new = [
        {"name": "Standard delivery (3 to 5 working days)", "active": True, "rateDefinition": {"price": gbp(3.95)},
         "priceConditionsToCreate": [{"criteria": gbp(0), "operator": "GREATER_THAN_OR_EQUAL_TO"}, {"criteria": gbp(74.99), "operator": "LESS_THAN_OR_EQUAL_TO"}]},
        {"name": "Free standard delivery on orders over £75", "active": True, "rateDefinition": {"price": gbp(0)},
         "priceConditionsToCreate": [{"criteria": gbp(75), "operator": "GREATER_THAN_OR_EQUAL_TO"}]},
        {"name": "Next working day (order by 2pm)", "active": True, "rateDefinition": {"price": gbp(6.95)},
         "priceConditionsToCreate": [{"criteria": gbp(0), "operator": "GREATER_THAN_OR_EQUAL_TO"}]},
    ]
    r = shop.gql('mutation($id:ID!,$profile:DeliveryProfileInput!){ deliveryProfileUpdate(id:$id, profile:$profile){ profile{id} userErrors{field message} } }',
                 {"id": prof["id"], "profile": {"methodDefinitionsToDelete": old, "locationGroupsToUpdate": [{"id": lg["locationGroup"]["id"], "zonesToUpdate": [{"id": uk["zone"]["id"], "methodDefinitionsToCreate": new}]}]}})
    ue = (r.get("data") or {}).get("deliveryProfileUpdate", {}).get("userErrors") or r.get("errors")
    print("shipping:", "UK zone now has 3 rates matching the site" if not ue else json.dumps(ue)[:400])

POLICIES = {
 "REFUND_POLICY": """<p>We want you to love what you ordered. If you don't, you have 28 days from delivery to return it for a full refund.</p>
<p>Items must be unworn, unwashed and in their original condition with all tags attached. Footwear must be returned in its box. For hygiene reasons we cannot accept returns on earrings or hair accessories unless faulty.</p>
<p>UK returns are free. Start your return from the order page, print the label, and drop the parcel at any Post Office or parcel shop. Refunds go back to your original payment method within 5 working days of the parcel reaching our Yorkshire warehouse.</p>
<p>Exchanges: order the size you need and return the original for a refund; it is quicker than waiting for us to swap it.</p>
<p>Faulty items: email hello@ninetees.co.uk with your order number and a photo and we will sort it out straight away.</p>
<p><em>NineTees is a demonstration store. Orders placed here are test orders: nothing is charged and nothing is shipped.</em></p>""",
 "SHIPPING_POLICY": """<p>We pack every order in our Yorkshire warehouse and despatch Monday to Friday.</p>
<ul><li><strong>Standard delivery</strong>: £3.95, 3 to 5 working days. Free on orders over £75.</li>
<li><strong>Next working day</strong>: £6.95. Order by 2pm Monday to Friday.</li>
<li><strong>Europe</strong>: £14.99, 5 to 10 working days. Duties and taxes are included at checkout.</li>
<li><strong>Rest of world</strong>: £23.99, 7 to 14 working days. Local duties may apply on delivery.</li></ul>
<p>You will get a tracking link by email the moment your parcel leaves us. If it has not arrived within the window above, get in touch and we will chase it.</p>
<p><em>NineTees is a demonstration store. Orders placed here are test orders: nothing is charged and nothing is shipped.</em></p>""",
 "TERMS_OF_SERVICE": """<p>These terms apply to every order placed on ninetees. By ordering you confirm you are over 16 and that the details you give us are accurate.</p>
<p><strong>Prices</strong> are in pounds sterling and include VAT. Delivery is charged at checkout. We may correct pricing errors before despatch and will always tell you first.</p>
<p><strong>Orders</strong> are accepted when we despatch them. We can decline or cancel an order if stock is unavailable or we suspect fraud, and will refund anything already paid.</p>
<p><strong>Your rights</strong> under the Consumer Rights Act 2015 and the Consumer Contracts Regulations are not affected by anything here.</p>
<p><strong>Content</strong> on this site, including photography and the NineTees name and mark, belongs to NineTees and may not be reused without permission.</p>
<p>NineTees is a trading name based in Manchester, England. These terms are governed by the law of England and Wales.</p>
<p><em>NineTees is a demonstration store built to show a modern brand's shop, warehouse and stock working together. Every order is a test order: nothing is charged and nothing is shipped.</em></p>""",
 "CONTACT_INFORMATION": """<p><strong>NineTees</strong><br>Customer care: hello@ninetees.co.uk<br>Monday to Friday, 9am to 5pm</p>
<p>Studio: Oldham Street, Manchester. Warehouse: Yorkshire.</p>
<p><em>Demonstration store. Every order is a test order.</em></p>""",
}
def step_policies(shop):
    for t, body in POLICIES.items():
        r = shop.gql('mutation($p:ShopPolicyInput!){ shopPolicyUpdate(shopPolicy:$p){ shopPolicy{type} userErrors{field message} } }', {"p": {"type": t, "body": body}})
        ue = (r.get("data") or {}).get("shopPolicyUpdate", {}).get("userErrors") or r.get("errors")
        print(f"policy {t}:", "set" if not ue else json.dumps(ue)[:200])

def step_branding(shop):
    prof = shop.gql('{ checkoutProfiles(first:3){nodes{id isPublished}} }')["data"]["checkoutProfiles"]["nodes"]
    pid = next(p["id"] for p in prof if p["isPublished"])
    logo = next((f["id"] for f in shop.gql('{ files(first:20, query:"filename:NineTees"){ nodes{ id ... on MediaImage{ alt } } } }')["data"]["files"]["nodes"] if f.get("alt") == "NineTees.png"), None)
    inp = {"designSystem": {
              "colors": {"global": {"brand": "#0a0a0b", "accent": "#1a3cff", "success": "#1f6a3a", "critical": "#e0202b", "info": "#1a3cff"},
                         "schemes": {"scheme1": {"base": {"background": "#faf9f6", "text": "#0a0a0b", "border": "#d9d5cc", "accent": "#1a3cff"},
                                                 "primaryButton": {"background": "#0a0a0b", "text": "#f3efe6", "hover": {"background": "#17171a"}}},
                                     "scheme2": {"base": {"background": "#f3efe6", "text": "#0a0a0b", "border": "#d9d5cc"}}}},
              "typography": {"primary": {"shopifyFontGroup": {"name": "Inter"}}, "secondary": {"shopifyFontGroup": {"name": "Anton"}}},
              "cornerRadius": {"small": 2, "base": 2, "large": 4}},
           "customizations": {"headingLevel1": {"typography": {"font": "SECONDARY", "letterCase": "UPPER"}}, "headingLevel2": {"typography": {"font": "SECONDARY", "letterCase": "UPPER"}},
                              "primaryButton": {"cornerRadius": "BASE", "typography": {"letterCase": "UPPER", "kerning": "LOOSE", "weight": "BOLD"}}}}
    if logo: inp["customizations"]["header"] = {"alignment": "START", "logo": {"image": {"mediaImageId": logo}, "maxWidth": 72}}
    r = shop.gql('mutation($id:ID!,$b:CheckoutBrandingInput!){ checkoutBrandingUpsert(checkoutProfileId:$id, checkoutBrandingInput:$b){ checkoutBranding{ designSystem{ colors{ global{ brand } } } } userErrors{field message} } }', {"id": pid, "b": inp})
    ue = (r.get("data") or {}).get("checkoutBrandingUpsert", {}).get("userErrors") or r.get("errors")
    if ue and "font" in json.dumps(ue).lower():  # Anton may not be in Shopify's library: retry without the display font
        inp["designSystem"]["typography"].pop("secondary"); inp["customizations"].pop("headingLevel1"); inp["customizations"].pop("headingLevel2")
        r = shop.gql('mutation($id:ID!,$b:CheckoutBrandingInput!){ checkoutBrandingUpsert(checkoutProfileId:$id, checkoutBrandingInput:$b){ checkoutBranding{ designSystem{ colors{ global{ brand } } } } userErrors{field message} } }', {"id": pid, "b": inp})
        ue = (r.get("data") or {}).get("checkoutBrandingUpsert", {}).get("userErrors") or r.get("errors")
    print("checkout branding:", "applied (logo, colours, buttons)" if not ue else json.dumps(ue)[:400])

def step_discounts(shop):
    now = datetime.datetime.now(datetime.timezone.utc).isoformat()
    r = shop.gql('mutation($d:DiscountCodeBasicInput!){ discountCodeBasicCreate(basicCodeDiscount:$d){ codeDiscountNode{id} userErrors{field message code} } }',
                 {"d": {"title": "WELCOME10", "code": "WELCOME10", "startsAt": now, "appliesOncePerCustomer": True, "customerSelection": {"all": True},
                        "customerGets": {"value": {"percentage": 0.10}, "items": {"all": True}}, "combinesWith": {"shippingDiscounts": True}}})
    ue = r["data"]["discountCodeBasicCreate"]["userErrors"]; print("discount WELCOME10:", "created" if not ue else ue)
    r = shop.gql('mutation($d:DiscountCodeFreeShippingInput!){ discountCodeFreeShippingCreate(freeShippingCodeDiscount:$d){ codeDiscountNode{id} userErrors{field message code} } }',
                 {"d": {"title": "FREEPOST", "code": "FREEPOST", "startsAt": now, "customerSelection": {"all": True}, "destination": {"countries": {"add": ["GB"]}}, "combinesWith": {"productDiscounts": True}}})
    ue = r["data"]["discountCodeFreeShippingCreate"]["userErrors"]; print("discount FREEPOST:", "created" if not ue else ue)

# ------------------------------------------------------------------ Helm
C = he.C
SUPPLIER_DETAILS = {
    6:  {"name": "NineTees Factory UK", "email": "orders@ninetees-factory.co.uk", "phone": "01952 606 170", "url": "https://ninetees-factory.co.uk",
         "address": {"company_name": "NineTees Factory Ltd", "address_line_1": "Unit 7, Hortonwood 30", "address_line_2": "Hortonwood Industrial Estate", "city": "Telford", "county": "Shropshire", "country_id": he.UK, "postcode": "TF1 3NX"},
         "contact": {"name": "Jimmy", "surname": "Ashworth", "email": "jimmy@ninetees-factory.co.uk", "phone": "01952 606 171", "title": "Production Manager"},
         "purchasing": {"currency_id": he.GBP, "lead_time": 7, "lead_time_type": "1", "minimum_order_value": 500, "default_delivery_cost": 45, "payment_terms": 30},
         "registration": {"registration_number": "08123456", "tax_id": "GB123456789", "eori": "GB123456789000"}},
    11: {"name": "NineTees Factory TR", "email": "export@ninetees-tr.com", "phone": "+90 212 555 0134", "url": "https://ninetees-tr.com",
         "address": {"company_name": "NineTees Tekstil San. ve Tic. A.S.", "address_line_1": "Merter Tekstil Merkezi No. 14", "address_line_2": "Gungoren", "city": "Istanbul", "county": "Marmara", "country_id": he.TR, "postcode": "34173"},
         "contact": {"name": "Emre", "surname": "Kaya", "email": "emre.kaya@ninetees-tr.com", "phone": "+90 532 555 0134", "title": "Export Sales Manager"},
         "purchasing": {"currency_id": he.GBP, "lead_time": 28, "lead_time_type": "1", "minimum_order_value": 2000, "default_delivery_cost": 180, "payment_terms": 45},
         "registration": {"registration_number": "0631-0452-1900-0011", "tax_id": "TR6310452190", "eori": "TR6310452190"}},
    12: {"name": "NineTees Factory CN", "email": "sales@ninetees-cn.com", "phone": "+86 20 8555 0198", "url": "https://ninetees-cn.com",
         "address": {"company_name": "Guangzhou NineTees Footwear & Accessories Co., Ltd", "address_line_1": "Building 3, Shatou Industrial Park", "address_line_2": "Panyu District", "city": "Guangzhou", "county": "Guangdong", "country_id": he.CN, "postcode": "511400"},
         "contact": {"name": "Li", "surname": "Wei", "email": "li.wei@ninetees-cn.com", "phone": "+86 139 2222 0198", "title": "Key Account Manager"},
         "purchasing": {"currency_id": he.GBP, "lead_time": 42, "lead_time_type": "1", "minimum_order_value": 3000, "default_delivery_cost": 320, "payment_terms": 60},
         "registration": {"registration_number": "91440101MA5CX1234K", "tax_id": "91440101MA5CX1234K", "eori": ""}},
}
def step_suppliers():
    for sid, d in SUPPLIER_DETAILS.items():
        s, j = he.call("PUT", f"/companies/{C}/suppliers/{sid}", {"supplier_id": str(sid), "name": d["name"], "email": d["email"], "phone": d["phone"], "url": d["url"], "registration_number": d["registration"]["registration_number"],
                                                              "tags": [], "settings": d["purchasing"], "details": d["registration"]}); print(f"supplier {sid} core -> {s} {str(j)[-220:] if s not in (200,204) else ''}")
        s, j = he.call("POST", f"/companies/{C}/suppliers/{sid}/update-purchasing-setting", {"supplier_id": sid, **d["purchasing"]}); print(f"  purchasing -> {s} {str(j)[:120] if s not in (200,204) else ''}")
        s, j = he.call("POST", f"/companies/{C}/suppliers/{sid}/update-registration-details", {"supplier_id": sid, **d["registration"]}); print(f"  registration -> {s} {str(j)[:120] if s not in (200,204) else ''}")
        s, rows = he.call("GET", f"/companies/{C}/suppliers/{sid}/addresses"); rows = rows.get("data", []) if s == 200 else []
        if rows:
            row = rows[0]; ok = False
            for aid in (row["id"], row.get("address_id")):
                s, j = he.call("PUT", f"/companies/{C}/suppliers/{sid}/addresses/{aid}", {"supplier_id": sid, "address_id": row.get("address_id"), **d["address"]})
                if s in (200, 204): ok = True; break
            print(f"  address -> {'updated' if ok else 'failed: ' + str(j)[:160]}")
        else:
            s, j = he.call("POST", f"/companies/{C}/suppliers/{sid}/addresses", {"supplier_id": sid, **d["address"]}); print(f"  address create -> {s}")
        s, rows = he.call("GET", f"/companies/{C}/suppliers/{sid}/contacts"); rows = rows.get("data", []) if s == 200 else []
        if rows:
            s, j = he.call("PUT", f"/companies/{C}/suppliers/{sid}/contacts/{rows[0]['id']}", {"supplier_id": sid, "contact_id": rows[0].get("contact_id"), **d["contact"]}); print(f"  contact update -> {s} {str(j)[:120] if s not in (200,204) else ''}")
        else:
            s, j = he.call("POST", f"/companies/{C}/suppliers/{sid}/contacts", {"supplier_id": sid, **d["contact"]}); print(f"  contact create -> {s} {str(j)[:120] if s not in (200,201) else ''}")

def items_by_sku():
    return {i["code"]: i for i in he.page_all(f"/companies/{C}/inventory") if i["code"].startswith("90S-")}

def step_reorder(only=None):
    items = items_by_sku(); log = []; n = 0
    todo = [(p, v) for p in PRODUCTS for v in variants_for(p) if v["sku"] in items and (not only or p["sku"] in only)]
    def work(t):
        nonlocal n
        p, v = t; it = items[v["sku"]]; opening = max(12, random.Random(v["sku"]).randint(12, 140))
        trigger = max(6, round(opening * 0.2)); target = opening; maximum = round(opening * 1.5)
        body = {"ordering_method": "2", "is_warning_open": True, "warning_level": trigger, "days_of_stock_required": 30, "maximum_level": maximum,
                "exclude_zero_sale_days": True, "calculation_method": "1", "calculation_timeframe": "1", "trigger_level": trigger, "target_level": target}
        time.sleep(0.25); s, j = he.call("PATCH", f"/companies/{C}/inventory/{it['id']}/purchase-order-controls/update", body)
        if s in (200, 201, 204): n += 1
        else: log.append((v["sku"], s, str(j)[:160]))
    with ThreadPoolExecutor(2) as ex: list(ex.map(work, todo))
    print(f"reorder controls: {n} items set (trigger 20% of opening stock, target = opening, max 150%); errors {len(log)} {log[:3]}")

PACK = {"T-Shirts": (10, 60), "Tops": (10, 60), "Polos": (8, 48), "Shirts": (6, 36), "Sweatshirts": (5, 30), "Hoodies": (4, 24), "Knitwear": (4, 24), "Jackets": (3, 18), "Tracksuits": (3, 18),
        "Trousers": (6, 36), "Jeans": (6, 36), "Shorts": (8, 48), "Skirts": (8, 48), "Dresses": (6, 36), "Dungarees": (4, 24), "Leggings": (10, 60), "Footwear": (6, 24), "Hats": (12, 72), "Bags": (6, 36), "Accessories": (24, 144)}
def step_containers(only=None):
    items = items_by_sku(); log = []; n = 0
    todo = [(p, v) for p in PRODUCTS for v in variants_for(p) if v["sku"] in items and (not only or p["sku"] in only)]
    def work(t):
        nonlocal n
        p, v = t; it = items[v["sku"]]; d = he.dims_for(p, tuple(v["options"][k] for k in SCHEMES[p["scheme"]][0]))
        inner_q, outer_q = PACK.get(p["type"], (6, 36))
        want = {10: {"quantity": 1, "length": d["length"], "width": d["width"], "height": d["height"], "weight": d["weight"]},
                4: {"quantity": inner_q, "length": d["length"] + 2, "width": d["width"] + 2, "height": round(d["height"] * inner_q * 0.85 + 2, 1), "weight": round(d["weight"] * inner_q + 0.25, 2)},
                5: {"quantity": outer_q, "length": 60, "width": 40, "height": 40, "weight": round(d["weight"] * outer_q + 1.2, 2)}}
        time.sleep(0.25); s, j = he.call("GET", f"/companies/{C}/inventory/{it['id']}/containers"); rows = (j.get("data", []) if isinstance(j, dict) else j) if s == 200 else []
        have = {int(c["inventory_container_type_id"]): c for c in rows}
        payload = []
        for t_id, spec in want.items():
            row = {"inventory_container_type_id": str(t_id), **spec}
            if t_id in have: row["id"] = have[t_id]["id"]
            payload.append(row)
        s, j = he.call("POST", f"/companies/{C}/inventory/{it['id']}/containers", {"containers": payload})
        if s in (200, 201, 204): n += 1
        else: log.append((v["sku"], s, str(j)[:200]))
    with ThreadPoolExecutor(2) as ex: list(ex.map(work, todo))
    print(f"containers: {n} items given piece/inner/outer case packs; errors {len(log)} {log[:3]}")

def step_po():
    items = items_by_sku()
    s, w = he.call("GET", f"/companies/{C}/warehouses?per_page=5"); wh = (w.get("data") or [{}])[0]
    ship = {"address_line_1": wh.get("address_line_1") or "Unit 2, Wakefield 41 Industrial Park", "city": wh.get("city") or "Wakefield", "country_id": he.UK}
    made = []
    for key, sup in he.SUPPLIERS.items():
        cands = []
        for p in PRODUCTS:
            if he.SUPPLIER_FOR_TYPE.get(p["type"], "uk") != key: continue
            for v in variants_for(p):
                it = items.get(v["sku"])
                if it: cands.append((it["levels"]["available_stock"], p, v, it))
        cands.sort(key=lambda x: x[0]); pick = cands[:18]
        lines = []
        for avail, p, v, it in pick:
            qty = sup["moq"] if avail > 20 else sup["moq"] * 2
            lines.append({"inventory_id": it["id"], "item_qty": qty, "unit_price": he.cost_price(p), "discount": 0, "tax_rate": 0, "note": f"{p['title']} {v['sku']}"})
        eta = (datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(days=sup["lead"])).strftime("%Y-%m-%dT00:00:00Z")
        body = {"type": "3", "priority_supplier_only": False, "supplier_id": sup["id"], "delivery_note": f"NineTees replenishment. Deliver Mon to Fri 8am to 4pm. Lead time {sup['lead']} days.",
                "excepted_delivery_date": eta, "vendor_invoice_number": "", "vendor_shipment_number": "", "totals": {"discount": 0},
                "shipping_address": {**ship, "use_in_for_invoice": True}, "invoice_address": ship, "items": lines}
        s, j = he.call("POST", f"/companies/{C}/purchase-orders", body)
        if s in (200, 201): d = j.get("data", j); made.append((sup["id"], d.get("purchase_order_number"), len(lines), sum(l["item_qty"] * l["unit_price"] for l in lines)))
        else: print(f"PO for supplier {sup['id']} failed: {s} {str(j)[:300]}")
    for sid, num, n, total in made: print(f"purchase order {num}: supplier {sid}, {n} lines, £{total:,.2f}")

if __name__ == "__main__":
    step = sys.argv[1] if len(sys.argv) > 1 else "all"; only = sys.argv[2].split(",") if len(sys.argv) > 2 else None
    shopify_steps = {"items": step_items, "products": step_products, "metafields": step_metafields, "shipping": step_shipping, "policies": step_policies, "branding": step_branding, "discounts": step_discounts}
    helm_steps = {"suppliers": step_suppliers, "reorder": lambda: step_reorder(only), "containers": lambda: step_containers(only), "po": step_po}
    if step in shopify_steps: shopify_steps[step](Shopify())
    elif step in helm_steps: helm_steps[step]()
    elif step == "shopify":
        shop = Shopify()
        for k, f in shopify_steps.items(): print(f"== {k} =="); f(shop)
    elif step == "helm":
        for k, f in helm_steps.items(): print(f"== {k} =="); f()
