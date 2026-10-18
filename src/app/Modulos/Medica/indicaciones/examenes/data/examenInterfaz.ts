/** Estados con los que el backend clasifica un examen indicado. */
export type EstadoExamenApi = 'ACTIVO' | 'ELIMINADO';

/** Archivo o imagen adjunta a un examen. */
export interface ExamenArchivoResponse {
  id: number;
  nombreOriginal: string;
  urlArchivo: string;
  tamano: number | null;
}

/** Cuerpo con el que se crea o actualiza un examen. */
export interface ExamenRequest {
  nombreExamen: string;
  observacion: string | null;
  episodioId: number;
  usuarioId: number;
}

/** Examen tal como lo devuelve el backend. */
export interface ExamenResponse {
  id: number;
  nombreExamen: string;
  observacion: string | null;
  archivos: ExamenArchivoResponse[];
  episodioId: number;
  usuarioId: number;
  usuarioNombre: string;
  fecha: string;
  estado: EstadoExamenApi;
}
