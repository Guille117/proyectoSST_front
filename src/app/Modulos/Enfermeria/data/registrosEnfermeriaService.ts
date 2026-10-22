import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, timeout } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { TIMEOUT_HTTP_MS } from '../../Medica/evaluacion/data/constantes-clinicas';
import {
  AplicacionMedicamentoRequest,
  AplicacionMedicamentoResponse,
  EjecucionCuidadoRequest,
  EjecucionCuidadoResponse,
} from './registrosEnfermeriaInterfaz';

/**
 * Registros de Enfermería sobre las indicaciones médicas: aplicaciones de medicamentos y
 * ejecuciones de cuidados.
 */
@Injectable({
  providedIn: 'root',
})
export class RegistrosEnfermeriaService {
  private readonly aplicacionesUrl = `${environment.apiUrl}/enfermeria/aplicaciones-medicamento`;
  private readonly ejecucionesUrl = `${environment.apiUrl}/enfermeria/ejecuciones-cuidado`;

  constructor(private readonly http: HttpClient) {}

  // ------------------- APLICACIONES DE MEDICAMENTO -------------------
  buscarAplicacionesPorIndicacion(
    indicacionId: number,
  ): Observable<AplicacionMedicamentoResponse[]> {
    const params = new HttpParams().set('indicacionId', indicacionId);
    return this.http
      .get<AplicacionMedicamentoResponse[]>(`${this.aplicacionesUrl}/buscar`, { params })
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }

  buscarAplicacionesPorEpisodio(episodioId: number): Observable<AplicacionMedicamentoResponse[]> {
    const params = new HttpParams().set('episodioId', episodioId);
    return this.http
      .get<AplicacionMedicamentoResponse[]>(`${this.aplicacionesUrl}/buscar`, { params })
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }

  crearAplicacion(
    request: AplicacionMedicamentoRequest,
  ): Observable<AplicacionMedicamentoResponse> {
    return this.http
      .post<AplicacionMedicamentoResponse>(this.aplicacionesUrl, request)
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }

  actualizarAplicacion(
    id: number,
    request: AplicacionMedicamentoRequest,
  ): Observable<AplicacionMedicamentoResponse> {
    return this.http
      .put<AplicacionMedicamentoResponse>(`${this.aplicacionesUrl}/${id}`, request)
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }

  eliminarAplicacion(id: number): Observable<void> {
    return this.http
      .delete<void>(`${this.aplicacionesUrl}/${id}`)
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }

  // ------------------- EJECUCIONES DE CUIDADO -------------------
  buscarEjecucionesPorCuidado(cuidadoId: number): Observable<EjecucionCuidadoResponse[]> {
    const params = new HttpParams().set('cuidadoId', cuidadoId);
    return this.http
      .get<EjecucionCuidadoResponse[]>(`${this.ejecucionesUrl}/buscar`, { params })
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }

  buscarEjecucionesPorEpisodio(episodioId: number): Observable<EjecucionCuidadoResponse[]> {
    const params = new HttpParams().set('episodioId', episodioId);
    return this.http
      .get<EjecucionCuidadoResponse[]>(`${this.ejecucionesUrl}/buscar`, { params })
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }

  crearEjecucion(request: EjecucionCuidadoRequest): Observable<EjecucionCuidadoResponse> {
    return this.http
      .post<EjecucionCuidadoResponse>(this.ejecucionesUrl, request)
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }

  actualizarEjecucion(
    id: number,
    request: EjecucionCuidadoRequest,
  ): Observable<EjecucionCuidadoResponse> {
    return this.http
      .put<EjecucionCuidadoResponse>(`${this.ejecucionesUrl}/${id}`, request)
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }

  eliminarEjecucion(id: number): Observable<void> {
    return this.http
      .delete<void>(`${this.ejecucionesUrl}/${id}`)
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }
}
