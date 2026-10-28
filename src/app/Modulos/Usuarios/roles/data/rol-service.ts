import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { ModuloResponse, RolResponse } from './rolInterfaz';

@Injectable({
  providedIn: 'root',
})
export class RolService {
  private apiUrl = `${environment.apiUrl}/roles`;

  constructor(private http: HttpClient) {}

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
