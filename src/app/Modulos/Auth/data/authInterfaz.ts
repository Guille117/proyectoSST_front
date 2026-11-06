export interface LoginRequest {
  username: string;
  password: string;
}

export interface EstablecerCredencialesRequest {
  username: string;
  pin: string;
  password: string;
}

export interface SolicitarCambioCredencialesRequest {
  usuarioId: number;
  usuarioActualId: number;
  passwordActual: string;
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
  username?: string;
  nombreCompleto: string;
  roles?: string[];
  estado?: boolean;
  permisos?: PermisoAuth[];
}

export interface EstadoSesion {
  id: number;
  username: string;
  estado: boolean;
}
