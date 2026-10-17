/** Cuerpo enviado al backend para registrar el ingreso (compra) de lotes. */
export interface CompraRequest {
  proveedorId: number;
  lotes: LoteCompraRequest[];
}

/** Envoltorio multipart: el JSON viaja en la parte `request` y el archivo en la parte `comprobante`. */
export interface CompraMultipartRequest {
  request: CompraRequest;
  comprobante: File | null;
}

/** Detalle de cada lote de medicamento o insumo agregado en el Paso 1. */
export interface LoteCompraRequest {
  esMedicamento: boolean;
  idItem: number;
  codigoLote: string;
  cantidad: number;
  fechaVencimiento: string;
  precioCompra: number;
  precioVenta: number;
}

/**
 * Lote tal como se lista en el Paso 2: los datos que se envían al backend
 * más los que solo sirven para dibujar la tabla del producto agregado.
 */
export interface LoteCompraVista extends LoteCompraRequest {
  /** Nombre del producto seleccionado en el Paso 1. */
  nombreItem: string;
  /** Marca, presentación y concentración del producto (solo para la tabla). */
  descripcionItem: string;
  /** Id del lote existente al editar una compra; no se envía al backend. */
  idLote?: number;
  /** Unidades disponibles del lote; permite bloquear la eliminación de lotes ya despachados. */
  disponible?: number;
}


// --------------------- response interfaces ---------------------
export interface resumenCompraResponse{
  id: number;
  codigo: string;
  proveedor: string;
  fecha: string; // ISO 8601 format
  cantidadProductos: number;
  total: number;
}

export interface resumenCompraFiltros {
  codigo?: string;
  proveedorId?: number;
  fecha?: string;
  activos?: boolean;
}

export interface detalleCompraResponse {
  id: number;
  codigo: string;
  total: number;
  comprobante: string | null;
  estado: boolean;
  proveedorId: number;
  proveedorNombre: string;
  fecha: string; // ISO 8601 format
  lotes: LoteDetalleResponse[];
}

export interface LoteDetalleResponse {
  id: number;
  codigoLote: string;
  cantidad: number;
  disponible: number;
  estado: boolean;
  fechaVencimiento: string;
  precioCompra: number;
  precioVenta: number;
  total: number;
  idInsumoLog: number | null;
  nombreInsumo: string | null;
  idMedicamentoLog: number | null;
  nombreMedicamento: string | null;
  idCompra: number;
  codigoCompra: string;
}