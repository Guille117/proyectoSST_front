/** Estados con los que el backend clasifica una evolución registrada. */
export type EstadoEvolucionApi = 'ACTIVA' | 'ELIMINADA';

/** Cuerpo con el que se crea o actualiza una evolución. */
export interface EvolucionRequest {
  evolucionClinica: string;
  planMedico: string;
  episodioId: number;
  usuarioId: number;
}

/** Evolución tal como la devuelve el backend. */
export interface EvolucionResponse {
  id: number;
  evolucionClinica: string;
  planMedico: string;
  episodioId: number;
  usuarioId: number;
  usuarioNombre: string;
  fecha: string;
  estado: EstadoEvolucionApi;
}
