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
