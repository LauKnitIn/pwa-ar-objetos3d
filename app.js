
import '/src/style.css'
import { ControladorVisor } from '/src/controlador/controladorVisor';
import { crearVisor } from '/src/visor.ts';
import { hayOrientacionReal, pedirPermisoOrientacion, iniciarControlOrientacion } from '/src/sensores.ts';
import { 
  abrirBaseDeDatos, 
  marcarModeloVisto, 
  alternarFavorito, 
  obtenerFavoritos,
  derivarClave,
  guardarNotaDeEstudio,
  encolarDescargas
} from './db.js';
import { iniciarCamaraDeFondo, detenerCamaraDeFondo } from '/src/camara.ts';
import { registerSW } from 'virtual:pwa-register';
import { descargarPendientes, ETIQUETA_SYNC } from '/src/descargas.js'; 

import { diagnosticarAR, mensajeSoporteAR, pedirSesionAR } from "/src/xr.js";


const listaEl = document.querySelector("#lista-catalogo");
const lienzoEl = document.querySelector("#lienzo-3d");
const btnOrientacion = document.querySelector("#btn-orientacion");
const btnCalibrar = document.querySelector("#btn-calibrar");

const videoEl = document.querySelector("#fondo-camara");
const btnCamara = document.querySelector("#btn-camara");
const mensajeVisor = document.querySelector("#mensaje-visor");

const btnAvisos = document.querySelector("#btn-avisos");
const btnDescargar = document.querySelector("#btn-descargar");
const estadoDescargaEl = document.querySelector("#estado-descarga");

const btnAR = document.querySelector("#btn-ar");
const estadoAR = document.querySelector("#estado-ar");
const diagAR = document.querySelector("#diag-ar");
const detallesAR = document.querySelector(".diag-ar");
const btnRecomprobar = document.querySelector("#btn-recomprobar");
const overlayAR = document.querySelector("#xr-overlay");
const btnSalirAR = document.querySelector("#btn-salir-ar");


let visor = null;
let control = null;
let streamFondo = null;
let sesionAR = null;
const MODELOS_IDS = ["modelo-demo-1", "modelo-demo-2", "modelo-demo-3"];

//const controladorVisor = new ControladorVisor(listaEl,lienzoEl,descripcion);
//controladorVisor.iniciar();

const updateSW = registerSW({
  immediate: true,
  onRegisteredSW(swUrl, registration) {
    console.log('SW de Workbox registrado exitosamente:', swUrl, registration);
  },
  onRegisterError(error) {
    console.error('Error al registrar el SW de Workbox:', error);
  },
});

if (lienzoEl) {
  visor = crearVisor(lienzoEl);
}

if (btnOrientacion) {
  btnOrientacion.addEventListener("click", async () => {
    if (control) {
      control.detener();
      control = null;
      visor.controlPorSensores(false);
      btnOrientacion.textContent = "📱 Rotar con el teléfono";
      btnCalibrar.disabled = true;
      return;
    }

    const permiso = await pedirPermisoOrientacion();
    if (permiso === "denied") {
      alert("Denegaste el acceso a los sensores. Usa el ratón o el dedo.");
      return;
    }

    if (permiso === "no-soportado" || !(await hayOrientacionReal())) {
      alert("Este dispositivo no tiene sensores de orientación. Usa el ratón o el dedo para girar el visor.");
      return;
    }

    visor.controlPorSensores(true);
    control = iniciarControlOrientacion((x, y) => visor.rotarHacia(x, y));
    btnOrientacion.textContent = "📱 Sensores: ACTIVOS (toca para apagar)";
    btnCalibrar.disabled = false;
  });
}

if (btnCalibrar) {
  btnCalibrar.addEventListener("click", () => {
    if (control && control.calibrar) {
      control.calibrar();
    }
  });
}


function avisarVisor(texto) {
  if (mensajeVisor) mensajeVisor.textContent = texto;
}

async function apagarCamara() {
  if (streamFondo && videoEl) {
    detenerCamaraDeFondo(videoEl, streamFondo);
    streamFondo = null;
    if (visor) visor.fondoTransparente(false);
    if (btnCamara) btnCamara.textContent = "📷 Cámara de fondo";
    avisarVisor("Cámara apagada.");
  }
}

if (btnCamara && videoEl) {
  btnCamara.addEventListener("click", async () => {
    if (streamFondo) {
      await apagarCamara();
      return;
    }

    try {
      streamFondo = await iniciarCamaraDeFondo(videoEl);
      if (visor) visor.fondoTransparente(true);
      btnCamara.textContent = "📷 Cámara: ACTIVA (toca para apagar)";
      avisarVisor("");
    } catch (error) {
      console.error("Error al acceder a la cámara:", error);
      if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
        avisarVisor("Bloqueaste el permiso de cámara. El visor sigue funcionando sin ella.");
      } else {
        avisarVisor("No se pudo acceder a la cámara en este dispositivo o entorno.");
      }
    }
  });
}

