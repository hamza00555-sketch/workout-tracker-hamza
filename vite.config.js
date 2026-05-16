import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      manifest: {
        name: 'راتبي - مخطط الراتب الشهري',
        short_name: 'راتبي',
        description: 'سيطر على راتبك قبل ما يتطير',
        start_url: '/',
        display: 'standalone',
        background_color: '#0D0A26',
        theme_color: '#0D0A26',
        orientation: 'portrait',
        lang: 'ar',
        dir: 'rtl',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,otf}'],
      },
    }),
  ],
  build: { outDir: 'dist', sourcemap: false },
})
