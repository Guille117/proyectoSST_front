import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, timeout } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { DocumentoEpisodio, TipoDocumentoEpisodio } from './documentoInterfaz';

const TIEMPO_ESPERA_MS = 5000;
const TIEMPO_SUBIDA_MS = 30000;

@Injectable({
  providedIn: 'root',
})
export class DocumentoEpisodioService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;

  listarDocumentos(episodioId: number): Observable<DocumentoEpisodio[]> {
    return this.http
      .get<DocumentoEpisodio[]>(`${this.apiUrl}/episodios/${episodioId}/documentos`)
      .pipe(timeout(TIEMPO_ESPERA_MS));
  }

  subirDocumento(
    episodioId: number,
    tipo: TipoDocumentoEpisodio,
    usuarioId: number,
    archivo: File,
  ): Observable<DocumentoEpisodio[]> {
    const datos = new FormData();
    datos.append('tipo', tipo);
    datos.append('usuarioId', String(usuarioId));
    datos.append('archivos', archivo);

    return this.http
      .post<DocumentoEpisodio[]>(`${this.apiUrl}/episodios/${episodioId}/documentos`, datos)
      .pipe(timeout(TIEMPO_SUBIDA_MS));
  }

  eliminarDocumento(id: number): Observable<void> {
    return this.http
      .delete<void>(`${this.apiUrl}/documentos/${id}`)
      .pipe(timeout(TIEMPO_ESPERA_MS));
  }

  obtenerArchivo(id: number): Observable<Blob> {
    return this.http
      .get(`${this.apiUrl}/documentos/${id}/archivo`, { responseType: 'blob' })
      .pipe(timeout(TIEMPO_ESPERA_MS));
  }
}
