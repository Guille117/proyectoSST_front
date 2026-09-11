export interface PermisoRequest {
  id?: number;
  submoduloId: number;
  puedeLeer?: boolean;
  puedeCrear?: boolean;
  puedeEditar?: boolean;
  puedeEliminar?: boolean;
}

export interface RolRequest {
  nombre: string;
  estado?: boolean;
  permisos?: PermisoRequest[];
}

export interface PermisoResponse {
  id: number;
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

export interface RolResponse {
  id: number;
  codigo: string;
  nombre: string;
  estado: boolean;
  permisos: PermisoResponse[];
}

export interface SubmoduloResponse {
  id: number;
  codigo: string;
  nombre: string;
  estado: boolean;
}

export interface ModuloResponse {
  id: number;
  codigo: string;
  nombre: string;
  estado: boolean;
  submodulos: SubmoduloResponse[];
}
