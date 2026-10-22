/** Estado con el que se registra una aplicación de medicamento. */
export type EstadoAplicacionMedicamentoApi = 'ADMINISTRADO' | 'NO_ADMINISTRADO';

/** Estado con el que se registra una ejecución de cuidado. */
export type EstadoEjecucionCuidadoApi = 'REALIZADO' | 'NO_REALIZADO';

/** Cuerpo con el que se crea o actualiza una aplicación de medicamento. */
export interface AplicacionMedicamentoRequest {
  indicacionMedicamentoId: number;
  fechaHoraProgramada: string;
  estado: EstadoAplicacionMedicamentoApi;
  cantidad: number | null;
  observacion: string | null;
  usuarioId: number;
}

/** Aplicación de medicamento tal como la devuelve el backend. */
export interface AplicacionMedicamentoResponse {
  id: number;
  indicacionMedicamentoId: number;
  fechaHoraProgramada: string;
  estado: EstadoAplicacionMedicamentoApi;
  cantidad: number | null;
  observacion: string | null;
  usuarioId: number;
  usuarioNombre: string;
  fechaRegistro: string;
}

/** Cuerpo con el que se crea o actualiza una ejecución de cuidado. */
export interface EjecucionCuidadoRequest {
  cuidadoId: number;
  fechaHoraProgramada: string;
  estado: EstadoEjecucionCuidadoApi;
  observacion: string | null;
  usuarioId: number;
}

/** Ejecución de cuidado tal como la devuelve el backend. */
export interface EjecucionCuidadoResponse {
  id: number;
  cuidadoId: number;
  fechaHoraProgramada: string;
  estado: EstadoEjecucionCuidadoApi;
  observacion: string | null;
  usuarioId: number;
  usuarioNombre: string;
  fechaRegistro: string;
}
