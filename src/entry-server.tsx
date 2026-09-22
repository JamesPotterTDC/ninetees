import { StrictMode } from 'react'
import { renderToPipeableStream } from 'react-dom/server'
import { StaticRouter } from 'react-router'
import { Writable } from 'node:stream'
import App from './App'
import { CartProvider } from './lib/cart'

export { config } from './config'
export { img } from './lib/catalogue-core'

/** Renders one route to an HTML string for the prerender step. Streams so lazily loaded routes resolve before
 *  the markup is collected; the client then hydrates this HTML instead of rendering from scratch. */
export function render(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    let html = ''
    const sink = new Writable({
      write(chunk, _encoding, callback) { html += chunk.toString(); callback() },
      final(callback) { callback(); resolve(html) },
    })
    const { pipe } = renderToPipeableStream(
      <StrictMode>
        <StaticRouter location={url}>
          <CartProvider>
            <App resume={null} />
          </CartProvider>
        </StaticRouter>
      </StrictMode>,
      {
        // Everything has resolved by onAllReady, so inline every Suspense boundary. Left at the default, React
        // outlines boundaries over ~12 kB into hidden blocks swapped in by script, which hides the page body
        // from crawlers and briefly duplicates content while the page hydrates.
        progressiveChunkSize: Number.MAX_SAFE_INTEGER,
        onAllReady() { pipe(sink) },
        onError(error) { reject(error) },
      },
    )
  })
}
