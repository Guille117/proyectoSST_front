import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { Insumo, InsumoRequest, InsumoResponse } from './interfazInsumo';

@Injectable({
  providedIn: 'root',
})
export class ServicioInsumos {
  private readonly apiUrl = `${environment.apiUrl}/insumosLog`;

  constructor(private readonly http: HttpClient) {}

  crearInsumo(insumo: InsumoRequest): Observable<InsumoResponse> {
    return this.http.post<InsumoResponse>(this.apiUrl, insumo);
  }

  listarInsumos(activo = true): Observable<Insumo[]> {
    return this.http.get<Insumo[]>(this.apiUrl, {
      params: { activo },
    });
  }

  buscarInsumos(
    filtros: { nombre?: string; marcaId?: number; activo?: boolean } = {},
  ): Observable<Insumo[]> {
    let params = new HttpParams();
    if (filtros.nombre !== undefined) params = params.set('nombre', filtros.nombre);
    if (filtros.marcaId !== undefined) params = params.set('marcaId', filtros.marcaId);
    if (filtros.activo !== undefined) params = params.set('activo', filtros.activo);

    return this.http.get<Insumo[]>(`${this.apiUrl}/buscar`, { params });
  }

  obtenerInsumoPorId(id: number): Observable<InsumoResponse> {
    return this.http.get<InsumoResponse>(`${this.apiUrl}/${id}`);
  }

  actualizarInsumo(id: number, insumo: InsumoRequest): Observable<InsumoResponse> {
    return this.http.put<InsumoResponse>(`${this.apiUrl}/${id}`, insumo);
  }

  cambiarEstadoInsumo(id: number): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}`, null);
  }
}
