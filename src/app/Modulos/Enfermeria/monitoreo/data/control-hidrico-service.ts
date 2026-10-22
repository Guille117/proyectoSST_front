import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, timeout } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { TIMEOUT_HTTP_MS } from '../../../Medica/evaluacion/data/constantes-clinicas';
import { ControlHidricoRequest, ControlHidricoResponse } from './controlHidricoInterfaz';

/** Control hídrico registrado por Enfermería en un episodio. */
@Injectable({
  providedIn: 'root',
})
export class ControlHidricoService {
  private readonly apiUrl = `${environment.apiUrl}/enfermeria/control-hidrico`;

  constructor(private readonly http: HttpClient) {}

  buscarPorEpisodio(episodioId: number): Observable<ControlHidricoResponse[]> {
    const params = new HttpParams().set('episodioId', episodioId);
    return this.http
      .get<ControlHidricoResponse[]>(`${this.apiUrl}/buscar`, { params })
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }

  crear(request: ControlHidricoRequest): Observable<ControlHidricoResponse> {
    return this.http
      .post<ControlHidricoResponse>(this.apiUrl, request)
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }

  actualizar(id: number, request: ControlHidricoRequest): Observable<ControlHidricoResponse> {
    return this.http
      .put<ControlHidricoResponse>(`${this.apiUrl}/${id}`, request)
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(timeout(TIMEOUT_HTTP_MS));
  }
}
