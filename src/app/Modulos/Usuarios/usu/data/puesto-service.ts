import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, timeout } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { PuestoResponse } from './usuarioInterfaz';

const TIEMPO_ESPERA_MS = 5000;

@Injectable({
  providedIn: 'root',
})
export class PuestoService {
  private apiUrl = `${environment.apiUrl}/puestos`;

  constructor(private http: HttpClient) {}

  getPuestos(): Observable<PuestoResponse[]> {
    return this.http.get<PuestoResponse[]>(`${this.apiUrl}`);
  }

  getPuestosActivos(): Observable<PuestoResponse[]> {
    const params = new HttpParams().set('activos', true);
    return this.http.get<PuestoResponse[]>(this.apiUrl, { params });
  }

  postPuesto(nombre: string): Observable<PuestoResponse> {
    return this.http
      .post<PuestoResponse>(this.apiUrl, { nombre })
      .pipe(timeout(TIEMPO_ESPERA_MS));
  }
}
