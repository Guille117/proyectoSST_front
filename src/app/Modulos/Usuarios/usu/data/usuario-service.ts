import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { UsuarioRequest, UsuarioResponse } from './usuarioInterfaz';

@Injectable({
  providedIn: 'root',
})
export class UsuarioService {
  private apiUrl = `${environment.apiUrl}/usuarios`;

  constructor(private http: HttpClient) {}

  postUsuario(usuario: UsuarioRequest): Observable<UsuarioResponse> {
    return this.http.post<UsuarioResponse>(`${this.apiUrl}`, usuario, {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  getUsuarios(activos?: boolean): Observable<UsuarioResponse[]> {
    let params = new HttpParams();
    if (activos !== undefined) {
      params = params.set('activos', activos);
    }
    return this.http.get<UsuarioResponse[]>(`${this.apiUrl}`, { params });
  }

  getUsuarioById(id: number): Observable<UsuarioResponse> {
    return this.http.get<UsuarioResponse>(`${this.apiUrl}/${id}`);
  }

  buscarUsuarios(criterio: string, activos?: boolean): Observable<UsuarioResponse[]> {
    let params = new HttpParams().set('criterio', criterio);
    if (activos !== undefined) {
      params = params.set('activos', activos);
    }
    return this.http.get<UsuarioResponse[]>(`${this.apiUrl}/buscar`, { params });
  }

  putUsuario(id: number, usuario: UsuarioRequest): Observable<UsuarioResponse> {
    return this.http.put<UsuarioResponse>(`${this.apiUrl}/${id}`, usuario);
  }

  cambiarEstado(id: number): Observable<UsuarioResponse> {
    return this.http.patch<UsuarioResponse>(`${this.apiUrl}/${id}`, null);
  }
}
