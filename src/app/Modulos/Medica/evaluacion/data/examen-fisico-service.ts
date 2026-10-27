import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, timeout } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { TIMEOUT_HTTP_MS } from './constantes-clinicas';
import {
  ExamenFisicoRequest,
  ExamenFisicoResponse,
  ParteCuerpoResponse,
} from './examenFisicoInterfaz';

@Injectable({
  providedIn: 'root',
})
export class ExamenFisicoService {
  // URL base para las solicitudes HTTP del examen físico
  private apiUrl = `${environment.apiUrl}/examenFisico`;
  // URL de la base para las partes del cuerpo que puede registrar el examen físico
  private apiUrlPartesCuerpo = `${environment.apiUrl}/partesCuerpo`;

  constructor(private http: HttpClient) {}

  // ------------------- PARTES DEL CUERPO -------------------
  /** Catálogo de partes del cuerpo: cada una es una región donde se registra un hallazgo. */
  getPartesCuerpo(activos = true): Observable<ParteCuerpoResponse[]> {
    const params = new HttpParams().set('activos', activos);
    return this.http
      .get<ParteCuerpoResponse[]>(`${this.apiUrlPartesCuerpo}`, { params })
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }

  postParteCuerpo(nombre: string): Observable<ParteCuerpoResponse> {
    return this.http
      .post<ParteCuerpoResponse>(this.apiUrlPartesCuerpo, { nombre })
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }

  // ------------------- EXAMEN FÍSICO -------------------
  postExamen(examen: ExamenFisicoRequest): Observable<ExamenFisicoResponse> {
    return this.http
      .post<ExamenFisicoResponse>(`${this.apiUrl}`, examen, {
        headers: { 'Content-Type': 'application/json' },
      })
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }

  getExamenesPorEstado(activo = true): Observable<ExamenFisicoResponse[]> {
    const params = new HttpParams().set('activo', activo);
    return this.http
      .get<ExamenFisicoResponse[]>(`${this.apiUrl}`, { params })
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }

  /** Hallazgos del episodio. El backend los devuelve del más reciente al más antiguo. */
  getExamenesPorEpisodio(episodioId: number, activo = true): Observable<ExamenFisicoResponse[]> {
    const params = new HttpParams().set('episodioId', episodioId).set('activo', activo);
    return this.http
      .get<ExamenFisicoResponse[]>(`${this.apiUrl}/buscar`, { params })
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }

  /** Hallazgos de una parte del cuerpo; la búsqueda prioriza esta parte sobre el episodio. */
  getExamenesPorParteCuerpo(
    parteCuerpoId: number,
    activo = true,
  ): Observable<ExamenFisicoResponse[]> {
    const params = new HttpParams().set('parteCuerpoId', parteCuerpoId).set('activo', activo);
    return this.http
      .get<ExamenFisicoResponse[]>(`${this.apiUrl}/buscar`, { params })
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }

  getExamenPorId(id: number): Observable<ExamenFisicoResponse> {
    return this.http
      .get<ExamenFisicoResponse>(`${this.apiUrl}/${id}`)
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }

  putExamen(id: number, examen: ExamenFisicoRequest): Observable<ExamenFisicoResponse> {
    return this.http
      .put<ExamenFisicoResponse>(`${this.apiUrl}/${id}`, examen)
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }

  cambiarEstado(id: number): Observable<ExamenFisicoResponse> {
    return this.http
      .patch<ExamenFisicoResponse>(`${this.apiUrl}/${id}`, null)
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }
}
