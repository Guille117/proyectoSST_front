/** Estados con los que el backend clasifica un procedimiento médico. */
export type EstadoProcedimientoApi = 'REALIZADO' | 'PENDIENTE' | 'ELIMINADO';

/** Tipos de recurso que pueden agregarse a un procedimiento. */
export type TipoRecursoProcedimientoApi = 'MEDICAMENTO' | 'INSUMO';

/** Tipo de procedimiento del catálogo de gestión clínica. */
export interface TipoProcedimientoResponse {
  id: number;
  nombre: string;
  estado?: boolean;
}

/** Recurso agregado a un procedimiento. */
export interface RecursoProcedimientoRequest {
  tipo: TipoRecursoProcedimientoApi;
  referenciaId: number;
  cantidad: number;
}

/** Cuerpo con el que se crea o actualiza un procedimiento médico. */
export interface ProcedimientoMedicoRequest {
  tipoProcedimientoId: number;
  descripcion: string;
  resultado: string | null;
  inicio: string;
  fin: string | null;
  episodioId: number;
  usuarioId: number;
  recursos: RecursoProcedimientoRequest[];
}

/** Recurso tal como lo devuelve el backend. */
export interface RecursoProcedimientoResponse {
  tipo: TipoRecursoProcedimientoApi;
  referenciaId: number;
  nombre: string;
  cantidad: number;
}

/** Procedimiento médico tal como lo devuelve el backend. */
export interface ProcedimientoMedicoResponse {
  id: number;
  tipoProcedimientoId: number;
  tipoProcedimientoNombre: string;
  descripcion: string;
  resultado: string | null;
  inicio: string;
  fin: string | null;
  episodioId: number;
  usuarioId: number;
  usuarioNombre: string;
  estado: EstadoProcedimientoApi;
  recursos: RecursoProcedimientoResponse[];
}

/** Recurso de farmacia disponible para agregar a un procedimiento. */
export interface RecursoDisponibleResponse {
  id: number;
  nombre: string;
  disponible: number;
}
