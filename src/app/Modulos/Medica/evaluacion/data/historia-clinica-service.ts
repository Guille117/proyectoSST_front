import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, timeout } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { TIMEOUT_HTTP_MS } from './constantes-clinicas';
import { HistoriaClinicaRequest, HistoriaClinicaResponse } from './historiaClinicaInterfaz';

@Injectable({
  providedIn: 'root',
})
export class HistoriaClinicaService {
  // URL base para las solicitudes HTTP de historia clínica
  private apiUrl = `${environment.apiUrl}/historiaClinica`;

  constructor(private http: HttpClient) {}

  postHistoria(historia: HistoriaClinicaRequest): Observable<HistoriaClinicaResponse> {
    return this.http
      .post<HistoriaClinicaResponse>(`${this.apiUrl}`, historia, {
        headers: { 'Content-Type': 'application/json' },
      })
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }

  getHistoriasPorEstado(activo = true): Observable<HistoriaClinicaResponse[]> {
    const params = new HttpParams().set('activo', activo);
    return this.http
      .get<HistoriaClinicaResponse[]>(`${this.apiUrl}`, { params })
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }

  getHistoriasPorEpisodio(
    episodioId: number,
    activo = true,
  ): Observable<HistoriaClinicaResponse[]> {
    const params = new HttpParams().set('episodioId', episodioId).set('activo', activo);
    return this.http
      .get<HistoriaClinicaResponse[]>(`${this.apiUrl}/buscar`, { params })
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }

  getHistoriaPorId(id: number): Observable<HistoriaClinicaResponse> {
    return this.http
      .get<HistoriaClinicaResponse>(`${this.apiUrl}/${id}`)
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }

  putHistoria(id: number, historia: HistoriaClinicaRequest): Observable<HistoriaClinicaResponse> {
    return this.http
      .put<HistoriaClinicaResponse>(`${this.apiUrl}/${id}`, historia)
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }

  cambiarEstado(id: number): Observable<HistoriaClinicaResponse> {
    return this.http
      .patch<HistoriaClinicaResponse>(`${this.apiUrl}/${id}`, null)
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }
}
