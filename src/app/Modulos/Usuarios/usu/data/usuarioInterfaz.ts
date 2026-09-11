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
  persona?: PersonaDatos;
  cui: string;
  nombres: string;
  apellidos: string;
  sexo: Sexo;
  fechaNacimiento: string; // Formato "YYYY-MM-DD"
  telefono?: string | null;
  email?: string | null;
  puestoId: number;
  horarioId: number;
  rolId: number;
  username: string;
  estado?: boolean;
}

// 4. Respuesta devuelta por el servidor (Response)
export interface UsuarioResponse {
  id: number;
  codigo: string;
  username: string;
  estado: boolean;

  cui?: string;
  nombres?: string;
  apellidos?: string;
  sexo?: Sexo;
  fechaNacimiento?: string;
  telefono?: string;
  email?: string;

  persona?: PersonaDatos & { id?: number };
  puesto?: CatalogoOpcion;
  puestoNombre?: string;
  horario?: CatalogoOpcion;
  horarioNombre?: string;
  rol?: CatalogoOpcion;
  rolNombre?: string;
}
