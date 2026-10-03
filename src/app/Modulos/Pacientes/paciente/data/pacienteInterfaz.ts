import { PersonaDatos } from '../../../Usuarios/usu/data/usuarioInterfaz';

export type TipoAtencion = 'EMERGENCIA' | 'HOSPITALIZACION';
export type EstadoCivil = 'SOLTERO' | 'CASADO' | 'DIVORCIADO' | 'VIUDO';

export interface PacienteRequest {
  paciente: PacienteDatos;
  episodio: EpisodioRequest;
}

export interface PacienteMultipartRequest {
  request: PacienteRequest;
  archivoReferencia: File | null;
}

export interface PacienteDatos {
  persona: Omit<PersonaDatos, 'cui'> & { cui: string | null };
  estadoCivil: EstadoCivil | null;
  direccion: string | null;
  ocupacion: string | null;
}

export interface EpisodioRequest {
  tipoAtencion: TipoAtencion;
  descripcion: string;
  medicoId: number;
  responsable: ResponsableRequest | null;
  referencia: ReferenciaRequest | null;
}

export interface ResponsableRequest {
  persona: PersonaDatos;
  parentescoId: number;
  direccion: string | null;
}

export interface ReferenciaRequest {
  institucionId: number;
  motivoReferencia: string | null;
}


// --------------------- datos resumidos de paciente ------------------------- 
export interface PacienteResumido {
  codigoExpediente: string;
  nombreCompleto: string;
  telefono: string;
  tipoTratamiento: TipoAtencion;
  estado: boolean;
}


// medico
export interface MedicoDatos {
    id: number;
  nombreCompleto: string;
  especialidad: string;
}

