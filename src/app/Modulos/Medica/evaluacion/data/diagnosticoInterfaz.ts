/** Tipos de diagnóstico aceptados por el backend. */
export type TipoDiagnostico = 'PRINCIPAL' | 'PROVISIONAL' | 'ASOCIADO';

export interface DiagnosticoRequest {
  tipoDiagnostico: TipoDiagnostico;
  descripcion: string;
  episodioId: number;
  usuarioId: number;
}

export interface DiagnosticoResponse {
  id: number;
  tipoDiagnostico: TipoDiagnostico;
  descripcion: string;
  episodioId: number;
  usuarioId: number;
  usuarioNombre: string;
  fecha: string;
  estado: boolean;
}
