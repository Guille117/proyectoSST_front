

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

export enum EstadoCama {
  DISPONIBLE = 'DISPONIBLE',
  OCUPADA = 'OCUPADA',
  LIMPIEZA = 'LIMPIEZA'
}

