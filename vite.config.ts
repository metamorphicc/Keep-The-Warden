import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base so the build can be dropped on any static host / subpath
// (GitHub Pages, Netlify, Vercel, a folder behind nginx, ...).
export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    host: true, // expose on LAN so a phone / tunnel can reach the dev server
    port: 5173,
    // Allow ngrok / cloudflared / localtunnel hostnames while developing
    // against the real Telegram client.
    allowedHosts: true,
  },
  build: {
    target: 'es2019',
    assetsInlineLimit: 4096,
  },
})
