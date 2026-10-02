import './style.css'
import { ControladorVisor } from './controlador/controladorVisor';


const listaEl = document.querySelector("#lista-catalogo");
const lienzoEl = document.querySelector("#lienzo-3d");
const descripcion = document.querySelector("#descripcion");

//const controladorVisor = new ControladorVisor(listaEl,lienzoEl,descripcion);
//controladorVisor.iniciar();

if('serviceWorker' in navigator){
    navigator.serviceWorker
    .register('/sw.js')
    .then(reg => console.log('Registro de SW exitoso', reg))
    .catch(err => console.warn('Error al tratar de registrar el SW', err));
}