

export interface camaRequest {
  habitacionId: number;
  tipoId: number;
  areaId: number;
}

export interface camaResponseSimple {
  idCama:number;
  codigo: string;
  estado: EstadoCama;
  nombreHabitacion: string;
  nombreTipoCama: string;
  nombreArea: string;
  activo: boolean;
}

/** Cama ocupada con el nombre del paciente que la ocupa. */
export interface camaOcupadaResponse {
  idCama: number;
  codigo: string;
  nombrePaciente: string;
  nombreHabitacion: string;
  nombreArea: string;
  nombreTipoCama: string;
}

export enum EstadoCama {
  DISPONIBLE = 'DISPONIBLE',
  OCUPADA = 'OCUPADA',
  LIMPIEZA = 'LIMPIEZA'
}

