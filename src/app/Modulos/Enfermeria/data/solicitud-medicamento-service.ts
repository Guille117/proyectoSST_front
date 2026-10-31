import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, timeout } from 'rxjs';
import { environment } from '../../../../environments/environment';

const TIEMPO_ESPERA_MS = 5000;

export interface SolicitudMedicamentoRequest {
  episodioId: number;
  usuarioId: number;
  medicamentos: { referenciaId: number; cantidad: number }[];
}

export interface SolicitudMedicamentoResponse {
  id: number;
  codigo: string;
  estado: string;
}

/** Envía a Farmacia la solicitud de medicamentos de Enfermería, sin procedimiento médico. */
@Injectable({
  providedIn: 'root',
})
export class SolicitudMedicamentoService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/solicitudesSalida`;

  crear(request: SolicitudMedicamentoRequest): Observable<SolicitudMedicamentoResponse> {
    return this.http
      .post<SolicitudMedicamentoResponse>(this.apiUrl, request)
      .pipe(timeout(TIEMPO_ESPERA_MS));
  }
}
