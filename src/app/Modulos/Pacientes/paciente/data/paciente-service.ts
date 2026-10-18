import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, timeout } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  PacienteActualizacionMultipartRequest,
  PacienteDetalle,
  PacienteMultipartRequest,
  PacienteRequest,
  PacienteResponse,
  PacienteResumido,
} from './pacienteInterfaz';

const TIEMPO_ESPERA_MS = 5000;
const TIEMPO_ARCHIVO_MS = 30000;

@Injectable({
  providedIn: 'root',
})
export class PacienteService {
  private apiUrl = `${environment.apiUrl}/pacientes`;

  constructor(private http: HttpClient) {}

  postPaciente(paciente: PacienteMultipartRequest): Observable<PacienteRequest> {
    const formData = new FormData();
    formData.append(
      'request',
      new Blob([JSON.stringify(paciente.request)], { type: 'application/json' }),
    );

    if (paciente.archivoReferencia) {
      formData.append('archivoReferencia', paciente.archivoReferencia);
    }

    return this.http.post<PacienteRequest>(`${this.apiUrl}`, formData);
  }

  listarPacientes(): Observable<PacienteResumido[]> {
    return this.http
      .get<PacienteResumido[]>(`${this.apiUrl}`)
      .pipe(timeout(TIEMPO_ESPERA_MS));
  }

  /** Busca pacientes por nombre o CUI, incluidos los egresados. */
  buscarPacientes(texto: string): Observable<PacienteResumido[]> {
    const params = new HttpParams().set('texto', texto);
    return this.http
      .get<PacienteResumido[]>(`${this.apiUrl}/buscar`, { params })
      .pipe(timeout(TIEMPO_ESPERA_MS));
  }

  obtenerPaciente(id: number): Observable<PacienteDetalle> {
    return this.http
      .get<PacienteDetalle>(`${this.apiUrl}/${id}`)
      .pipe(timeout(TIEMPO_ESPERA_MS));
  }

  actualizarPaciente(
    id: number,
    paciente: PacienteActualizacionMultipartRequest,
  ): Observable<PacienteResponse> {
    const formData = new FormData();
    formData.append(
      'request',
      new Blob([JSON.stringify(paciente.request)], { type: 'application/json' }),
    );

    if (paciente.archivoReferencia) {
      formData.append('archivoReferencia', paciente.archivoReferencia);
    }

    return this.http
      .put<PacienteResponse>(`${this.apiUrl}/${id}`, formData)
      .pipe(timeout(paciente.archivoReferencia ? TIEMPO_ARCHIVO_MS : TIEMPO_ESPERA_MS));
  }
}
