export type Sexo = 'MASCULINO' | 'FEMENINO';

// 1. Catálogos auxiliares para los selects
export interface PuestoResponse {
  id: number;
  codigo: string;
  nombre: string;
  estado: boolean;
}

export interface CatalogoOpcion {
  id: number;
  codigo: string;
  nombre: string;
}

export interface CatalogoReferencia {
  id: number;
  nombre: string;
}

// 2. Modelo de datos personales
export interface PersonaDatos {
  cui: string;
  nombres: string;
  apellidos: string;
  sexo: Sexo;
  fechaNacimiento: string; // Formato "YYYY-MM-DD"
  telefono?: string;
  email?: string;
}

// 3. Payload para crear o actualizar usuario (Request)
export interface UsuarioRequest {
  persona: PersonaDatos;
  puestoId: number;
  horarioId: number;
  rolIds: number[];
  username: string;
  estado?: boolean;
}

export interface UsuarioListadoResponse {
  id: number;
  codigo: string;
  nombreCompleto: string;
  telefono?: string;
  roles?: string[];
  estado: boolean;
}

// 4. Respuesta devuelta por el servidor (Response)
export interface UsuarioResponse {
  id: number;
  codigo: string;
  username: string;
  nombres: string;
  apellidos: string;
  estado: boolean;
  pin?: string | number;

  cui?: string;
  sexo?: Sexo;
  fechaNacimiento?: string;
  telefono?: string;
  email?: string;

  persona?: PersonaDatos & { id?: number };
  puesto?: CatalogoReferencia;
  puestoNombre?: string;
  horario?: CatalogoReferencia;
  horarioNombre?: string;
  rol?: CatalogoOpcion;
  rolNombre?: string;
  roles?: CatalogoOpcion[];
  rolIds?: number[];
}
