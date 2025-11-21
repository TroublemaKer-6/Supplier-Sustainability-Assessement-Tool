import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  base: process.env.GH_PAGES_BASE ?? '/',
  plugins: [react()],
  server: {
    port: 3000,
    open: true
  }
})
