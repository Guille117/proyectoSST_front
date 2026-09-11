import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { PuestoResponse } from './usuarioInterfaz';

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
    return this.http.get<PuestoResponse[]>(`${this.apiUrl}/activos`);
  }
}
