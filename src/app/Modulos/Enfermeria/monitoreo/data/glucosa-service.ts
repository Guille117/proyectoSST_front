import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, timeout } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { TIMEOUT_HTTP_MS } from '../../../Medica/evaluacion/data/constantes-clinicas';
import { GlucosaRequest, GlucosaResponse } from './glucosaInterfaz';

/** Mediciones de glucosa registradas por Enfermería en un episodio. */
@Injectable({
  providedIn: 'root',
})
export class GlucosaService {
  private readonly apiUrl = `${environment.apiUrl}/enfermeria/glucosa`;

  constructor(private readonly http: HttpClient) {}

  buscarPorEpisodio(episodioId: number): Observable<GlucosaResponse[]> {
    const params = new HttpParams().set('episodioId', episodioId);
    return this.http
      .get<GlucosaResponse[]>(`${this.apiUrl}/buscar`, { params })
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }

  crear(request: GlucosaRequest): Observable<GlucosaResponse> {
    return this.http.post<GlucosaResponse>(this.apiUrl, request).pipe(timeout(TIMEOUT_HTTP_MS));
  }

  actualizar(id: number, request: GlucosaRequest): Observable<GlucosaResponse> {
    return this.http
      .put<GlucosaResponse>(`${this.apiUrl}/${id}`, request)
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(timeout(TIMEOUT_HTTP_MS));
  }
}
