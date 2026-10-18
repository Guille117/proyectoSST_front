/** Estados con los que el backend clasifica un cuidado indicado. */
export type EstadoCuidadoApi = 'EN_PROCESO' | 'COMPLETADO' | 'ELIMINADO';

/** Tipos de duración aceptados por el backend para un cuidado. */
export type TipoDuracionCuidadoApi = 'DIAS' | 'DOSIS_UNICA' | 'TIEMPO_INDEFINIDO';

/** Cuerpo con el que se crea o actualiza un cuidado. */
export interface CuidadoRequest {
  nombreCuidado: string;
  frecuencia: number;
  duracion: number | null;
  tipoDuracion: TipoDuracionCuidadoApi;
  observacion: string | null;
  episodioId: number;
  usuarioId: number;
}

/** Cuidado tal como lo devuelve el backend. */
export interface CuidadoResponse {
  id: number;
  nombreCuidado: string;
  frecuencia: number;
  duracion: number | null;
  tipoDuracion: TipoDuracionCuidadoApi;
  observacion: string | null;
  episodioId: number;
  usuarioId: number;
  usuarioNombre: string;
  fecha: string;
  estado: EstadoCuidadoApi;
}
