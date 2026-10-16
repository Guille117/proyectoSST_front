export interface ExamenFisicoRequest {
  descripcion: string;
  episodioId: number;
  parteCuerpoId: number;
  usuarioId: number;
}

export interface ExamenFisicoResponse {
  id: number;
  descripcion: string;
  episodioId: number;
  parteCuerpoId: number;
  parteCuerpoNombre: string;
  usuarioId: number;
  usuarioNombre: string;
  fecha: string;
  estado: boolean;
}

/** Parte del cuerpo del catálogo de gestión clínica: regiones que puede registrar el examen físico. */
export interface ParteCuerpoResponse {
  id: number;
  nombre: string;
  estado: boolean;
}
