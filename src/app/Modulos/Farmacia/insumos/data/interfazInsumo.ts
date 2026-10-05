export interface InsumoRequest {
  nombre: string;
  marcaId: number;
  detalle?: string;
}

export interface InsumoResponse {
  id: number;
  nombre: string;
  marcaId: number;
  marca: string;
  detalle?: string;
}

export interface MarcaInsumo {
  nombreMarca: string;
  idMarca: number;
}

export interface Insumo {
  id: number;
  nombre: string;
  marca: MarcaInsumo;
  detalle?: string;
  estado: boolean;
}