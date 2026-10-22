import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, timeout } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { TIMEOUT_HTTP_MS } from '../../../Medica/evaluacion/data/constantes-clinicas';
import { SignosVitalesRequest, SignosVitalesResponse } from './signosVitalesInterfaz';

/** Signos vitales registrados por Enfermería en un episodio. */
@Injectable({
  providedIn: 'root',
})
export class SignosVitalesService {
  private readonly apiUrl = `${environment.apiUrl}/enfermeria/signos-vitales`;

  constructor(private readonly http: HttpClient) {}

  buscarPorEpisodio(episodioId: number): Observable<SignosVitalesResponse[]> {
    const params = new HttpParams().set('episodioId', episodioId);
    return this.http
      .get<SignosVitalesResponse[]>(`${this.apiUrl}/buscar`, { params })
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }

  crear(request: SignosVitalesRequest): Observable<SignosVitalesResponse> {
    return this.http
      .post<SignosVitalesResponse>(this.apiUrl, request)
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }

  actualizar(id: number, request: SignosVitalesRequest): Observable<SignosVitalesResponse> {
    return this.http
      .put<SignosVitalesResponse>(`${this.apiUrl}/${id}`, request)
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(timeout(TIMEOUT_HTTP_MS));
  }
}
