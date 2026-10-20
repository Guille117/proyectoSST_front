import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, timeout } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import {
  DevolucionSalidaRequest,
  EntregaSalidaRequest,
  EstadoSolicitudSalida,
  SolicitudSalida,
  SolicitudSalidaResumen,
} from './salidasInterfaz';

const TIEMPO_ESPERA_MS = 5000;

/**
 * Solicitudes de salida generadas desde los procedimientos médicos:
 * listado, detalle, despacho y devoluciones.
 */
@Injectable({
  providedIn: 'root',
})
export class SalidasService {
  private readonly apiUrl = `${environment.apiUrl}/solicitudesSalida`;

  constructor(private readonly http: HttpClient) {}

  listar(estado?: EstadoSolicitudSalida, texto?: string): Observable<SolicitudSalidaResumen[]> {
    let params = new HttpParams();
    if (estado) params = params.set('estado', estado);

    const termino = texto?.trim();
    if (termino) params = params.set('texto', termino);

    return this.http
      .get<SolicitudSalidaResumen[]>(this.apiUrl, { params })
      .pipe(timeout(TIEMPO_ESPERA_MS));
  }

  obtener(id: number): Observable<SolicitudSalida> {
    return this.http
      .get<SolicitudSalida>(`${this.apiUrl}/${id}`)
      .pipe(timeout(TIEMPO_ESPERA_MS));
  }

  entregar(id: number, request: EntregaSalidaRequest): Observable<SolicitudSalida> {
    return this.http
      .post<SolicitudSalida>(`${this.apiUrl}/${id}/entregas`, request)
      .pipe(timeout(TIEMPO_ESPERA_MS));
  }

  devolver(id: number, request: DevolucionSalidaRequest): Observable<SolicitudSalida> {
    return this.http
      .post<SolicitudSalida>(`${this.apiUrl}/${id}/devoluciones`, request)
      .pipe(timeout(TIEMPO_ESPERA_MS));
  }
}
