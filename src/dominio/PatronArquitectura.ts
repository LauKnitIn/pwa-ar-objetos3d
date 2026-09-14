export type CategoiraPatron = "estructural" | "distribuida" | "datos";

export interface PatronArquitectura {
    id: string;
    nombre: string;
    categoria: CategoiraPatron;
    descripcion: string;
}