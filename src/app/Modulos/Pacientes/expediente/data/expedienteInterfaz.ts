import { TipoAtencion } from '../../paciente/data/pacienteInterfaz';

export interface EpisodioResumen {
  episodioId: number;
  tipoAtencion: TipoAtencion;
  fechaHoraIngreso: string;
  fechaHoraEgreso: string | null;
  medicoNombre: string | null;
  activo: boolean;
}
