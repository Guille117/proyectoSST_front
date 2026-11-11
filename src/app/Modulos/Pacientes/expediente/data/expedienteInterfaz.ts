import { TipoAtencion } from '../../paciente/data/pacienteInterfaz';

export interface EpisodioResumen {
  episodioId: number;
  tipoAtencion: TipoAtencion;
  fechaHoraIngreso: string;
  fechaHoraEgreso: string | null;
  medicoNombre: string | null;
  activo: boolean;
  /** Motivo o descripción con el que se registró la atención. */
  descripcion?: string | null;
  /** Cama utilizada durante el episodio. */
  camaCodigo?: string | null;
  responsableNombre?: string | null;
  responsableTelefono?: string | null;
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
