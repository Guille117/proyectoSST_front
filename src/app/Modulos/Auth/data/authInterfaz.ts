export interface LoginRequest {
  username: string;
  password: string;
}

export interface EstablecerCredencialesRequest {
  username: string;
  pin: string;
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
  nombreCompleto: string;
  roles?: string[];
  estado?: boolean;
  permisos?: PermisoAuth[];
}
