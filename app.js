
import '/src/style.css'
import { ControladorVisor } from '/src/controlador/controladorVisor';
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
const descripcion = document.querySelector("#descripcion");

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