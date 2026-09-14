export class ControladorVisor{
    listaElegida : HTMLUListElement;
    lienzoElegido: HTMLLIElement;
    descripcion : HTMLInputElement;

    constructor(listaElegida : HTMLUListElement,lienzoElegido: HTMLLIElement,    descripcion : HTMLInputElement){
        this.listaElegida = listaElegida;
        this.lienzoElegido = lienzoElegido;
        this.descripcion = descripcion;
    }

    iniciar() : void {
        console.log('revisar la libreria para dibujar los patrones')
    }
}

