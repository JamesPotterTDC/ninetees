// Serves dist/ the way GitHub Pages does: /products/x resolves to products/x.html, directories to index.html,
// anything unknown gets 404.html with a 404 status. Used by the Playwright suite (vite preview cannot do the
// extensionless .html mapping, so it would hand every deep link the home page instead).
import { createServer } from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'

const dist = join(fileURLToPath(new URL('.', import.meta.url)), '..', 'dist')
const host = process.env.HOST ?? '127.0.0.1'
const port = Number(process.env.PORT ?? 4173)
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain', '.ico': 'image/x-icon' }

function resolve(pathname) {
  const clean = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '')
  const candidates = clean.endsWith('/') ? [join(clean, 'index.html')] : [clean, `${clean}.html`, join(clean, 'index.html')]
  for (const c of candidates) {
    const file = join(dist, c)
    if (file.startsWith(dist) && existsSync(file) && statSync(file).isFile()) return { file, status: 200 }
  }
  return { file: join(dist, '404.html'), status: 404 }
}

createServer((req, res) => {
  const { file, status } = resolve(new URL(req.url, 'http://x').pathname)
  res.writeHead(status, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-cache' })
  createReadStream(file).pipe(res)
}).listen(port, host, () => console.log(`serving ${dist} at http://${host}:${port}/`))
