import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, timeout } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  BitacoraEntry,
  Censo,
  ClaveConteo,
  CompraProveedor,
  Conteo,
  GlucosaPromedio,
  MonitoreoSummary,
  StockBajo,
  Vencimiento,
} from './reportes-interfaz';

const TIEMPO_ESPERA_MS = 5000;

@Injectable({ providedIn: 'root' })
export class ReportesService {
  private readonly base = `${environment.apiUrl}/reportes`;
  private readonly baseBitacora = `${environment.apiUrl}/bitacora`;

  /** URL de cada reporte de tipo Conteo (nombre/cantidad). */
  private readonly urlsConteo: Record<ClaveConteo, string> = {
    masVendidos: `${this.base}/farmacia/mas-vendidos`,
    menosVendidos: `${this.base}/farmacia/menos-vendidos`,
    ingresos: `${this.base}/pacientes/ingresos-por-area`,
    demografia: `${this.base}/pacientes/demografia`,
    diagnosticos: `${this.base}/medica/diagnosticos-frecuentes`,
    altas: `${this.base}/medica/altas-por-tipo`,
    atenciones: `${this.base}/medica/atenciones-por-medico`,
    medicamentos: `${this.base}/enfermeria/tratamientos-medicamentos`,
    cuidados: `${this.base}/enfermeria/tratamientos-cuidados`,
    porRol: `${this.base}/usuarios/por-rol`,
    accesos: `${this.base}/usuarios/accesos`,
  };

  constructor(private readonly http: HttpClient) {}

  private params(desde?: string, hasta?: string): HttpParams {
    let p = new HttpParams();
    if (desde) p = p.set('desde', desde);
    if (hasta) p = p.set('hasta', hasta);
    return p;
  }

  // --- Reporte genérico de conteo (nombre/cantidad) ---
  conteo(clave: ClaveConteo, desde?: string, hasta?: string): Observable<Conteo[]> {
    return this.http
      .get<Conteo[]>(this.urlsConteo[clave], { params: this.params(desde, hasta) })
      .pipe(timeout(TIEMPO_ESPERA_MS));
  }

  // --- Farmacia ---
  comprasPorProveedor(desde?: string, hasta?: string): Observable<CompraProveedor[]> {
    return this.http
      .get<CompraProveedor[]>(`${this.base}/farmacia/compras-por-proveedor`, {
        params: this.params(desde, hasta),
      })
      .pipe(timeout(TIEMPO_ESPERA_MS));
  }

  stockBajo(umbral = 5): Observable<StockBajo[]> {
    const params = new HttpParams().set('umbral', String(umbral));
    return this.http
      .get<StockBajo[]>(`${this.base}/farmacia/stock-bajo`, { params })
      .pipe(timeout(TIEMPO_ESPERA_MS));
  }

  vencimientos(): Observable<Vencimiento[]> {
    return this.http
      .get<Vencimiento[]>(`${this.base}/farmacia/vencimientos`)
      .pipe(timeout(TIEMPO_ESPERA_MS));
  }

  // --- Pacientes ---
  censo(): Observable<Censo[]> {
    return this.http.get<Censo[]>(`${this.base}/pacientes/censo`).pipe(timeout(TIEMPO_ESPERA_MS));
  }

  // --- Enfermería ---
  monitoreo(desde?: string, hasta?: string): Observable<MonitoreoSummary> {
    return this.http
      .get<MonitoreoSummary>(`${this.base}/enfermeria/monitoreo`, { params: this.params(desde, hasta) })
      .pipe(timeout(TIEMPO_ESPERA_MS));
  }

  glucosaPromedio(desde?: string, hasta?: string): Observable<GlucosaPromedio[]> {
    return this.http
      .get<GlucosaPromedio[]>(`${this.base}/enfermeria/glucosa-promedio`, {
        params: this.params(desde, hasta),
      })
      .pipe(timeout(TIEMPO_ESPERA_MS));
  }

  // --- Bitácora ---
  bitacoraGeneral(desde?: string, hasta?: string): Observable<BitacoraEntry[]> {
    return this.http
      .get<BitacoraEntry[]>(`${this.baseBitacora}/general`, { params: this.params(desde, hasta) })
      .pipe(timeout(TIEMPO_ESPERA_MS));
  }

  bitacoraPaciente(pacienteId: number, desde?: string, hasta?: string): Observable<BitacoraEntry[]> {
    return this.http
      .get<BitacoraEntry[]>(`${this.baseBitacora}/pacientes/${pacienteId}`, {
        params: this.params(desde, hasta),
      })
      .pipe(timeout(TIEMPO_ESPERA_MS));
  }
}
