import { config } from '../config'

type GraphQLResponse<T> = { data?: T; errors?: { message: string }[] }

/** One call to Shopify's public Storefront API. Throws on transport or GraphQL errors so callers can fall back. */
export async function storefront<T>(query: string, variables: Record<string, unknown> = {}, signal?: AbortSignal): Promise<T> {
  if (!config.storefrontToken) throw new Error('Storefront token not configured')
  const res = await fetch(`https://${config.shopDomain}/api/${config.storefrontApiVersion}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Storefront-Access-Token': config.storefrontToken },
    body: JSON.stringify({ query, variables }),
    signal,
  })
  if (!res.ok) throw new Error(`Storefront API ${res.status}`)
  const json = (await res.json()) as GraphQLResponse<T>
  if (json.errors?.length || !json.data) throw new Error(json.errors?.[0]?.message ?? 'Storefront API returned no data')
  return json.data
}
