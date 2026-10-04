import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../../../../environments/environment';
import { Observable } from 'rxjs';
import { MedicamentoLogFiltros, MedicamentoLogRequest, MedicamentoLogResponse } from './interfaz-medicamento';

@Injectable({
  providedIn: 'root',
})
export class ServicioMedicamento {
  // Definición de la URL base para las solicitudes HTTP relacionadas con medicamentos log
  private apiUrlMed = `${environment.apiUrl}/medicamentoLog`;

  // intectamos la dependencia HttpClient para realizar solicitudes HTTP
  constructor(private http: HttpClient) {}

  crearMedicamentoLog(medicamento: MedicamentoLogRequest): Observable<any> {
    return this.http.post<any>(`${this.apiUrlMed}`, medicamento);
  }

  traerMedicamentoLog(activo: boolean): Observable<MedicamentoLogResponse[]> {
    return this.http.get<MedicamentoLogResponse[]>(`${this.apiUrlMed}`, {
      params: { activo },
    });
  }

  buscarMedicamentoLog(filtros: MedicamentoLogFiltros = {}): Observable<MedicamentoLogResponse[]> {
    let params = new HttpParams();
    for (const clave of ['nombre', 'marcaId', 'presentacionId', 'viaAdminId', 'activo'] as const) {
      const valor = filtros[clave];
      if (valor !== undefined) {
        params = params.set(clave, valor);
      }
    }
    return this.http.get<MedicamentoLogResponse[]>(`${this.apiUrlMed}/buscar`, { params });
  }

  actualizarMedicamentoLog(id: number, medicamento: MedicamentoLogRequest): Observable<any> {
    return this.http.put<any>(`${this.apiUrlMed}/${id}`, medicamento);
  }

  buscarMedLogActualizar(id: number, activo: boolean = true): Observable<MedicamentoLogRequest> {
    return this.http.get<MedicamentoLogRequest>(`${this.apiUrlMed}/buscar/${id}`, {
      params: { activo },
    });
  }

  cambiarEstadoMedicamento(id: number): Observable<any> {
    return this.http.patch<any>(`${this.apiUrlMed}/${id}`, null);
  }
}
