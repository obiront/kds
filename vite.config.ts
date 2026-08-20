import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base must match the GitHub Pages sub-path: obiront.github.io/kds
export default defineConfig({
  base: '/kds/',
  plugins: [react(), tailwindcss()],
})
