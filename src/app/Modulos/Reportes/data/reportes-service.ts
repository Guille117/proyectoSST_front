import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, timeout } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  BitacoraEntry,
  Censo,
  CompraProveedor,
  Conteo,
  GlucosaPromedio,
  MonitoreoSummary,
  StockBajo,
} from './reportes-interfaz';

const TIEMPO_ESPERA_MS = 5000;

@Injectable({ providedIn: 'root' })
export class ReportesService {
  private readonly base = `${environment.apiUrl}/reportes`;
  private readonly baseBitacora = `${environment.apiUrl}/bitacora`;

  constructor(private readonly http: HttpClient) {}

  private params(desde?: string, hasta?: string): HttpParams {
    let p = new HttpParams();
    if (desde) p = p.set('desde', desde);
    if (hasta) p = p.set('hasta', hasta);
    return p;
  }

  // --- Farmacia ---
  despachos(desde?: string, hasta?: string): Observable<Conteo[]> {
    return this.http
      .get<Conteo[]>(`${this.base}/farmacia/despachos`, { params: this.params(desde, hasta) })
      .pipe(timeout(TIEMPO_ESPERA_MS));
  }

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

  // --- Pacientes ---
  censo(): Observable<Censo[]> {
    return this.http.get<Censo[]>(`${this.base}/pacientes/censo`).pipe(timeout(TIEMPO_ESPERA_MS));
  }

  ingresosPorArea(desde?: string, hasta?: string): Observable<Conteo[]> {
    return this.http
      .get<Conteo[]>(`${this.base}/pacientes/ingresos-por-area`, { params: this.params(desde, hasta) })
      .pipe(timeout(TIEMPO_ESPERA_MS));
  }

  demografia(): Observable<Conteo[]> {
    return this.http.get<Conteo[]>(`${this.base}/pacientes/demografia`).pipe(timeout(TIEMPO_ESPERA_MS));
  }

  // --- Médica ---
  diagnosticosFrecuentes(desde?: string, hasta?: string): Observable<Conteo[]> {
    return this.http
      .get<Conteo[]>(`${this.base}/medica/diagnosticos-frecuentes`, { params: this.params(desde, hasta) })
      .pipe(timeout(TIEMPO_ESPERA_MS));
  }

  altasPorTipo(desde?: string, hasta?: string): Observable<Conteo[]> {
    return this.http
      .get<Conteo[]>(`${this.base}/medica/altas-por-tipo`, { params: this.params(desde, hasta) })
      .pipe(timeout(TIEMPO_ESPERA_MS));
  }

  atencionesPorMedico(desde?: string, hasta?: string): Observable<Conteo[]> {
    return this.http
      .get<Conteo[]>(`${this.base}/medica/atenciones-por-medico`, { params: this.params(desde, hasta) })
      .pipe(timeout(TIEMPO_ESPERA_MS));
  }

  // --- Enfermería ---
  monitoreo(desde?: string, hasta?: string): Observable<MonitoreoSummary> {
    return this.http
      .get<MonitoreoSummary>(`${this.base}/enfermeria/monitoreo`, { params: this.params(desde, hasta) })
      .pipe(timeout(TIEMPO_ESPERA_MS));
  }

  tratamientosMedicamentos(desde?: string, hasta?: string): Observable<Conteo[]> {
    return this.http
      .get<Conteo[]>(`${this.base}/enfermeria/tratamientos-medicamentos`, {
        params: this.params(desde, hasta),
      })
      .pipe(timeout(TIEMPO_ESPERA_MS));
  }

  tratamientosCuidados(desde?: string, hasta?: string): Observable<Conteo[]> {
    return this.http
      .get<Conteo[]>(`${this.base}/enfermeria/tratamientos-cuidados`, {
        params: this.params(desde, hasta),
      })
      .pipe(timeout(TIEMPO_ESPERA_MS));
  }

  glucosaPromedio(desde?: string, hasta?: string): Observable<GlucosaPromedio[]> {
    return this.http
      .get<GlucosaPromedio[]>(`${this.base}/enfermeria/glucosa-promedio`, {
        params: this.params(desde, hasta),
      })
      .pipe(timeout(TIEMPO_ESPERA_MS));
  }

  // --- Usuarios ---
  usuariosPorRol(): Observable<Conteo[]> {
    return this.http.get<Conteo[]>(`${this.base}/usuarios/por-rol`).pipe(timeout(TIEMPO_ESPERA_MS));
  }

  accesos(desde?: string, hasta?: string): Observable<Conteo[]> {
    return this.http
      .get<Conteo[]>(`${this.base}/usuarios/accesos`, { params: this.params(desde, hasta) })
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
