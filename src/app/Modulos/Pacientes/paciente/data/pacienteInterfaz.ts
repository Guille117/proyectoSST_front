import { PersonaDatos, Sexo } from '../../../Usuarios/usu/data/usuarioInterfaz';

export type TipoAtencion = 'EMERGENCIA' | 'HOSPITALIZACION';
export type EstadoCivil = 'SOLTERO' | 'CASADO' | 'DIVORCIADO' | 'VIUDO';

export interface PacienteRequest {
  paciente: PacienteDatos;
  episodio: EpisodioRequest;
}

export interface PacienteActualizacionRequest {
  paciente: PacienteDatos;
  episodio: EpisodioRequest | null;
}

export interface PacienteMultipartRequest {
  request: PacienteRequest;
  archivoReferencia: File | null;
}

export interface PacienteActualizacionMultipartRequest {
  request: PacienteActualizacionRequest;
  archivoReferencia: File | null;
}

export interface PacienteDatos {
  pacienteId: number | null;
  persona: Omit<PersonaDatos, 'cui'> & { cui: string | null };
  estadoCivil: EstadoCivil | null;
  direccion: string | null;
  ocupacion: string | null;
  camaId: number | null;
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

export interface ResponsableDetalle {
  id: number;
  cui: string | null;
  nombres: string;
  apellidos: string;
  fechaNacimiento: string | null;
  sexo: Sexo | null;
  telefono: string | null;
  parentescoId: number | null;
  parentescoNombre: string | null;
  direccion: string | null;
}

export interface ReferenciaDetalle {
  id: number;
  institucionId: number | null;
  institucionNombre: string | null;
  motivoReferencia: string | null;
}

export interface PacienteDetalle {
  pacienteId: number;
  codigoExpediente: string | null;
  nombreCompleto: string;
  nombres: string;
  apellidos: string;
  cui: string | null;
  fechaNacimiento: string | null;
  edad: number | null;
  sexo: Sexo | null;
  telefono: string | null;
  email: string | null;
  estadoCivil: EstadoCivil | null;
  direccion: string | null;
  ocupacion: string | null;
  estado: boolean;
  episodioId: number | null;
  tipoAtencion: TipoAtencion | null;
  descripcion: string | null;
  fechaHoraIngreso: string | null;
  medicoId: number | null;
  medicoNombre: string | null;
  camaId: number | null;
  camaCodigo: string | null;
  responsable: ResponsableDetalle | null;
  referencia: ReferenciaDetalle | null;
}

export interface PacienteResponse {
  pacienteId: number;
  expedienteId: number | null;
  episodioId: number | null;
  fechaHoraIngreso: string | null;
  responsableId: number | null;
  referenciaId: number | null;
  pacienteExistente: boolean;
}


/** Datos del paciente que devuelve el listado de pacientes. */
export interface PacienteResumido {
  pacienteId: number;
  codigoExpediente: string;
  episodioId: number | null;
  ultimoEpisodioId: number | null;
  fechaHoraIngreso: string | null;
  nombreCompleto: string;
  cui: string | null;
  sexo: Sexo | null;
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

