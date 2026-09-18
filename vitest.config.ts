import { defineConfig } from 'vitest/config'

// Unit tests only. The Playwright suite in e2e/ has its own runner (npm run e2e).
export default defineConfig({
  test: { include: ['src/**/*.test.ts'], environment: 'node' },
})
