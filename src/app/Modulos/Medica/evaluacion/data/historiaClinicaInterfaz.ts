export interface HistoriaClinicaRequest {
  descripcion: string;
  episodioId: number;
  usuarioId: number;
  estadoClinicoId: number | null;
}

export interface HistoriaClinicaResponse {
  id: number;
  descripcion: string;
  episodioId: number;
  usuarioId: number;
  usuarioNombre: string;
  usuarioNombreCorto: string;
  fecha: string;
  estado: boolean;
  estadoClinicoId: number | null;
  estadoClinicoNombre: string | null;
}
