import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      manifest: false, // El manifest ya lo tenemos creado a mano
      registerType: 'autoUpdate',
      injectRegister: false, // Lo registraremos manualmente nosotros mismos
      workbox: {
        // Workbox genera el precaché a partir de la carpeta dist/ DESPUÉS del build
        globPatterns: ['**/*.{html,js,css,png,json}'],
        runtimeCaching: [
          {
            urlPattern: /\/iconos\//,
            handler: 'CacheFirst',
            options: { 
              cacheName: 'imagenes', 
              expiration: { maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 } 
            },
          },
          { 
            urlPattern: /\/api\//, 
            handler: 'NetworkFirst', 
            options: { cacheName: 'api-atlas3d' } 
          },
        ],
      },
    }),
  ],
});