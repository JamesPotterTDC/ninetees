"""Upload local product photos to Shopify and attach them to products (staged upload + productCreateMedia).

  python3 scripts/upload_images.py                # attach every mapped image whose product has no media
  python3 scripts/upload_images.py --replace      # also replace existing media
  python3 scripts/upload_images.py --file "/path/NineTees.png" --as-file   # upload a brand asset, print CDN url
"""
import argparse, json, mimetypes, os, sys, time, urllib.request, uuid
sys.path.insert(0, os.path.dirname(__file__))
from shopify_client import Shopify

IMG_DIR = os.path.expanduser("~/Documents/NineTees")
MAP = {  # product handle -> local file
    "velour-tracksuit": "Velour Tracksuit.png",
    "acid-wash-denim-jacket": "Acid Wash Denim Jacket.png",
    "swirl-mesh-long-sleeve": "Mesh top.png",
    "lettuce-hem-baby-tee": "Crop Top.png",
}

def staged_upload(shop, path, resource="IMAGE"):
    name = os.path.basename(path); size = os.path.getsize(path); mime = mimetypes.guess_type(path)[0] or "image/png"
    r = shop.gql("""mutation($input:[StagedUploadInput!]!){ stagedUploadsCreate(input:$input){ stagedTargets{ url resourceUrl parameters{name value} } userErrors{field message} } }""",
                 {"input": [{"resource": resource, "filename": name, "mimeType": mime, "httpMethod": "POST", "fileSize": str(size)}]})
    t = r["data"]["stagedUploadsCreate"]; 
    if t["userErrors"]: raise RuntimeError(t["userErrors"])
    target = t["stagedTargets"][0]
    boundary = uuid.uuid4().hex; body = bytearray()
    for p in target["parameters"]:
        body += f"--{boundary}\r\nContent-Disposition: form-data; name=\"{p['name']}\"\r\n\r\n{p['value']}\r\n".encode()
    body += f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"{name}\"\r\nContent-Type: {mime}\r\n\r\n".encode()
    body += open(path, "rb").read() + f"\r\n--{boundary}--\r\n".encode()
    req = urllib.request.Request(target["url"], data=bytes(body), headers={"Content-Type": f"multipart/form-data; boundary={boundary}", "User-Agent": "NineTees-upload/1.0"}, method="POST")
    with urllib.request.urlopen(req, timeout=120) as resp:
        if resp.status not in (200, 201, 204): raise RuntimeError(f"upload HTTP {resp.status}")
    return target["resourceUrl"]

def attach(shop, product_id, resource_url, alt):
    r = shop.gql("""mutation($productId:ID!,$media:[CreateMediaInput!]!){ productCreateMedia(productId:$productId, media:$media){ media{ id status } mediaUserErrors{field message} } }""",
                 {"productId": product_id, "media": [{"originalSource": resource_url, "alt": alt, "mediaContentType": "IMAGE"}]})
    out = r["data"]["productCreateMedia"]
    if out["mediaUserErrors"]: raise RuntimeError(out["mediaUserErrors"])
    return out["media"][0]["id"]

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--replace", action="store_true"); ap.add_argument("--file"); ap.add_argument("--as-file", action="store_true")
    a = ap.parse_args(); shop = Shopify()
    if a.file and a.as_file:
        url = staged_upload(shop, a.file, "FILE")
        r = shop.gql("""mutation($files:[FileCreateInput!]!){ fileCreate(files:$files){ files{ id fileStatus ... on MediaImage{ image{url} } } userErrors{message} } }""",
                     {"files": [{"originalSource": url, "contentType": "IMAGE", "alt": os.path.basename(a.file)}]})
        f = r["data"]["fileCreate"]["files"][0]; fid = f["id"]
        for _ in range(20):
            time.sleep(2)
            q = shop.gql("query($id:ID!){ node(id:$id){ ... on MediaImage{ fileStatus image{url} } } }", {"id": fid})["data"]["node"]
            if q and q.get("image") and q["image"].get("url"): print("CDN URL:", q["image"]["url"]); return
        print("uploaded but not yet processed:", fid); return
    for handle, fname in MAP.items():
        path = os.path.join(IMG_DIR, fname)
        if not os.path.exists(path): print(f"  {handle}: missing {fname}"); continue
        p = shop.gql("query($h:String!){ productByHandle(handle:$h){ id title media(first:10){nodes{id}} } }", {"h": handle})["data"]["productByHandle"]
        if not p: print(f"  {handle}: no such product"); continue
        if p["media"]["nodes"] and not a.replace: print(f"  {handle}: already has media, skipping"); continue
        if p["media"]["nodes"] and a.replace:
            shop.gql("mutation($productId:ID!,$mediaIds:[ID!]!){ productDeleteMedia(productId:$productId, mediaIds:$mediaIds){ deletedMediaIds mediaUserErrors{message} } }",
                     {"productId": p["id"], "mediaIds": [m["id"] for m in p["media"]["nodes"]]})
        url = staged_upload(shop, path); mid = attach(shop, p["id"], url, p["title"])
        print(f"  {handle}: uploaded {fname} -> {mid}")

if __name__ == "__main__":
    main()
