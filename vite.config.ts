import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // GitHub Pages serves this as a project site at /ACTP-Shape-Tool/, not the
  // domain root — only the production build needs the non-root base; dev
  // stays at '/' so `npm run dev` is unaffected.
  base: command === 'build' ? '/ACTP-Shape-Tool/' : '/',
  plugins: [react(), tailwindcss()],
  worker: {
    format: 'es',
  },
}))
