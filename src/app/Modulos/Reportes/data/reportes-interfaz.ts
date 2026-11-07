export interface Conteo {
  nombre: string;
  cantidad: number;
}

/** Resultado del reporte de productos más despachados, con su tipo de recurso. */
export interface ProductoConteo {
  nombre: string;
  tipo: 'MEDICAMENTO' | 'INSUMO';
  cantidad: number;
}

export type ClaveConteo =
  | 'masVendidos'
  | 'menosVendidos'
  | 'ingresos'
  | 'demografia'
  | 'diagnosticos'
  | 'altas'
  | 'atenciones'
  | 'medicamentos'
  | 'cuidados'
  | 'porRol'
  | 'accesos'
  | 'consumoArea'
  | 'rotacion'
  | 'egresos'
  | 'gruposEdad'
  | 'estancia'
  | 'ocupacion'
  | 'procedimientos'
  | 'indicaciones'
  | 'reingresos'
  | 'tiempoAtencion'
  | 'signosFueraRango'
  | 'eventos'
  | 'cargaEnfermero'
  | 'intentosFallidos'
  | 'actividad'
  | 'usuariosCreados';

export interface Vencimiento {
  producto: string;
  cantidad: number;
  mes: number;
  anio: number;
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

export interface SesionActiva {
  usuario: string;
  ultimoLogin: string | null;
  ultimoLogout: string | null;
  ultimaActividad: string | null;
}

export interface PermisoModulo {
  modulo: string;
  submodulo: string;
  rol: string;
  leer: boolean;
  crear: boolean;
  editar: boolean;
  eliminar: boolean;
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
