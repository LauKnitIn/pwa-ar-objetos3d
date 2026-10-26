import { obtenerDescargas, marcarDescargaLista } from "../db.js";

export const ETIQUETA_SYNC = "descargar-modelos";
export const CACHE_MODELOS = "modelos-3d";
//export const urlDeModelo = (id) => `/modelos/${id}.json`;
export const urlDeModelo = (id) => '${import.meta.env.BASE_URL}modelos/${id}.json';

export async function descargarPendientes(db, alProgresar) {
  const todas = await obtenerDescargas(db);
  const total = todas.length;
  let hechos = todas.filter((d) => d.estado === "listo").length;
  const cache = await caches.open(CACHE_MODELOS);
  let descargadas = 0;

  for (const d of todas.filter((x) => x.estado === "pendiente")) {
    const resp = await fetch(urlDeModelo(d.modeloId), { cache: "reload" });
    if (!resp.ok) {
      throw new Error(`${d.modeloId}: el servidor respondió ${resp.status}`);
    }
    
    await cache.put(urlDeModelo(d.modeloId), resp);
    await marcarDescargaLista(db, d.modeloId);
    
    hechos++;
    descargadas++;
    
    if (typeof alProgresar === "function") {
      await alProgresar(hechos, total);
    }
  }
  
  return descargadas;
}