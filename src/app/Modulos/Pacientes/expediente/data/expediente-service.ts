import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, timeout } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { EpisodioResumen } from './expedienteInterfaz';

const TIEMPO_ESPERA_MS = 5000;

@Injectable({
  providedIn: 'root',
})
export class ExpedienteService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/pacientes`;

  listarEpisodios(pacienteId: number): Observable<EpisodioResumen[]> {
    return this.http
      .get<EpisodioResumen[]>(`${this.apiUrl}/${pacienteId}/episodios`)
      .pipe(timeout(TIEMPO_ESPERA_MS));
  }
}
