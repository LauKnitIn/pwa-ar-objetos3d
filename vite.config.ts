import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      // El manifest ya existe a mano desde la Sesión 27 — aquí solo
      // pedimos a Workbox que genere el Service Worker, no el manifest.
      manifest: false,
      registerType: 'autoUpdate',
      injectRegister: false, // registramos nosotros mismos en main.ts
      workbox: {
        // Esto es lo que resuelve la Sesión 29: la lista de precaché se
        // genera a partir de dist/ DESPUÉS del build, con los nombres de
        // archivo reales (con hash incluido) — nunca escrita a mano.
        globPatterns: ['**/*.{html,js,css,png,json}'],
        runtimeCaching: [
          {
            urlPattern: /\/iconos\//,
            handler: 'CacheFirst',
            options: { cacheName: 'imagenes', expiration: { maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 } },
          },
          { urlPattern: /\/api\//, handler: 'NetworkFirst', options: { cacheName: 'api-atlas3d' } },
        ],
      },
    }),
  ],
});