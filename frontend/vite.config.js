import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Precache the built app shell only. Deliberately no runtimeCaching
      // entry for /salesforce/* - offline data handling is the app's own
      // IndexedDB queue (frontend/src/offline/), not Workbox transparently
      // retrying API calls. Mixing both models would double up retry logic.
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
      },
      manifest: {
        name: 'JSAN GeoSales 360',
        short_name: 'GeoSales 360',
        description: 'Field Sales Intelligence - GIS-driven field sales, on Salesforce.',
        theme_color: '#0B2E4F',
        background_color: '#0B2E4F',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
})
