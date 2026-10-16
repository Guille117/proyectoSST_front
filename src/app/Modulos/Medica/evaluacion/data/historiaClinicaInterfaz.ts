export interface HistoriaClinicaRequest {
  descripcion: string;
  episodioId: number;
  usuarioId: number;
}

export interface HistoriaClinicaResponse {
  id: number;
  descripcion: string;
  episodioId: number;
  usuarioId: number;
  usuarioNombre: string;
  fecha: string;
  estado: boolean;
}
