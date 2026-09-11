export enum diaSemana {
  Lunes = 'LUNES',
  Martes = 'MARTES',
  Miércoles = 'MIERCOLES',
  Jueves = 'JUEVES',
  Viernes = 'VIERNES',
  Sábado = 'SABADO',
  Domingo = 'DOMINGO'
}

export const listaDias = Object.values(diaSemana);

export interface horarioSemanal{
    id?: number;
    diaSemana: diaSemana;
    horaEntrada: string;
    horaSalida: string;
}

export interface horarioTurno{
    id?: number;
    horasTrabajo: number;
    horasDescanso: number;
}

export interface horarioRequest {
  nombre: string;
  esRotativo: boolean;
  estado?: boolean;
  semanalDetalles?: horarioSemanal[]; 
  turnoDetalle?: horarioTurno;
}


export interface HorarioResponse {
  id: number;
  codigo: string;
  nombre: string;
  esRotativo: boolean;
  estado: boolean;
  semanalDetalles?: horarioSemanal[];
  detallesSemanales?: horarioSemanal[];
  detalleTurno?: horarioTurno;
  turnoDetalle?: horarioTurno;
}