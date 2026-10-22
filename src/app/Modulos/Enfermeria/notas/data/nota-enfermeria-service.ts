import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, timeout } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { TIMEOUT_HTTP_MS } from '../../../Medica/evaluacion/data/constantes-clinicas';
import { NotaEnfermeriaRequest, NotaEnfermeriaResponse } from './notaEnfermeriaInterfaz';

/** Notas de enfermería de un episodio. */
@Injectable({
  providedIn: 'root',
})
export class NotaEnfermeriaService {
  private readonly apiUrl = `${environment.apiUrl}/enfermeria/notas`;

  constructor(private readonly http: HttpClient) {}

  buscarPorEpisodio(episodioId: number): Observable<NotaEnfermeriaResponse[]> {
    const params = new HttpParams().set('episodioId', episodioId);
    return this.http
      .get<NotaEnfermeriaResponse[]>(`${this.apiUrl}/buscar`, { params })
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }

  crear(request: NotaEnfermeriaRequest): Observable<NotaEnfermeriaResponse> {
    return this.http
      .post<NotaEnfermeriaResponse>(this.apiUrl, request)
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }

  actualizar(id: number, request: NotaEnfermeriaRequest): Observable<NotaEnfermeriaResponse> {
    return this.http
      .put<NotaEnfermeriaResponse>(`${this.apiUrl}/${id}`, request)
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(timeout(TIMEOUT_HTTP_MS));
  }
}
