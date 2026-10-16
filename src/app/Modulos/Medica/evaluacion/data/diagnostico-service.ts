import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, timeout } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { TIMEOUT_HTTP_MS } from './constantes-clinicas';
import {
  DiagnosticoRequest,
  DiagnosticoResponse,
  TipoDiagnostico,
} from './diagnosticoInterfaz';

@Injectable({
  providedIn: 'root',
})
export class DiagnosticoService {
  // URL base para las solicitudes HTTP de diagnóstico
  private apiUrl = `${environment.apiUrl}/diagnostico`;

  constructor(private http: HttpClient) {}

  postDiagnostico(diagnostico: DiagnosticoRequest): Observable<DiagnosticoResponse> {
    return this.http
      .post<DiagnosticoResponse>(`${this.apiUrl}`, diagnostico, {
        headers: { 'Content-Type': 'application/json' },
      })
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }

  getDiagnosticosPorEstado(activo = true): Observable<DiagnosticoResponse[]> {
    const params = new HttpParams().set('activo', activo);
    return this.http
      .get<DiagnosticoResponse[]>(`${this.apiUrl}`, { params })
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }

  /** Diagnósticos del episodio. El backend los devuelve del más reciente al más antiguo. */
  getDiagnosticosPorEpisodio(
    episodioId: number,
    activo = true,
  ): Observable<DiagnosticoResponse[]> {
    const params = new HttpParams().set('episodioId', episodioId).set('activo', activo);
    return this.http
      .get<DiagnosticoResponse[]>(`${this.apiUrl}/buscar`, { params })
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }

  /** Diagnósticos por tipo; la búsqueda prioriza el tipo sobre el episodio. */
  getDiagnosticosPorTipo(
    tipoDiagnostico: TipoDiagnostico,
    activo = true,
  ): Observable<DiagnosticoResponse[]> {
    const params = new HttpParams().set('tipoDiagnostico', tipoDiagnostico).set('activo', activo);
    return this.http
      .get<DiagnosticoResponse[]>(`${this.apiUrl}/buscar`, { params })
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }

  getDiagnosticoPorId(id: number): Observable<DiagnosticoResponse> {
    return this.http
      .get<DiagnosticoResponse>(`${this.apiUrl}/${id}`)
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }

  putDiagnostico(id: number, diagnostico: DiagnosticoRequest): Observable<DiagnosticoResponse> {
    return this.http
      .put<DiagnosticoResponse>(`${this.apiUrl}/${id}`, diagnostico)
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }

  cambiarEstado(id: number): Observable<DiagnosticoResponse> {
    return this.http
      .patch<DiagnosticoResponse>(`${this.apiUrl}/${id}`, null)
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }
}
