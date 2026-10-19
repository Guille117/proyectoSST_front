import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, timeout } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { TIMEOUT_HTTP_MS } from '../../evaluacion/data/constantes-clinicas';
import {
  EvolucionRequest,
  EvolucionResponse,
  EstadoEvolucionApi,
} from './evolucionInterfaz';

/**
 * Evoluciones del episodio: consulta, registro, actualización y eliminación lógica.
 */
@Injectable({
  providedIn: 'root',
})
export class EvolucionService {
  private readonly apiUrl = `${environment.apiUrl}/evolucion`;

  constructor(private readonly http: HttpClient) {}

  buscarPorEpisodio(
    episodioId: number,
    estado: EstadoEvolucionApi,
  ): Observable<EvolucionResponse[]> {
    const params = new HttpParams().set('episodioId', episodioId).set('estado', estado);
    return this.http
      .get<EvolucionResponse[]>(`${this.apiUrl}/buscar`, { params })
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }

  crear(request: EvolucionRequest): Observable<EvolucionResponse> {
    return this.http
      .post<EvolucionResponse>(this.apiUrl, request)
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }

  actualizar(id: number, request: EvolucionRequest): Observable<EvolucionResponse> {
    return this.http
      .put<EvolucionResponse>(`${this.apiUrl}/${id}`, request)
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }

  eliminar(id: number): Observable<void> {
    return this.http
      .delete<void>(`${this.apiUrl}/${id}`)
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }
}
