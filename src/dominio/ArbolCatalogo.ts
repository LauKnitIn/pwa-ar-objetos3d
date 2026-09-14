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
    }

    insertarNodo(actual: Nodo, nuevoNodo : Node): void{
        
    }

}