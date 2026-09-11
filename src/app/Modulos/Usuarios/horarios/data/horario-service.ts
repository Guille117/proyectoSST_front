import { Injectable } from '@angular/core';
import { environment } from '../../../../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { horarioRequest, HorarioResponse } from './horarioInterfaz';

@Injectable({
  providedIn: 'root',
})
export class HorarioService {
  // Definición de la URL base para las solicitudes HTTP relacionadas con proveedores
  private apiUrl = `${environment.apiUrl}/horarios`;

  // intectamos la dependencia HttpClient para realizar solicitudes HTTP
  constructor(private http: HttpClient) {}

  postHorario(horario: horarioRequest): Observable<HorarioResponse> {
    return this.http.post<HorarioResponse>(
      `${this.apiUrl}`, horario, {
        headers: {'Content-Type': 'application/json'}
      }
    );
  }

  getHorarios(activos: boolean): Observable<HorarioResponse[]> {
    const params = new HttpParams().set('activos', activos);
    return this.http.get<HorarioResponse[]>(`${this.apiUrl}`, { params });
  }

  putHorario(id: number, horario: horarioRequest): Observable<HorarioResponse> {
    return this.http.put<HorarioResponse>(`${this.apiUrl}/${id}`, horario);
  }

  cambiarEstado(id: number): Observable<HorarioResponse> {
    return this.http.patch<HorarioResponse>(`${this.apiUrl}/${id}`, null);
  }
}
