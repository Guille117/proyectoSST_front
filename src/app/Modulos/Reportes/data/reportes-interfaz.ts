export interface Conteo {
  nombre: string;
  cantidad: number;
}

export interface CompraProveedor {
  proveedor: string;
  cantidad: number;
  total: number;
}

export interface StockBajo {
  id: number;
  producto: string;
  disponible: number;
  vencimiento: string | null;
}

export interface Censo {
  area: string;
  estado: string;
  cantidad: number;
}

export interface MonitoreoSummary {
  signosVitales: number;
  glucosa: number;
  controlHidrico: number;
}

export interface GlucosaPromedio {
  tipo: string;
  promedio: number;
}

export interface BitacoraEntry {
  id: number;
  tipo: string;
  accion: string;
  modulo: string | null;
  entidad: string | null;
  entidadId: number | null;
  pacienteId: number | null;
  usuarioId: number | null;
  usuarioNombre: string | null;
  fechaHora: string;
  detalle: string | null;
  ip: string | null;
}
