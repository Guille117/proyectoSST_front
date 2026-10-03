import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { PacienteMultipartRequest, PacienteRequest, PacienteResumido } from './pacienteInterfaz';

@Injectable({
  providedIn: 'root',
})
export class PacienteService {
  private apiUrl = `${environment.apiUrl}/pacientes`;

  constructor(private http: HttpClient) {}

  postPaciente(paciente: PacienteMultipartRequest): Observable<PacienteRequest> {
    const formData = new FormData();
    formData.append(
      'request',
      new Blob([JSON.stringify(paciente.request)], { type: 'application/json' }),
    );

    if (paciente.archivoReferencia) {
      formData.append('archivoReferencia', paciente.archivoReferencia);
    }

    return this.http.post<PacienteRequest>(`${this.apiUrl}`, formData);
  }

  listarPacientes(): Observable<PacienteResumido[]> {
    return this.http.get<PacienteResumido[]>(`${this.apiUrl}`);
  }
}
