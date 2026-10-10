import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import { CompraMultipartRequest } from './interfaz-compra';

@Injectable({
  providedIn: 'root',
})
export class ServicioCompra {
  // Definición de la URL base para las solicitudes HTTP relacionadas con compras
  private readonly apiUrl = `${environment.apiUrl}/compras`;

  // inyectamos la dependencia HttpClient para realizar solicitudes HTTP
  constructor(private readonly http: HttpClient) {}

  registrarCompra(compra: CompraMultipartRequest): Observable<void> {
    const formData = new FormData();
    formData.append(
      'request',
      new Blob([JSON.stringify(compra.request)], { type: 'application/json' }),
    );

    if (compra.comprobante) {
      formData.append('comprobante', compra.comprobante);
    }

    // No se define Content-Type a mano: el navegador agrega multipart/form-data con su boundary
    return this.http.post<void>(this.apiUrl, formData);
  }
}
