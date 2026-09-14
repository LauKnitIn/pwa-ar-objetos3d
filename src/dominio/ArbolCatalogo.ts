import type { PatronArquitectura } from "./PatronArquitectura";

class Nodo{

    valor: PatronArquitectura
    nodoIzq : Nodo | null
    nodoDer : Nodo | null

    constructor (valor: PatronArquitectura){
        this.valor = valor;
        this.nodoIzq = null;
        this.nodoDer = null;
    }

    setHijoIzq(nodo:Nodo){
        this.nodoIzq = nodo;
    }

    setHijoDer(nodo: Nodo){
        this.nodoDer = nodo;
    }

}

class Arbol{

    nodoRaiz: Nodo

    constructor(nodo: Nodo){
        this.nodoRaiz = nodo;
    }

    agregarPatron(valor : PatronArquitectura) : void{
        const nuevoNodo = new Nodo(valor);
        this.insertarNodo(this.nodoRaiz, nuevoNodo);
    }

    insertarNodo(actual: Nodo, nuevoNodo : Nodo): void{
        if (nuevoNodo.valor.nombre.localeCompare(actual.valor.nombre) < 0) {
            if (actual.nodoIzq === null) {
                actual.setHijoIzq(nuevoNodo);
            } else {
                this.insertarNodo(actual.nodoIzq, nuevoNodo);
            }
        } else {
            if (actual.nodoDer === null) {
                actual.setHijoDer(nuevoNodo);
            } else {
                this.insertarNodo(actual.nodoDer, nuevoNodo);
            }
        }
    }

}