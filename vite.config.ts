import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Served from https://www.ninetees.co.uk/ (GitHub Pages with a custom domain), so assets live at the root.
export default defineConfig({
  base: '/',
  plugins: [react()],
})
