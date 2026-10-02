// interfaces globales
export interface Inter_base{
  id?: number;
  nombre: string;
}

export interface Inter_descripcion extends Inter_base {
  descripcion: string;
}


// interfaz especifico para unidad de medida
export interface Inter_unidadMedida extends Inter_base {
  abreviatura: string;
}

// interfaz especifica para institución
export interface Inter_institucion extends Inter_base{
  telefono: string;
  direccion: string;
}


export interface Nombre {
  nombre: string;
}


export interface tipoDato2Post {
  nombre: string;
  abreviatura?: string;
  descripcion?: string;
  telefono?: string;
  direccion?: string;
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
  telefono?: string;
  direccion?: string;
  aux1?: string;
  abreviatura?: string;
  activo?: boolean;
}

export interface registrosCatalogos {
  tabla: string;
  total: number;
}

export interface ConteoCatalogosUsuarios {
  puestos: number;
  especialidades: number;
}

