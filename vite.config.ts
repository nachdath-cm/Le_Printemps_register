import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const API_TARGET = process.env.API_TARGET ?? 'http://localhost:5174';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeManifestIcons: true,
      // PWA active uniquement en build : en developpement, un service worker
      // qui cache dist/ rend les modifications invisibles.
      devOptions: { enabled: false },

      // Depuis vite-plugin-pwa v1, toutes les cles du manifeste vivent ici.
      manifest: {
        id: '/',
        name: 'Le Printemps — Soins & Coiffures',
        short_name: 'Le Printemps',
        description:
          'Registre des prestations — Le Printemps, institut de beauté et spa à Jéricho, Cotonou.',
        lang: 'fr',
        dir: 'ltr',
        start_url: '/borne',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        // theme_color : le primary de la marque, dans sa version conforme AA
        // (#f2824e ne donne que 2.6:1 avec du texte blanc — cf. src/index.css).
        theme_color: '#bd5822',
        background_color: '#faf6f2',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: '/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Formulaire client',
            short_name: 'S’inscrire',
            url: '/client',
            description: 'Ouvrir directement le formulaire d’inscription.',
          },
          {
            name: 'Registre',
            short_name: 'Registre',
            url: '/admin',
            description: 'Consulter le registre des prestations.',
          },
        ],
      },

      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}'],
        navigateFallback: '/index.html',
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        // Le registre est une donnee vivante : jamais de cache sur /api.
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    // Ecoute sur toutes les interfaces : sans cela Vite ne repond que sur
    // localhost et le QR code affiche par la borne renvoie a « localhost »
    // sur le telephone de la cliente, qui n'aboutit nulle part.
    host: true,
    proxy: {
      '/api': { target: API_TARGET, changeOrigin: true },
    },
  },
  build: {
    target: 'es2022',
    sourcemap: false,
  },
});
