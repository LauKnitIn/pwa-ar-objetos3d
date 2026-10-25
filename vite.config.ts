import { VitePWA } from 'vite-plugin-pwa';

export default {
  plugins: [
    VitePWA({
      manifest: false,
      registerType: "autoUpdate",
      injectRegister: false,
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.js",
      injectManifest: {
        globPatterns: ["**/*.{html,js,css,png,json}"],
        globIgnores: ["modelos/**"], // Evita el precaché automático de las fichas
      },
    }),
  ]
};