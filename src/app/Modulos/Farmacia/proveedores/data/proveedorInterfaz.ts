export interface proveedorResponse {
  id: number;
  codigo: string;
  nombre: string;
  nit: string;
  telefono: string;
  email: string;
  estado: boolean;
}

export interface proveedorRequest {
  nombre: string;
  nit: string;
  telefono: string;
  email: string;
}