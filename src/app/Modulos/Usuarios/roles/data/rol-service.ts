import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { ModuloResponse, RolRequest, RolResponse } from './rolInterfaz';

@Injectable({
  providedIn: 'root',
})
export class RolService {
  private apiUrl = `${environment.apiUrl}/roles`;

  constructor(private http: HttpClient) {}

  postRol(rol: RolRequest): Observable<RolResponse> {
    return this.http.post<RolResponse>(`${this.apiUrl}`, rol, {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  getRoles(activos?: boolean): Observable<RolResponse[]> {
    let params = new HttpParams();
    if (activos !== undefined) {
      params = params.set('activos', activos);
    }
    return this.http.get<RolResponse[]>(`${this.apiUrl}`, { params });
  }

  getRolById(id: number): Observable<RolResponse> {
    return this.http.get<RolResponse>(`${this.apiUrl}/${id}`);
  }

  putRol(id: number, rol: RolRequest): Observable<RolResponse> {
    return this.http.put<RolResponse>(`${this.apiUrl}/${id}`, rol);
  }

  cambiarEstado(id: number): Observable<RolResponse> {
    return this.http.patch<RolResponse>(`${this.apiUrl}/${id}`, null);
  }

  buscarRoles(criterio: string, activos?: boolean): Observable<RolResponse[]> {
    let params = new HttpParams().set('criterio', criterio);
    if (activos !== undefined) {
      params = params.set('activos', activos);
    }
    return this.http.get<RolResponse[]>(`${this.apiUrl}/buscar`, { params });
  }

  getModulos(): Observable<ModuloResponse[]> {
    return this.http.get<ModuloResponse[]>(`${this.apiUrl}/modulos`);
  }
}
