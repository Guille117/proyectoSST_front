import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { PacienteRequest } from './pacienteInterfaz';

@Injectable({
  providedIn: 'root',
})
export class PacienteService {
  private apiUrl = `${environment.apiUrl}/pacientes`;

  constructor(private http: HttpClient) {}

  postPaciente(paciente: PacienteRequest): Observable<PacienteRequest> {
    return this.http.post<PacienteRequest>(`${this.apiUrl}`, paciente, {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
