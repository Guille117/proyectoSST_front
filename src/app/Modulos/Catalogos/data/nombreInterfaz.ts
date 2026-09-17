export interface Nombre {
  nombre: string;
}

export interface nombreAbrev {
  nombre: string;
  abreviatura: string;
}

export interface NombreGet {
  id: number;
  nombre: string;
  activo?: boolean;
}

export interface unidadMedida {
  id: number;
  nombre: string;
  abreviatura: string;
  activo?: boolean;
}

export interface registrosCatalogos {
  tabla: string;
  total: number;
}
