export interface LoginRequest {
  username: string;
  password: string;
}

export interface PermisoAuth {
  submoduloId: number;
  submoduloCodigo: string;
  submoduloNombre: string;
  moduloCodigo: string;
  moduloNombre: string;
  puedeLeer: boolean;
  puedeCrear: boolean;
  puedeEditar: boolean;
  puedeEliminar: boolean;
}

export interface LoginResponse {
  token: string;
  tipo?: string;
  id: number;
  codigo?: string;
  username: string;
  nombreCompleto: string;
  puesto?: string;
  rol?: string;
  estado?: boolean;
  permisos?: PermisoAuth[];
}
