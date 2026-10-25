import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { CacheFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { clientsClaim } from "workbox-core";
import { abrirBaseDeDatos } from "./db.js";
import { descargarPendientes, ETIQUETA_SYNC } from "./descargas.js";

self.skipWaiting();
clientsClaim();
cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

registerRoute(
  ({ url }) => url.pathname.startsWith("/modelos/"),
  async ({ request }) => {
    const guardada = await caches.match(request, { cacheName: "modelos-3d" });
    return guardada ?? fetch(request);
  }
);

registerRoute(
  ({ url }) => url.pathname.startsWith("/iconos/"),
  new CacheFirst({
    cacheName: "imagenes",
    plugins: [new ExpirationPlugin({ maxEntries: 60, maxAgeSeconds: 30 * 24 * 60 * 60 })],
  })
);

async function avisarALasVentanas(mensaje) {
  const ventanas = await self.clients.matchAll({ type: "window" });
  ventanas.forEach((v) => v.postMessage(mensaje));
  return ventanas;
}

self.addEventListener("sync", (event) => {
  if (event.tag !== ETIQUETA_SYNC) return;
  event.waitUntil(
    (async () => {
      const db = await abrirBaseDeDatos();
      try {
        const n = await descargarPendientes(db, async (hechos, total) => {
          await avisarALasVentanas({ tipo: "progreso", hechos, total });
        });
        if (n === 0) return;
        
        const ventanas = await avisarALasVentanas({ tipo: "descarga-completa" });
        
        // Mostrar notificación del sistema solo si NO hay ninguna ventana visible
        if (!ventanas.some((v) => v.visibilityState === "visible")) {
          await self.registration.showNotification("Modelos listos", {
            body: "Las fichas ya están en tu dispositivo: puedes consultarlas sin conexión.",
            icon: "/iconos/icon-192.png",
            tag: "atlas-descarga",
            data: { url: "/" },
          });
        }
      } catch (err) {
        if (event.lastChance) {
          await self.registration.showNotification("No se pudo completar la descarga", {
            body: "Abre el Atlas con conexión y vuelve a pulsar «Descargar».",
            icon: "/iconos/icon-192.png",
            tag: "atlas-descarga",
            data: { url: "/" },
          });
        }
        throw err;
      } finally {
        db.close();
      }
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destino = new URL(event.notification.data?.url ?? "/", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const ventanas = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const abierta = ventanas.find((v) => new URL(v.url).origin === self.location.origin);
      if (abierta) return abierta.focus();
      return self.clients.openWindow(destino);
    })()
  );
});