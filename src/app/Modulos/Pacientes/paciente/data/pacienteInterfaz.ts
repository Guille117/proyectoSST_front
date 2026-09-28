import { PersonaDatos } from '../../../Usuarios/usu/data/usuarioInterfaz';

export type TipoAtencion = 'EMERGENCIA' | 'HOSPITALIZACION';
export type EstadoCivil = 'SOLTERO' | 'CASADO' | 'DIVORCIADO' | 'VIUDO';

export interface PacienteRequest {
  paciente: PacienteDatos;
  episodio: EpisodioRequest;
}

export interface PacienteDatos {
  persona: PersonaDatos;
  estadoCivil: EstadoCivil;
  direccion: string | null;
  ocupacion: string | null;
}

export interface EpisodioRequest {
  tipoAtencion: TipoAtencion;
  descripcion: string;
  medicoId: number;
  responsable: ResponsableRequest;
  referencia: ReferenciaRequest | null;
}

export interface ResponsableRequest {
  persona: PersonaDatos;
  parentesco: string;
  direccion: string | null;
}

export interface ReferenciaRequest {
  institucion: string;
  motivo: string;
  documento?: File | null;
}

// medico
export interface MedicoDatos {
    id: number;
  nombreCompleto: string;
}

