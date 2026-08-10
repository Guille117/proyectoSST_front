import { Injectable } from '@angular/core';
import { environment } from '../../../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { proveedorRequest, proveedorResponse } from './proveedorInterfaz';
import { Observable } from 'rxjs';


@Injectable({
  providedIn: 'root',
})
export class ProveedorService {
  // Definición de la URL base para las solicitudes HTTP relacionadas con proveedores
  private apiUrl = `${environment.apiUrl}/proveedores`;

  // intectamos la dependencia HttpClient para realizar solicitudes HTTP
  constructor(private http: HttpClient) {}

  postProveedor(proveedor: proveedorRequest): Observable<proveedorResponse> {
    return this.http.post<proveedorResponse>(
      `${this.apiUrl}`, proveedor, {
        headers: {'Content-Type': 'application/json'}
      }
    );
  }

  getProveedores(): Observable<proveedorResponse[]> {
    return this.http.get<proveedorResponse[]>(`${this.apiUrl}`);
  }
  
  getProveedorById(id: number): Observable<proveedorResponse> {
    return this.http.get<proveedorResponse>(`${this.apiUrl}/${id}`);
  }
}
