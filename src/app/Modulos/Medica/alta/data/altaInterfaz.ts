import { TipoAtencion } from '../../../Pacientes/paciente/data/pacienteInterfaz';
import { Sexo } from '../../../Usuarios/usu/data/usuarioInterfaz';

/** Tipos de alta que admite el backend. */
export type TipoAltaApi = 'INDICACION_MEDICA' | 'RETIRO_VOLUNTARIO' | 'REFERENCIA_TRASLADO';

/** Persona que solicita el retiro voluntario. */
export type ResponsableRetiroApi = 'PACIENTE' | 'PERSONA_RESPONSABLE';

/** Estados con los que el backend clasifica un alta. */
export type EstadoAltaApi = 'VIGENTE' | 'ANULADA';

/** Tipos de tratamiento que puede llevar el alta. */
export type TipoTratamientoApi = 'MEDICAMENTO' | 'CUIDADO';

/** Tipos de duración aceptados por el backend para un tratamiento. */
export type TipoDuracionApi = 'DIAS' | 'DOSIS_UNICA' | 'TIEMPO_INDEFINIDO';

/** Medicamento o cuidado incluido en el tratamiento del alta. */
export interface AltaTratamientoRequest {
  tipo: TipoTratamientoApi;
  nombre: string;
  medicamentoLogId: number | null;
  medicamentoLibre: string | null;
  cantidad: number | null;
  unidadMedida: string | null;
  frecuencia: number;
  duracionTipo: TipoDuracionApi;
  duracion: number | null;
  observaciones: string | null;
}

/** Cuerpo con el que se registra o actualiza un alta. */
export interface AltaRequest {
  tipoAlta: TipoAltaApi;
  diagnosticoEgreso: string;
  condicionEgresoId: number | null;
  observacionEgreso: string | null;
  episodioId: number;
  usuarioId: number;
  responsableRetiro: ResponsableRetiroApi | null;
  motivoRetiro: string | null;
  riesgosRetiro: string[];
  institucionId: number | null;
  motivoReferencia: string | null;
  indicacionesTraslado: string | null;
  tratamientos: AltaTratamientoRequest[];
}

/** Tratamiento del alta tal como lo devuelve el backend. */
export interface AltaTratamientoResponse {
  tipo: TipoTratamientoApi;
  nombre: string;
  medicamentoLogId: number | null;
  medicamentoLibre: string | null;
  cantidad: number | null;
  unidadMedida: string | null;
  frecuencia: number;
  duracionTipo: TipoDuracionApi;
  duracion: number | null;
  observaciones: string | null;
}

/** Alta tal como la devuelve el backend. */
export interface AltaResponse {
  id: number;
  tipoAlta: TipoAltaApi;
  diagnosticoEgreso: string;
  condicionEgresoId: number | null;
  condicionEgresoNombre: string | null;
  observacionEgreso: string | null;
  fechaHoraEgreso: string;
  episodioId: number;
  usuarioId: number;
  usuarioNombre: string;
  estado: EstadoAltaApi;
  responsableRetiro: ResponsableRetiroApi | null;
  motivoRetiro: string | null;
  riesgosRetiro: string[];
  institucionId: number | null;
  institucionNombre: string | null;
  motivoReferencia: string | null;
  indicacionesTraslado: string | null;
  tratamientos: AltaTratamientoResponse[];
}

/** Resumen de un alta reciente para el listado de la pantalla de atención. */
export interface AltaRecienteResponse {
  altaId: number;
  tipoAlta: TipoAltaApi;
  fechaHoraEgreso: string;
  diagnosticoEgreso: string;
  condicionEgresoNombre: string | null;
  observacionEgreso: string | null;
  responsableRetiro: ResponsableRetiroApi | null;
  motivoRetiro: string | null;
  riesgosRetiro: string[];
  institucionNombre: string | null;
  motivoReferencia: string | null;
  indicacionesTraslado: string | null;
  episodioId: number;
  pacienteId: number | null;
  codigoExpediente: string | null;
  nombreCompleto: string;
  cui: string | null;
  sexo: Sexo | null;
  telefono: string | null;
  tipoAtencion: TipoAtencion;
  edad: number | null;
}

/** Condición de egreso del catálogo. */
export interface CondicionEgresoResponse {
  id: number;
  nombre: string;
  estado?: boolean;
}
