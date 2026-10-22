import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, timeout } from 'rxjs';
import { environment } from '../../../../../../environments/environment';
import {
  ExamenRequest,
  ExamenResponse,
  EstadoExamenApi,
} from './examenInterfaz';

const TIEMPO_ESPERA_MS = 5000;
const TIEMPO_SUBIDA_MS = 30000;

/**
 * Exámenes indicados en un episodio: consulta, registro, actualización, cambio de estado y
 * administración de los archivos o imágenes adjuntos.
 */
@Injectable({
  providedIn: 'root',
})
export class IndicacionExamenService {
  private readonly apiUrl = `${environment.apiUrl}/examenes`;

  constructor(private readonly http: HttpClient) {}

  buscarPorEpisodio(
    episodioId: number,
    estado: EstadoExamenApi,
  ): Observable<ExamenResponse[]> {
    const params = new HttpParams().set('episodioId', episodioId).set('estado', estado);
    return this.http
      .get<ExamenResponse[]>(`${this.apiUrl}/buscar`, { params })
      .pipe(timeout(TIEMPO_ESPERA_MS));
  }

  crearExamen(request: ExamenRequest, archivos: File[]): Observable<ExamenResponse> {
    return this.http
      .post<ExamenResponse>(this.apiUrl, this.crearFormData(request, archivos))
      .pipe(timeout(TIEMPO_SUBIDA_MS));
  }

  actualizarExamen(
    id: number,
    request: ExamenRequest,
    archivos: File[],
  ): Observable<ExamenResponse> {
    return this.http
      .put<ExamenResponse>(`${this.apiUrl}/${id}`, this.crearFormData(request, archivos))
      .pipe(timeout(TIEMPO_SUBIDA_MS));
  }

  agregarArchivos(id: number, archivos: File[]): Observable<ExamenResponse> {
    const datos = new FormData();
    for (const archivo of archivos) {
      datos.append('archivos', archivo);
    }

    return this.http
      .post<ExamenResponse>(`${this.apiUrl}/${id}/archivos`, datos)
      .pipe(timeout(TIEMPO_SUBIDA_MS));
  }

  cambiarEstado(id: number, estado: EstadoExamenApi): Observable<ExamenResponse> {
    const params = new HttpParams().set('estado', estado);
    return this.http
      .patch<ExamenResponse>(`${this.apiUrl}/${id}/estado`, null, { params })
      .pipe(timeout(TIEMPO_ESPERA_MS));
  }

  eliminarArchivo(examenId: number, archivoId: number): Observable<void> {
    return this.http
      .delete<void>(`${this.apiUrl}/${examenId}/archivos/${archivoId}`)
      .pipe(timeout(TIEMPO_ESPERA_MS));
  }

  obtenerArchivo(examenId: number, archivoId: number): Observable<Blob> {
    return this.http
      .get(`${this.apiUrl}/${examenId}/archivos/${archivoId}`, { responseType: 'blob' })
      .pipe(timeout(TIEMPO_ESPERA_MS));
  }

  private crearFormData(request: ExamenRequest, archivos: File[]): FormData {
    const datos = new FormData();
    datos.append('request', new Blob([JSON.stringify(request)], { type: 'application/json' }));

    for (const archivo of archivos) {
      datos.append('archivos', archivo);
    }

    return datos;
  }
}
