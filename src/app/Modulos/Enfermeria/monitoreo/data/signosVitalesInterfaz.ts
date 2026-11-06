/** Cuerpo con el que se registra una toma de signos vitales. */
export interface SignosVitalesRequest {
  sistolica: number;
  diastolica: number;
  frecuenciaCardiaca: number;
  frecuenciaRespiratoria: number;
  temperatura: number;
  saturacion: number;
  observacion: string | null;
  episodioId: number;
  usuarioId: number;
  /** Atención de control desde la que se registra la toma. */
  cuidadoId?: number | null;
  /** Hora programada de la atención que se está ejecutando. */
  fechaHoraProgramada?: string | null;
}

/** Toma de signos vitales tal como la devuelve el backend. */
export interface SignosVitalesResponse {
  id: number;
  sistolica: number;
  diastolica: number;
  frecuenciaCardiaca: number;
  frecuenciaRespiratoria: number;
  temperatura: number;
  saturacion: number;
  observacion: string | null;
  episodioId: number;
  usuarioId: number;
  usuarioNombre: string;
  fecha: string;
  eliminado: boolean;
}
