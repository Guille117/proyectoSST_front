import { TipoAtencion } from '../../paciente/data/pacienteInterfaz';

export interface EpisodioResumen {
  episodioId: number;
  tipoAtencion: TipoAtencion;
  fechaHoraIngreso: string;
  fechaHoraEgreso: string | null;
  medicoNombre: string | null;
  activo: boolean;
}

/** Opciones del submenú del expediente clínico. */
export type SeccionExpediente =
  | 'resumen'
  | 'evaluacion'
  | 'examenes'
  | 'procedimientos'
  | 'evolucion'
  | 'indicaciones'
  | 'alta'
  | 'registros-enfermeria'
  | 'consumo';
