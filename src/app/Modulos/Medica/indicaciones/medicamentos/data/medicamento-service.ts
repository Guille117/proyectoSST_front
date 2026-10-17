import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, timeout } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { TIMEOUT_HTTP_MS } from '../../../evaluacion/data/constantes-clinicas';
import {
  EstadoIndicacionMedicamento,
  MedicamentoCatalogoResponse,
  MedicamentoIndicacionRequest,
  MedicamentoIndicacionResponse,
} from './medicamentoInterfaz';

/**
 * Indicaciones médicas de medicamentos: crea, consulta, actualiza, cambia de estado y elimina las
 * indicaciones del episodio, además de buscar medicamentos en el catálogo de farmacia.
 */
@Injectable({
  providedIn: 'root',
})
export class MedicamentoIndicacionService {
  private readonly apiUrl = `${environment.apiUrl}/medicamentos`;
  private readonly catalogoUrl = `${environment.apiUrl}/medicamentoLog`;

  constructor(private readonly http: HttpClient) {}

  // ------------------- INDICACIONES -------------------
  postIndicacion(
    indicacion: MedicamentoIndicacionRequest,
  ): Observable<MedicamentoIndicacionResponse> {
    return this.http
      .post<MedicamentoIndicacionResponse>(this.apiUrl, indicacion, {
        headers: { 'Content-Type': 'application/json' },
      })
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }

  getIndicacionesPorEstado(
    estado: EstadoIndicacionMedicamento,
  ): Observable<MedicamentoIndicacionResponse[]> {
    const params = new HttpParams().set('estado', estado);
    return this.http
      .get<MedicamentoIndicacionResponse[]>(this.apiUrl, { params })
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }

  getIndicacionesPorEpisodio(
    episodioId: number,
    estado: EstadoIndicacionMedicamento,
  ): Observable<MedicamentoIndicacionResponse[]> {
    const params = new HttpParams().set('episodioId', episodioId).set('estado', estado);
    return this.http
      .get<MedicamentoIndicacionResponse[]>(`${this.apiUrl}/buscar`, { params })
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }

  getIndicacionPorId(id: number): Observable<MedicamentoIndicacionResponse> {
    return this.http
      .get<MedicamentoIndicacionResponse>(`${this.apiUrl}/${id}`)
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }

  putIndicacion(
    id: number,
    indicacion: MedicamentoIndicacionRequest,
  ): Observable<MedicamentoIndicacionResponse> {
    return this.http
      .put<MedicamentoIndicacionResponse>(`${this.apiUrl}/${id}`, indicacion)
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }

  cambiarEstado(
    id: number,
    estado: EstadoIndicacionMedicamento,
  ): Observable<MedicamentoIndicacionResponse> {
    const params = new HttpParams().set('estado', estado);
    return this.http
      .patch<MedicamentoIndicacionResponse>(`${this.apiUrl}/${id}/estado`, null, { params })
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }

  eliminarIndicacion(id: number): Observable<void> {
    return this.http
      .delete<void>(`${this.apiUrl}/${id}`)
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }

  // ------------------- CATÁLOGO DE MEDICAMENTOS -------------------
  buscarCatalogo(nombre = ''): Observable<MedicamentoCatalogoResponse[]> {
    let params = new HttpParams().set('activo', true);
    const termino = nombre.trim();
    if (termino) params = params.set('nombre', termino);

    return this.http
      .get<MedicamentoCatalogoResponse[]>(`${this.catalogoUrl}/buscar`, { params })
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }

  getCatalogoPorId(id: number): Observable<MedicamentoCatalogoResponse> {
    const params = new HttpParams().set('activo', true);
    return this.http
      .get<MedicamentoCatalogoResponse>(`${this.catalogoUrl}/${id}`, { params })
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }
}
