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
  fechaInicio: string;
}

/** Indicación de medicamento tal como la devuelve el backend. */
export interface MedicamentoIndicacionResponse {
  id: number;
  medicamentoLogId: number | null;
  medicamento: string;
  medicamentoMarca?: string | null;
  medicamentoPresentacion?: string | null;
  medicamentoViaAdministracion?: string | null;
  medicamentoDosis?: number | null;
  medicamentoUnidad?: string | null;
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
  usuarioNombreCorto: string;
  fecha: string;
  estado: EstadoIndicacionMedicamento;
  fechaInicio: string;
}

/**
 * Descripción legible del medicamento para tarjetas y barras: nombre con su marca,
 * presentación y vía de administración.
 */
export function descripcionMedicamentoCompleta(medicamento: {
  nombre: string | null | undefined;
  marca?: string | null;
  presentacion?: string | null;
  dosis?: number | null;
  unidadMedida?: string | null;
  viaAdministracion?: string | null;
}): string {
  const nombre = [medicamento.nombre, medicamento.marca]
    .filter((parte) => parte?.trim())
    .join(' ');
  const concentracion = [
    medicamento.dosis != null && medicamento.dosis > 0 ? `${medicamento.dosis}` : '',
    medicamento.unidadMedida?.trim() ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  const presentacion = medicamento.presentacion?.trim() ?? '';
  let detalle = presentacion;

  if (!detalle) {
    detalle = concentracion;
  } else if (concentracion && !detalle.toLowerCase().includes(concentracion.toLowerCase())) {
    detalle = /\d/.test(detalle)
      ? `${detalle} ${concentracion}`
      : `${detalle} de ${concentracion}`;
  }

  const via = medicamento.viaAdministracion?.trim()
    ? `administración ${medicamento.viaAdministracion.trim().toLowerCase()}`
    : '';

  return [nombre, detalle, via].filter((parte) => parte?.trim()).join(', ');
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
