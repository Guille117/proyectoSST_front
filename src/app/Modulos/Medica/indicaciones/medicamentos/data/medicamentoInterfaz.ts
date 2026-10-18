/** Estados con los que el backend clasifica una indicación de medicamento. */
export type EstadoIndicacionMedicamento = 'ACTIVO' | 'FINALIZADO' | 'ELIMINADO';

/** Tipos de duración aceptados por el backend para una indicación. */
export type TipoDuracionApi = 'DIAS' | 'DOSIS_UNICA' | 'TIEMPO_INDEFINIDO';

/** Cuerpo con el que se crea o actualiza una indicación de medicamento. */
export interface MedicamentoIndicacionRequest {
  medicamentoLogId: number | null;
  medicamentoLibre: string | null;
  presentacion: string | null;
  cantidad: number;
  frecuencia: number;
  duracion: number | null;
  tipoDuracion: TipoDuracionApi;
  observaciones: string | null;
  episodioId: number;
  usuarioId: number;
}

/** Indicación de medicamento tal como la devuelve el backend. */
export interface MedicamentoIndicacionResponse {
  id: number;
  medicamentoLogId: number | null;
  medicamento: string;
  medicamentoLibre: string | null;
  presentacion: string | null;
  cantidad: number;
  frecuencia: number;
  duracion: number | null;
  tipoDuracion: TipoDuracionApi;
  observaciones: string | null;
  episodioId: number;
  usuarioId: number;
  usuarioNombre: string;
  fecha: string;
  estado: EstadoIndicacionMedicamento;
}

/** Medicamento del catálogo de farmacia que puede indicarse al paciente. */
export interface MedicamentoCatalogoResponse {
  id: number;
  nombre: string;
  codigo: string;
  dosis: number;
  marca: string;
  presentacion: string;
  viaAdministracion: string;
  unidadMedida: string;
  disponible: number;
  /** Falso solo en el catálogo mínimo de edición, donde no se conoce la existencia actual. */
  disponibleConocido?: boolean;
  estado: boolean;
}
