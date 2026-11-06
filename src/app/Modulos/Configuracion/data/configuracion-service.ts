import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, timeout } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { TIMEOUT_HTTP_MS } from '../../Medica/evaluacion/data/constantes-clinicas';
import {
  CambioPasswordRequest,
  CambioUsuarioRequest,
  CambioUsuarioResponse,
  DatosPersonalesRequest,
  PerfilConfiguracion,
} from './configuracionInterfaz';

/** Autoservicio del usuario autenticado: perfil, nombre de usuario y contraseña. */
@Injectable({
  providedIn: 'root',
})
export class ConfiguracionService {
  private readonly apiUrl = `${environment.apiUrl}/configuracion`;

  constructor(private readonly http: HttpClient) {}

  obtenerPerfil(): Observable<PerfilConfiguracion> {
    return this.http
      .get<PerfilConfiguracion>(`${this.apiUrl}/perfil`)
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }

  actualizarPerfil(request: DatosPersonalesRequest): Observable<PerfilConfiguracion> {
    return this.http
      .put<PerfilConfiguracion>(`${this.apiUrl}/perfil`, request)
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }

  cambiarUsuario(request: CambioUsuarioRequest): Observable<CambioUsuarioResponse> {
    return this.http
      .put<CambioUsuarioResponse>(`${this.apiUrl}/usuario`, request)
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }

  cambiarPassword(request: CambioPasswordRequest): Observable<void> {
    return this.http
      .put<void>(`${this.apiUrl}/password`, request)
      .pipe(timeout(TIMEOUT_HTTP_MS));
  }
}
