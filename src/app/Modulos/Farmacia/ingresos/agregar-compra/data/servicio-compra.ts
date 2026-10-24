import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, timeout } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import {
  CompraMultipartRequest,
  detalleCompraResponse,
  resumenCompraFiltros,
  resumenCompraResponse,
} from './interfaz-compra';

const TIEMPO_ESPERA_MS = 5000;

@Injectable({
  providedIn: 'root',
})
export class ServicioCompra {
  // Definición de la URL base para las solicitudes HTTP relacionadas con compras
  private readonly apiUrl = `${environment.apiUrl}/compras`;

  // inyectamos la dependencia HttpClient para realizar solicitudes HTTP
  constructor(private readonly http: HttpClient) {}

  registrarCompra(compra: CompraMultipartRequest): Observable<void> {
    // No se define Content-Type a mano: el navegador agrega multipart/form-data con su boundary
    return this.http.post<void>(this.apiUrl, this.crearFormData(compra));
  }

  actualizarCompra(id: number, compra: CompraMultipartRequest): Observable<void> {
    return this.http
      .put<void>(`${this.apiUrl}/${id}`, this.crearFormData(compra))
      .pipe(timeout(TIEMPO_ESPERA_MS));
  }

  eliminarCompra(id: number): Observable<void> {
    return this.http
      .delete<void>(`${this.apiUrl}/${id}`)
      .pipe(timeout(TIEMPO_ESPERA_MS));
  }

  listarComprasResumen(activos?: boolean): Observable<resumenCompraResponse[]> {
    const params =
      activos === undefined ? undefined : new HttpParams().set('activos', activos);

    return this.http
      .get<resumenCompraResponse[]>(`${this.apiUrl}/resumen`, { params })
      .pipe(timeout(TIEMPO_ESPERA_MS));
  }

  buscarComprasResumen(
    filtros: resumenCompraFiltros = {},
  ): Observable<resumenCompraResponse[]> {
    let params = new HttpParams();
    if (filtros.codigo !== undefined) params = params.set('codigo', filtros.codigo);
    if (filtros.proveedorId !== undefined)
      params = params.set('proveedorId', filtros.proveedorId);
    if (filtros.fecha !== undefined) params = params.set('fecha', filtros.fecha);
    if (filtros.activos !== undefined) params = params.set('activos', filtros.activos);

    return this.http
      .get<resumenCompraResponse[]>(`${this.apiUrl}/resumen/buscar`, { params })
      .pipe(timeout(TIEMPO_ESPERA_MS));
  }

  listarCompras(): Observable<detalleCompraResponse[]> {
    return this.http.get<detalleCompraResponse[]>(this.apiUrl).pipe(timeout(TIEMPO_ESPERA_MS));
  }

  obtenerComprobante(url: string): Observable<Blob> {
    return this.http
      .get(url, { responseType: 'blob' })
      .pipe(timeout(TIEMPO_ESPERA_MS));
  }

  private crearFormData(compra: CompraMultipartRequest): FormData {
    const formData = new FormData();
    formData.append(
      'request',
      new Blob([JSON.stringify(compra.request)], { type: 'application/json' }),
    );

    if (compra.comprobante) {
      formData.append('comprobante', compra.comprobante);
    }

    return formData;
  }
}
