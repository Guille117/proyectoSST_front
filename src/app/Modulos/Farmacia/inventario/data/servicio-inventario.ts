import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, timeout } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  BajaListadoResponse,
  BajaLoteRequest,
  BajaLoteResponse,
  InventarioFiltros,
  InventarioResponse,
  TipoInventario,
} from './interfaz-inventario';

const TIEMPO_ESPERA_MS = 5000;

@Injectable({
  providedIn: 'root',
})
export class ServicioInventario {
  private readonly apiUrl = `${environment.apiUrl}/lotes/inventario`;
  private readonly apiBajas = `${environment.apiUrl}/bajas`;

  constructor(private readonly http: HttpClient) {}

  listarInventario(filtros: InventarioFiltros = {}): Observable<InventarioResponse[]> {
    let params = new HttpParams();

    if (filtros.tipo !== undefined) params = params.set('tipo', filtros.tipo);
    if (filtros.nombre !== undefined) params = params.set('nombre', filtros.nombre);
    if (filtros.proveedorId !== undefined)
      params = params.set('proveedorId', filtros.proveedorId);
    if (filtros.viaAdminId !== undefined)
      params = params.set('viaAdminId', filtros.viaAdminId);
    if (filtros.estadoInventario !== undefined)
      params = params.set('estadoInventario', filtros.estadoInventario);
    if (filtros.activos !== undefined) params = params.set('activos', filtros.activos);
    if (filtros.diasPorVencer !== undefined)
      params = params.set('diasPorVencer', filtros.diasPorVencer);

    return this.http
      .get<InventarioResponse[]>(this.apiUrl, { params })
      .pipe(timeout(TIEMPO_ESPERA_MS));
  }

  registrarBaja(baja: BajaLoteRequest): Observable<BajaLoteResponse> {
    return this.http
      .post<BajaLoteResponse>(this.apiBajas, baja)
      .pipe(timeout(TIEMPO_ESPERA_MS));
  }

  listarBajas(tipo: TipoInventario): Observable<BajaListadoResponse[]> {
    const params = new HttpParams().set('tipo', tipo);
    return this.http
      .get<BajaListadoResponse[]>(this.apiBajas, { params })
      .pipe(timeout(TIEMPO_ESPERA_MS));
  }

  revertirBaja(id: number): Observable<void> {
    return this.http
      .delete<void>(`${this.apiBajas}/${id}`)
      .pipe(timeout(TIEMPO_ESPERA_MS));
  }
}
