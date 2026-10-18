import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, timeout } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { TIMEOUT_HTTP_MS } from '../../../evaluacion/data/constantes-clinicas';
import { CuidadoRequest, CuidadoResponse, EstadoCuidadoApi } from './cuidadoInterfaz';

/**
 * Cuidados indicados en un episodio: consulta, registro, actualización y eliminación lógica.
 */
@Injectable({
  providedIn: 'root',
})
export class IndicacionCuidadoService {
  private readonly apiUrl = `${environment.apiUrl}/cuidados`;

  constructor(private readonly http: HttpClient) {}

  buscarPorEpisodio(
    episodioId: number,
    estado: EstadoCuidadoApi,
  ): Observable<CuidadoResponse[]> {
    const params = new HttpParams().set('episodioId', episodioId).set('estado', estado);
    return this.http
      .get<CuidadoResponse[]>(`${this.apiUrl}/buscar`, { params })
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }

  crearCuidado(request: CuidadoRequest): Observable<CuidadoResponse> {
    return this.http
      .post<CuidadoResponse>(this.apiUrl, request)
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }

  actualizarCuidado(id: number, request: CuidadoRequest): Observable<CuidadoResponse> {
    return this.http
      .put<CuidadoResponse>(`${this.apiUrl}/${id}`, request)
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }

  eliminarCuidado(id: number): Observable<void> {
    return this.http
      .delete<void>(`${this.apiUrl}/${id}`)
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }
}
