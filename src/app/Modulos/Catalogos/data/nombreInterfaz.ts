export interface Nombre {
  nombre: string;
}


export interface tipoDato2Post {
  nombre: string;
  abreviatura?: string;
  descripcion?: string;
}

export interface NombreGet {
  id: number;
  nombre: string;
  activo?: boolean;
}


export interface tipoDato2 {
  id: number;
  nombre: string;
  descripcion?: string;
  aux1?: string;
  abreviatura?: string;
  activo?: boolean;
}

export interface registrosCatalogos {
  tabla: string;
  total: number;
}

