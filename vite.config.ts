import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Served from https://jamespottertdc.github.io/ninetees/ so assets need the repo path as base.
export default defineConfig({
  base: '/ninetees/',
  plugins: [react()],
})
