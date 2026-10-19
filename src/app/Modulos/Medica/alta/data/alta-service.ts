import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, timeout } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { TIMEOUT_HTTP_MS } from '../../evaluacion/data/constantes-clinicas';
import { AltaRecienteResponse, AltaRequest, AltaResponse } from './altaInterfaz';

/**
 * Altas del episodio: consulta la alta vigente, la registra, la actualiza y la anula.
 */
@Injectable({
  providedIn: 'root',
})
export class AltaService {
  private readonly apiUrl = `${environment.apiUrl}/altas`;

  constructor(private readonly http: HttpClient) {}

  recientes(horas = 48): Observable<AltaRecienteResponse[]> {
    const params = new HttpParams().set('horas', horas);
    return this.http
      .get<AltaRecienteResponse[]>(`${this.apiUrl}/recientes`, { params })
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }

  buscarPorEpisodio(episodioId: number): Observable<AltaResponse[]> {
    const params = new HttpParams().set('episodioId', episodioId);
    return this.http
      .get<AltaResponse[]>(`${this.apiUrl}/buscar`, { params })
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }

  crear(request: AltaRequest): Observable<AltaResponse> {
    return this.http
      .post<AltaResponse>(this.apiUrl, request)
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }

  actualizar(id: number, request: AltaRequest): Observable<AltaResponse> {
    return this.http
      .put<AltaResponse>(`${this.apiUrl}/${id}`, request)
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }

  anular(id: number): Observable<void> {
    return this.http
      .delete<void>(`${this.apiUrl}/${id}`)
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }
}
