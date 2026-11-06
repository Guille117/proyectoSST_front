/** Tipo de registro del control hídrico. */
export type TipoRegistroHidricoApi = 'INGRESO' | 'EGRESO';

/** Cuerpo con el que se registra un movimiento hídrico. */
export interface ControlHidricoRequest {
  tipo: TipoRegistroHidricoApi;
  via: string;
  cantidad: number;
  descripcion: string;
  episodioId: number;
  usuarioId: number;
  /** Atención de control desde la que se registra el movimiento. */
  cuidadoId?: number | null;
  /** Hora programada de la atención que se está ejecutando. */
  fechaHoraProgramada?: string | null;
}

/** Registro hídrico tal como lo devuelve el backend. */
export interface ControlHidricoResponse {
  id: number;
  tipo: TipoRegistroHidricoApi;
  via: string;
  cantidad: number;
  descripcion: string;
  episodioId: number;
  usuarioId: number;
  usuarioNombre: string;
  fecha: string;
  eliminado: boolean;
}
