/** Tipo de medición de glucosa. */
export type TipoMedicionGlucosaApi = 'AYUNAS' | 'PREPRANDIAL' | 'POSTPRANDIAL' | 'ALEATORIA';

/** Cuerpo con el que se registra una medición de glucosa. */
export interface GlucosaRequest {
  glucosa: number;
  tipo: TipoMedicionGlucosaApi;
  observacion: string | null;
  episodioId: number;
  usuarioId: number;
}

/** Medición de glucosa tal como la devuelve el backend. */
export interface GlucosaResponse {
  id: number;
  glucosa: number;
  tipo: TipoMedicionGlucosaApi;
  observacion: string | null;
  episodioId: number;
  usuarioId: number;
  usuarioNombre: string;
  fecha: string;
  eliminado: boolean;
}
