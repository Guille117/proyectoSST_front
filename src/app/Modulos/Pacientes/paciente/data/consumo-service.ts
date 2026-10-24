import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, timeout } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { ConsumoEpisodio } from './consumoInterfaz';

const TIEMPO_ESPERA_MS = 5000;

@Injectable({
  providedIn: 'root',
})
export class ConsumoEpisodioService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/episodios`;

  obtenerConsumo(episodioId: number): Observable<ConsumoEpisodio> {
    return this.http
      .get<ConsumoEpisodio>(`${this.apiUrl}/${episodioId}/consumo`)
      .pipe(timeout(TIEMPO_ESPERA_MS));
  }
}
