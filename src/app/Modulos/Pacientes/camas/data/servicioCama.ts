import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { camaRequest, camaResponseSimple, EstadoCama } from './interfazCama';

@Injectable({
  providedIn: 'root',
})
export class ServicioCama {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/camas`;

  crearCama(cama: camaRequest): Observable<unknown> {
    return this.http.post<unknown>(this.apiUrl, cama, {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  listarCamas(activos?: boolean): Observable<camaResponseSimple[]> {
    let params = new HttpParams();
    if (activos !== undefined) {
      params = params.set('activos', activos)
    }
    return this.http.get<camaResponseSimple[]>(`${this.apiUrl}`, { params });
  }

  buscarCamas(texto: string, activos: boolean): Observable<camaResponseSimple[]> {
    const params = new HttpParams().set('texto', texto).set('activos', activos);
    return this.http.get<camaResponseSimple[]>(`${this.apiUrl}/buscar`, { params });
  }

  // trae las llaves foráneas para actualizar
  traerReferencias(id: number): Observable<camaRequest> {
    return this.http.get<camaRequest>(`${this.apiUrl}/${id}/referencias`);
  }

  actualizarCama(id: number, cama: camaRequest): Observable<unknown> {
    return this.http.put<unknown>(`${this.apiUrl}/${id}`, cama, {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  cambiarEstadoCama(camaId: number, estado: EstadoCama): Observable<unknown> {
    let params = new HttpParams().set('estado', estado);
    return this.http.patch<unknown>(`${this.apiUrl}/${camaId}/estado`, null, { params });
  }

  cambiarActivoCama(camaId: number): Observable<unknown> {
    return this.http.patch<unknown>(`${this.apiUrl}/${camaId}`, null);
  }
}
