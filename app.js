
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
  guardarNotaDeEstudio 
} from './db.js';

import { registerSW } from 'virtual:pwa-register';


const listaEl = document.querySelector("#lista-catalogo");
const lienzoEl = document.querySelector("#lienzo-3d");
const btnOrientacion = document.querySelector("#btn-orientacion");
const btnCalibrar = document.querySelector("#btn-calibrar");

let visor = null;
let control = null;

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
  // Inicializamos el visor 3D con el cubo de prueba
  visor = crearVisor(lienzoEl);
}

// Lógica del botón de sensores
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