document.addEventListener("visibilitychange", () => {
  if (document.hidden && streamFondo) {
    apagarCamara();
    avisarVisor("La cámara se apagó al salir de la página. Vuelve a activarla cuando quieras.");
  }
});

if (btnAvisos) {
  btnAvisos.addEventListener("click", async () => {
    const permiso = await Notification.requestPermission();
    if (permiso === "granted") {
      alert("Avisos activados con éxito.");
    } else {
      alert("Permiso de avisos denegado.");
    }
  });
}

if (btnDescargar) {
  btnDescargar.addEventListener("click", async () => {
    const db = await abrirBaseDeDatos();
    await encolarDescargas(db, MODELOS_IDS);
    estadoDescargaEl.textContent = "Iniciando descarga...";
    btnDescargar.disabled = true;

    try {
      let enSegundoPlano = false;
      if ("serviceWorker" in navigator && "SyncManager" in window) {
        try {
          const reg = await navigator.serviceWorker.ready;
          await reg.sync.register(ETIQUETA_SYNC);
          enSegundoPlano = true;
          estadoDescargaEl.textContent = "Descarga solicitada: el navegador la completará en segundo plano.";
        } catch {
          enSegundoPlano = false;
        }
      }

      if (!enSegundoPlano) {
        await descargarPendientes(db, (hechos, total) => {
          estadoDescargaEl.textContent = `Descargando fichas: ${hechos} de ${total}`;
        });
        estadoDescargaEl.textContent = "✓ 3 de 3 fichas guardadas: ya puedes consultarlas sin conexión.";
      }
    } catch (err) {
      estadoDescargaEl.textContent = "No se pudo completar la descarga: " + err.message;
    } finally {
      btnDescargar.disabled = false;
    }
  });
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("message", (event) => {
    const datos = event.data;
    if (datos.tipo === "progreso") {
      estadoDescargaEl.textContent = `Descargando en 2do plano: ${datos.hechos} de ${datos.total}`;
    } else if (datos.tipo === "descarga-completa") {
      estadoDescargaEl.textContent = "✓ Fichas descargadas y listas para usar sin conexión.";
    }
  });
}

async function comprobarAR() {
  const { estado, lineas } = await diagnosticarAR();
  estadoAR.textContent = mensajeSoporteAR(estado);
  diagAR.textContent = lineas.join("\n");
  if (!sesionAR) btnAR.disabled = estado !== "disponible";
  detallesAR.open = estado !== "disponible";
}

void comprobarAR();

btnRecomprobar?.addEventListener("click", () => void comprobarAR());
navigator.xr?.addEventListener("devicechange", () => void comprobarAR());

btnAR?.addEventListener("click", async () => {
  avisarVisor("");
  apagarCamara();
  apagarSensores();

  try {
    const sesion = await pedirSesionAR(overlayAR);
    sesionAR = sesion;
    btnAR.disabled = true;

    await visor.entrarEnAR(sesion, () => {
      sesionAR = null;
      btnAR.disabled = false;
      estadoAR.textContent = "La sesión de realidad aumentada terminó.";
    });

    estadoAR.textContent = sesion.domOverlayState
      ? "Sesión de realidad aumentada activa. Usa «Salir de AR» sobre la cámara."
      : "Sesión de realidad aumentada activa. Sal con el gesto de salida del sistema.";
  } catch (err) {
    sesionAR?.end().catch(() => {});
    sesionAR = null;
    btnAR.disabled = false;
    console.error("Error al iniciar AR:", err);
  }
});

btnSalirAR?.addEventListener("click", () => {
  void sesionAR?.end();
});

async function iniciarProgreso() {
  try {
    const db = await abrirBaseDeDatos();
    console.log('Base de datos abierta:', db.name);

   
    await marcarModeloVisto(db, 'modelo-demo-1');
    await marcarModeloVisto(db, 'modelo-demo-2');
    
    const esFavorito = await alternarFavorito(db, 'modelo-demo-1'); 
    console.log("¿'modelo-demo-1' es favorito?", esFavorito); 


    const sal = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
    const clave = await derivarClave('mi-contrasena-secreta', sal);
    await guardarNotaDeEstudio(db, clave, 'modelo-demo-1', 'Nota privada de estudio de arquitectura.');
    console.log('Nota de estudio cifrada guardada exitosamente.');

    const favoritos = await obtenerFavoritos(db);
    console.log('Favoritos recuperados:', favoritos);

    if (listaEl) {
      listaEl.innerHTML = favoritos
        .map(f => `<li> Modelo Favorito: <strong>${f.modeloId}</strong> (Última visita: ${new Date(f.ultimaVisita).toLocaleTimeString()})</li>`)
        .join('');
    }

  } catch (error) {
    console.error('Error al operar con IndexedDB:', error);
  }
}

iniciarProgreso();