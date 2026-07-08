import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        strategies: 'generateSW',
        manifestFilename: 'manifest.json',
        manifest: {
          id: '/',
          short_name: 'ObraMatch',
          name: 'ObraMatch Diário',
          description: 'Aplicativo de registro diário de execução de obras',
          lang: 'pt-BR',
          dir: 'ltr',
          categories: ['business', 'productivity', 'utilities'],
          icons: [
            {
              src: '/icon-192.png',
              type: 'image/png',
              sizes: '192x192',
              purpose: 'any'
            },
            {
              src: '/icon-512.png',
              type: 'image/png',
              sizes: '512x512',
              purpose: 'any'
            },
            {
              src: '/icon-512-maskable.png',
              type: 'image/png',
              sizes: '512x512',
              purpose: 'maskable'
            }
          ],
          start_url: '/',
          background_color: '#FFFFFF',
          theme_color: '#0A3D91',
          display: 'standalone',
          display_override: ['standalone', 'minimal-ui'],
          orientation: 'portrait',
          scope: '/',
          prefer_related_applications: false,
          launch_handler: { client_mode: 'navigate-existing' }
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg}'],
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [/^\/api\//, /^\/\.well-known\//, /^\/politica-de-privacidade/, /^\/termos-de-uso/, /^\/excluir-conta/],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true
        }
      })
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify - file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
