import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, timeout } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { TIMEOUT_HTTP_MS } from '../../evaluacion/data/constantes-clinicas';
import {
  ProcedimientoMedicoRequest,
  ProcedimientoMedicoResponse,
  RecursoDisponibleResponse,
  TipoProcedimientoResponse,
  TipoRecursoProcedimientoApi,
} from './procedimientoMedicoInterfaz';

/**
 * Procedimientos médicos del episodio: catálogo de tipos, registro, consulta, actualización,
 * eliminación lógica y búsqueda de medicamentos o insumos en farmacia.
 */
@Injectable({
  providedIn: 'root',
})
export class ProcedimientoMedicoService {
  private readonly apiUrl = `${environment.apiUrl}/procedimientosMedicos`;
  private readonly tiposUrl = `${environment.apiUrl}/procedimientos`;

  constructor(private readonly http: HttpClient) {}

  getTiposProcedimiento(): Observable<TipoProcedimientoResponse[]> {
    const params = new HttpParams().set('activos', true);
    return this.http
      .get<TipoProcedimientoResponse[]>(this.tiposUrl, { params })
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }

  getProcedimientos(episodioId: number): Observable<ProcedimientoMedicoResponse[]> {
    const params = new HttpParams().set('episodioId', episodioId);
    return this.http
      .get<ProcedimientoMedicoResponse[]>(`${this.apiUrl}/buscar`, { params })
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }

  crearProcedimiento(
    request: ProcedimientoMedicoRequest,
  ): Observable<ProcedimientoMedicoResponse> {
    return this.http
      .post<ProcedimientoMedicoResponse>(this.apiUrl, request)
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }

  actualizarProcedimiento(
    id: number,
    request: ProcedimientoMedicoRequest,
  ): Observable<ProcedimientoMedicoResponse> {
    return this.http
      .put<ProcedimientoMedicoResponse>(`${this.apiUrl}/${id}`, request)
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }

  eliminarProcedimiento(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`).pipe(timeout(TIMEOUT_HTTP_MS));
  }

  buscarRecursos(
    tipo: TipoRecursoProcedimientoApi,
    nombre = '',
  ): Observable<RecursoDisponibleResponse[]> {
    let params = new HttpParams().set('tipo', tipo);
    const termino = nombre.trim();
    if (termino) params = params.set('nombre', termino);

    return this.http
      .get<RecursoDisponibleResponse[]>(`${this.apiUrl}/recursos`, { params })
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }
}
