export type CateogiraPatron = "estructural" | "distribuida" | "datos";

export interface PatronArquitectura {
    id: string;
    nombre: string;
    categoria: CateogiraPatron;
    descripcion: string;
}