import './style.css'
import { ControladorVisor } from './controlador/controladorVisor';


const listaEl = document.querySelector("#lista-catalogo");
const lienzoEl = document.querySelector("#lienzo-3d");
const descripcion = document.querySelector("#descripcion");

const controladorVisor = new ControladorVisor(listaEl,lienzoEl,descripcion);
controladorVisor.iniciar();
