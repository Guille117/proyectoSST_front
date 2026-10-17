export type TipoInventario = 'medicamento' | 'insumo';

export type EstadoInventario =
  | 'vencidos'
  | 'por-vencer'
  | 'stock-bajo'
  | 'sin-stock'
  | 'eliminados';

export interface InventarioFiltros {
  tipo?: TipoInventario;
  nombre?: string;
  proveedorId?: number;
  viaAdminId?: number;
  estadoInventario?: EstadoInventario;
  activos?: boolean;
  diasPorVencer?: number;
}

export interface InventarioResponse {
  id: number;
  tipo: 'MEDICAMENTO' | 'INSUMO';
  idItem: number;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  administracion: string | null;
  presentacion: string | null;
  cantidad: number;
  disponible: number;
  proveedorId: number | null;
  proveedor: string | null;
  codigoLote: string;
  fechaVencimiento: string | null;
  estado: boolean;
  idCompra: number | null;
  codigoCompra: string | null;
}

export interface BajaLoteRequest {
  idLote: number;
  cantidad: number;
  idMotivoBaja: number;
  observacion: string;
  idUsuario: number;
}

export interface BajaLoteResponse {
  id: number;
  idLote: number;
  codigoLote: string;
  cantidad: number;
  stockAnterior: number;
  stockActual: number;
  idMotivoBaja: number;
  motivo: string;
  observacion: string | null;
  fechaHora: string;
  idUsuario: number;
  usuario: string;
}

export interface BajaListadoResponse {
  idBaja: number;
  producto: string;
  lote: string;
  motivo: string;
  observacion: string | null;
  fecha: string;
  usuario: string;
}
