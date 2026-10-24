/** Estados de una solicitud de salida de farmacia. */
export type EstadoSolicitudSalida = 'PENDIENTE' | 'PARCIAL' | 'COMPLETADA' | 'CANCELADA';

/** Estados de cada línea de la solicitud. */
export type EstadoDetalleSalida = 'PENDIENTE' | 'PARCIAL' | 'COMPLETADA' | 'CANCELADA';

/** Tipo de producto solicitado. */
export type TipoRecursoSalida = 'MEDICAMENTO' | 'INSUMO';

/** Condición con la que regresa un producto devuelto. */
export type CondicionDevolucion = 'APTO' | 'NO_APTO';

export interface SolicitudSalidaBase {
  id: number;
  codigo: string;
  paciente: string;
  tipoAtencion: string | null;
  procedimiento: string;
  fecha: string;
  estado: EstadoSolicitudSalida;
}

/** Fila del listado de solicitudes. */
export interface SolicitudSalidaResumen extends SolicitudSalidaBase {
  medicamentos: number;
  insumos: number;
  pendientes: number;
}

export interface LoteDisponibleSalida {
  id: number;
  codigoLote: string;
  fechaVencimiento: string | null;
  disponible: number;
}

export interface LoteEntregadoSalida {
  loteId: number;
  codigoLote: string;
  fechaVencimiento: string | null;
  entregado: number;
  devuelto: number;
  disponibleDevolver: number;
}

/** Línea de detalle de la solicitud. */
export interface DetalleSolicitudSalida {
  id: number;
  tipo: TipoRecursoSalida;
  referenciaId: number;
  nombre: string;
  solicitado: number;
  entregado: number;
  pendiente: number;
  estado: EstadoDetalleSalida;
  lotesDisponibles: LoteDisponibleSalida[];
  lotesEntregados: LoteEntregadoSalida[];
}

/** Solicitud con su detalle completo. */
export interface SolicitudSalida extends SolicitudSalidaBase {
  solicitante: string;
  detalles: DetalleSolicitudSalida[];
}

export interface EntregaLineaRequest {
  detalleId: number;
  loteId: number;
  cantidad: number;
}

export interface EntregaSalidaRequest {
  usuarioId: number;
  lineas: EntregaLineaRequest[];
}

export interface DevolucionLineaRequest {
  detalleId: number;
  loteId: number;
  cantidad: number;
  condicion: CondicionDevolucion;
  motivoBajaId: number;
  observacion: string | null;
}

export interface DevolucionSalidaRequest {
  usuarioId: number;
  lineas: DevolucionLineaRequest[];
}

/** Línea de una salida directa: producto, lote elegido y cantidad que sale del inventario. */
export interface SalidaDirectaLineaRequest {
  tipo: TipoRecursoSalida;
  referenciaId: number;
  cantidad: number;
  loteId: number;
}

/** Salida directa de Farmacia, ligada al episodio y sin procedimiento médico. */
export interface SalidaDirectaRequest {
  episodioId: number;
  usuarioId: number;
  lineas: SalidaDirectaLineaRequest[];
}

/** Movimiento histórico de una salida: entrega o devolución. */
export interface HistorialMovimiento {
  id: number;
  fechaHora: string;
  tipoMovimiento: 'ENTREGA' | 'DEVOLUCION';
  tipo: TipoRecursoSalida;
  producto: string;
  lote: string;
  cantidad: number;
  condicion: CondicionDevolucion | null;
  motivoBaja: string | null;
  usuario: string;
  observacion: string | null;
}
