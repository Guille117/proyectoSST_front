import { Injectable } from '@angular/core';
import { environment } from '../../../../../environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';
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

  getProveedores(activos:boolean): Observable<proveedorResponse[]> {
    const params = new HttpParams().set('activos',activos);
    return this.http.get<proveedorResponse[]>(`${this.apiUrl}`, { params: params });
  }
  
  getProveedorById(id: number): Observable<proveedorResponse> {
    return this.http.get<proveedorResponse>(`${this.apiUrl}/${id}`);
  }

  getProveedorByNombre(nombre: string, activos:boolean): Observable<proveedorResponse[]> {
    const params = new HttpParams().set('nombre', nombre).set('activos', activos);
    return this.http.get<proveedorResponse[]>(`${this.apiUrl}/buscar`, { params: params });
  }

  putProveedor(id: number, proveedor: proveedorRequest): Observable<proveedorResponse> {
    return this.http.put<proveedorResponse>(`${this.apiUrl}/${id}`, proveedor);
  }

  cambiarEstado(id: number): Observable<proveedorResponse> {
    return this.http.patch<proveedorResponse>(`${this.apiUrl}/${id}`, null);
  }
}
