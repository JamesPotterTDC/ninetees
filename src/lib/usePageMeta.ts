import { useEffect } from 'react'
import { config } from '../config'

/** Sets the tab title and meta description for the current page. Call with no title on the home page. */
export function usePageMeta(title?: string, description?: string) {
  useEffect(() => {
    document.title = title ? `${title} | ${config.brand.name}` : `${config.brand.name} · ${config.brand.tagline}`
    const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (!meta) return
    // Keep the shipped description as the fallback so the home page and 404 read the same as the static HTML.
    if (!meta.dataset.default) meta.dataset.default = meta.content
    meta.content = tidy(description) ?? meta.dataset.default
  }, [title, description])
}

function tidy(s?: string) {
  if (!s) return undefined
  const t = s.replace(/\s+/g, ' ').trim()
  if (!t) return undefined
  return t.length > 160 ? `${t.slice(0, 157).trimEnd()}…` : t
}
