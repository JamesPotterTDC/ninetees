"""Generate photoreal product and model shots for NineTees with OpenAI's image model, then attach them in Shopify.

Key: OPENAI_API_KEY in the environment or in ~/.config/helm/openai.env (OPENAI_API_KEY=sk-...).

  python3 scripts/generate_images.py --only wannabe-platform-sandals --dry-run   # show prompts + cost estimate
  python3 scripts/generate_images.py --only wannabe-platform-sandals              # generate 4 shots for one product
  python3 scripts/generate_images.py --upload --only wannabe-platform-sandals     # generate (if missing) and attach to Shopify
  python3 scripts/generate_images.py --upload                                     # everything
  python3 scripts/generate_images.py --hero                                       # home page hero at the skate park

Per product: (1) product shot on white, then (2) model full-length, (3) model half-length, (4) back or detail,
all edited from the product shot so the garment stays identical across the set. Output lands in
~/ninetees-work/generated/<handle>/. Re-runs skip files that already exist.
"""
import argparse, base64, json, mimetypes, os, sys, time, urllib.request, urllib.error, uuid
from concurrent.futures import ThreadPoolExecutor
sys.path.insert(0, os.path.dirname(__file__))
from catalogue import PRODUCTS
from shopify_client import Shopify
import upload_images

OUT = os.path.expanduser("~/ninetees-work/generated")
REF_DIR = os.path.expanduser("~/Documents/NineTees")
MODELS_DIR = os.path.expanduser("~/ninetees-work/models")
# The four people in the home page hero, cropped as portraits. Every model shot casts one of them.
MODELS = {
    "Women": [("model-d-slipdress.png", "the young woman with long dark hair"), ("model-b-buckethat.png", "the young woman with long auburn hair")],
    "Men": [("model-c-tracktop.png", "the young man with the short dark fringe"), ("model-a-parka.png", "the young man with long brown hair")],
}
MODELS["Unisex"] = MODELS["Women"] + MODELS["Men"]
RESTYLE_FILE = os.path.expanduser("~/ninetees-work/restyle_skus.txt")
RESTYLE = set(open(RESTYLE_FILE).read().split()) if os.path.exists(RESTYLE_FILE) else set()
MODEL = "gpt-image-1"
QUALITY = os.environ.get("NINETEES_IMAGE_QUALITY", "medium")
COST = {"low": 0.02, "medium": 0.07, "high": 0.19}  # rough USD per portrait image

def api_key():
    k = os.environ.get("OPENAI_API_KEY")
    if not k and os.path.exists(os.path.expanduser("~/.config/helm/openai.env")):
        k = dict(l.strip().split("=", 1) for l in open(os.path.expanduser("~/.config/helm/openai.env")) if "=" in l).get("OPENAI_API_KEY")
    if not k: sys.exit("No OpenAI key. Put OPENAI_API_KEY=... in ~/.config/helm/openai.env")
    return k

BRAND = ("Photorealistic fashion e-commerce photography for NineTees, a modern, sleek British label that only makes 1990s UK "
         "styles: Britpop, Madchester, rave and terrace culture. Contemporary premium retail look, sharp focus, natural colour, no text, no logos, no watermarks.")

def cast(p):
    """Deterministically pick one of the hero models for this product: (portrait path, description)."""
    options = MODELS[p["gender"]]
    f, desc = options[sum(map(ord, p["handle"])) % len(options)]
    return os.path.join(MODELS_DIR, f), desc

MODEL_RULE = ("The person wearing it is the model in the LAST reference image, a portrait crop: reproduce that exact person, "
              "same face, hair, skin tone and build, as if photographed on the same day. Do not invent a different person. "
              "Style the rest of their outfit simply in plain neutral pieces that suit the product; the product is the focus.")

