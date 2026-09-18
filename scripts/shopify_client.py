"""Minimal Shopify Admin GraphQL client. Credentials come from ~/.config/helm/shopify-ninetees.env, or from
SHOPIFY_STORE / SHOPIFY_ADMIN_TOKEN in the environment (used by the catalogue refresh workflow)."""
import json, os, time, urllib.request, urllib.error

ENV_PATH = os.path.expanduser("~/.config/helm/shopify-ninetees.env")
API_VERSION = "2025-07"

KEYS = ("SHOPIFY_STORE", "SHOPIFY_ADMIN_TOKEN", "SHOPIFY_STOREFRONT_TOKEN", "SHOPIFY_CLIENT_ID", "SHOPIFY_CLIENT_SECRET")

def load_env():
    """The local env file, with real environment variables taking precedence (that is how CI supplies them)."""
    env = {}
    if os.path.exists(ENV_PATH):
        env = dict(l.strip().split("=", 1) for l in open(ENV_PATH) if "=" in l and not l.startswith("#"))
    env.update({k: os.environ[k] for k in KEYS if os.environ.get(k)})
    return env

class Shopify:
    def __init__(self):
        env = load_env()
        self.shop = env["SHOPIFY_STORE"]
        self.token = env["SHOPIFY_ADMIN_TOKEN"]
        self.storefront_token = env.get("SHOPIFY_STOREFRONT_TOKEN")
        self.url = f"https://{self.shop}/admin/api/{API_VERSION}/graphql.json"

    def gql(self, query, variables=None, retries=4):
        body = json.dumps({"query": query, "variables": variables or {}}).encode()
        for attempt in range(retries):
            req = urllib.request.Request(self.url, data=body, headers={
                "User-Agent": "NineTees-loader/1.0", "Accept": "application/json",
                "Content-Type": "application/json", "X-Shopify-Access-Token": self.token})
            try:
                with urllib.request.urlopen(req, timeout=60) as r:
                    out = json.loads(r.read())
            except urllib.error.HTTPError as e:
                if e.code in (429, 502, 503) and attempt < retries - 1:
                    time.sleep(2 * (attempt + 1)); continue
                raise RuntimeError(f"HTTP {e.code}: {e.read().decode()[:400]}")
            if out.get("errors") and any("THROTTLED" in (er.get("extensions") or {}).get("code", "") for er in out["errors"]):
                time.sleep(2); continue
            th = (out.get("extensions") or {}).get("cost", {}).get("throttleStatus", {})
            if th and th.get("currentlyAvailable", 2000) < 300:
                time.sleep(3)
            return out
        raise RuntimeError("gave up after retries")

    def paginate(self, query, path, variables=None, page_size=100):
        """Yield nodes from a connection at `path` (dot path into data) using cursor pagination."""
        cursor = None
        while True:
            v = dict(variables or {}); v["first"] = page_size; v["after"] = cursor
            out = self.gql(query, v)
            if "data" not in out: raise RuntimeError(json.dumps(out)[:500])
            node = out["data"]
            for part in path.split("."): node = node[part]
            yield from node["nodes"]
            if not node["pageInfo"]["hasNextPage"]: break
            cursor = node["pageInfo"]["endCursor"]