def prompts(p):
    garment = f"{p['title']} ({p['type'].lower()}, colour {p['colour']}). {p['desc']}"
    return [
        ("product", f"{BRAND} Studio product shot of exactly this garment: {garment} Shown alone, front view, laid flat or on an invisible mannequin as appropriate for the item, centred, on a pure white seamless background with soft even studio lighting and a faint natural shadow. Nothing else in frame."),
        ("model-full", f"{BRAND} Full-length editorial shot of {cast(p)[1]} wearing exactly this garment: {garment} Location: a concrete skate park in Manchester on an overcast day, muted grey light, red-brick terrace houses out of focus behind. Confident relaxed pose, 90s Britpop styling, shot on 50mm at f/2. The garment must match the FIRST reference image exactly. {MODEL_RULE}"),
        ("model-half", f"{BRAND} Half-length editorial shot of {cast(p)[1]} wearing exactly this garment: {garment} Different pose and angle from a front-on shot: three-quarter turn, looking slightly off camera, leaning against a weathered red-brick wall with a faded painted advert. Overcast British daylight. The garment must match the FIRST reference image exactly. {MODEL_RULE}"),
        ("detail", f"{BRAND} Second studio shot of exactly this garment: {garment} Either the back view, or a close detail of the fabric, print and hardware if the item is small. Pure white seamless background, soft studio lighting, same product as the reference."),
    ]

def reference_for(p, shop_products):
    """Best available reference image for a product: its current Shopify photo, else none.
    Restyled originals deliberately get no reference so the garment follows the UK 90s copy, not the old photo."""
    if p["sku"] in RESTYLE: return None
    sp = shop_products.get(p["handle"])
    if sp and sp["images"]:
        path = os.path.join(OUT, p["handle"], "reference.png"); os.makedirs(os.path.dirname(path), exist_ok=True)
        if not os.path.exists(path):
            open(path, "wb").write(urllib.request.urlopen(urllib.request.Request(sp["images"][0]["url"], headers={"User-Agent": "Mozilla/5.0"}), timeout=60).read())
        return path
    return None

def openai_image(key, prompt, refs=None, size="1024x1536"):
    """Generate (no refs) or edit (with reference images) and return PNG bytes."""
    if refs:
        boundary = uuid.uuid4().hex; body = bytearray()
        def field(name, value): body.extend(f"--{boundary}\r\nContent-Disposition: form-data; name=\"{name}\"\r\n\r\n{value}\r\n".encode())
        field("model", MODEL); field("prompt", prompt); field("size", size); field("quality", QUALITY); field("n", "1")
        for r in refs:
            mime = mimetypes.guess_type(r)[0] or "image/png"
            body.extend(f"--{boundary}\r\nContent-Disposition: form-data; name=\"image[]\"; filename=\"{os.path.basename(r)}\"\r\nContent-Type: {mime}\r\n\r\n".encode()); body.extend(open(r, "rb").read()); body.extend(b"\r\n")
        body.extend(f"--{boundary}--\r\n".encode())
        req = urllib.request.Request("https://api.openai.com/v1/images/edits", data=bytes(body), headers={"Authorization": f"Bearer {key}", "Content-Type": f"multipart/form-data; boundary={boundary}"})
    else:
        req = urllib.request.Request("https://api.openai.com/v1/images/generations", data=json.dumps({"model": MODEL, "prompt": prompt, "size": size, "quality": QUALITY, "n": 1}).encode(), headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"})
    for attempt in range(7):
        try:
            with urllib.request.urlopen(req, timeout=300) as r: return base64.b64decode(json.loads(r.read())["data"][0]["b64_json"])
        except urllib.error.HTTPError as e:
            msg = e.read().decode()[:300]
            if e.code in (429, 500, 502, 503) and attempt < 6: time.sleep(15 * (attempt + 1)); continue
            raise RuntimeError(f"OpenAI {e.code}: {msg}")

def generate_product(p, key, shop_products, dry):
    folder = os.path.join(OUT, p["handle"]); os.makedirs(folder, exist_ok=True)
    ref = reference_for(p, shop_products); made = []
    for i, (name, prompt) in enumerate(prompts(p), 1):
        path = os.path.join(folder, f"{i}-{name}.png")
        if os.path.exists(path): made.append(path); continue
        if dry: print(f"  [{p['handle']}] {name}: ref={'shopify' if ref and i == 1 else ('product shot' if i > 1 else 'none')}\n     {prompt[:160]}…"); continue
        if i == 1: refs = [ref] if ref else None
        elif name.startswith("model"): refs = [os.path.join(folder, "1-product.png"), cast(p)[0]]
        else: refs = [os.path.join(folder, "1-product.png")]
        png = openai_image(key, prompt, refs, size="1024x1536")
        open(path, "wb").write(png); made.append(path); print(f"  [{p['handle']}] {name} done")
    return made

def upload(p, files, shop):
    sp = shop.gql("query($h:String!){ productByHandle(handle:$h){ id title media(first:20){nodes{id}} } }", {"h": p["handle"]})["data"]["productByHandle"]
    if sp["media"]["nodes"]:
        shop.gql("mutation($productId:ID!,$mediaIds:[ID!]!){ productDeleteMedia(productId:$productId, mediaIds:$mediaIds){ deletedMediaIds mediaUserErrors{message} } }", {"productId": sp["id"], "mediaIds": [m["id"] for m in sp["media"]["nodes"]]})
    for f in files:
        url = upload_images.staged_upload(shop, f); upload_images.attach(shop, sp["id"], url, f"{p['title']} - {os.path.basename(f).split('-', 1)[1].rsplit('.', 1)[0]}")
    print(f"  [{p['handle']}] {len(files)} images attached")

def hero(key):
    os.makedirs(OUT, exist_ok=True); path = os.path.join(OUT, "hero-skatepark.png")
    prompt = (f"{BRAND} Wide cinematic group shot of four friends, mixed gender, early twenties, at a concrete skate park in Manchester under a heavy overcast sky. "
              "They wear 1990s UK fashion: a fishtail parka, a bucket hat and tie-dye tee, a colour-block shell jacket, a slip dress over a white tee with platform trainers. "
              "One sits on a skateboard, one leans on the rail, relaxed and slightly bored in the Britpop way. Red-brick terraces and a distant tower block behind. "
              "Editorial fashion campaign, natural muted colour, sharp, shot on 35mm.")
    open(path, "wb").write(openai_image(key, prompt, None, size="1536x1024")); print("hero ->", path)

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--only"); ap.add_argument("--dry-run", action="store_true"); ap.add_argument("--upload", action="store_true"); ap.add_argument("--hero", action="store_true"); ap.add_argument("--workers", type=int, default=3)
    a = ap.parse_args(); key = None if a.dry_run else api_key()
    if a.hero: hero(key); return
    todo = [p for p in PRODUCTS if not a.only or p["handle"] in a.only.split(",")]
    shop = Shopify()
    shop_products = {p["handle"]: p for p in json.load(open(os.path.join(os.path.dirname(__file__), "..", "src", "data", "catalogue.json")))["products"]}
    missing = sum(1 for p in todo for i, (n, _) in enumerate(prompts(p), 1) if not os.path.exists(os.path.join(OUT, p["handle"], f"{i}-{n}.png")))
    print(f"{len(todo)} products, {missing} images to generate at quality={QUALITY}: about ${missing * COST.get(QUALITY, .07):.0f}")
    def work(p):
        try:
            files = generate_product(p, key, shop_products, a.dry_run)
            if a.upload and not a.dry_run and len(files) == 4: upload(p, files, shop)
        except Exception as e: print(f"  [{p['handle']}] FAILED: {e}")
    with ThreadPoolExecutor(1 if a.dry_run else a.workers) as ex: list(ex.map(work, todo))

if __name__ == "__main__":
    main()
