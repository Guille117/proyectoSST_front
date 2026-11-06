import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, Subscription, catchError, interval, of, switchMap, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  EstadoSesion,
  EstablecerCredencialesRequest,
  LoginRequest,
  LoginResponse,
  SolicitarCambioCredencialesRequest,
} from './authInterfaz';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = `${environment.apiUrl}/auth`;

  private sondeoSub: Subscription | null = null;
  private readonly intervaloMs = 10000;
  private cerrando = false;

  currentUser = signal<LoginResponse | null>(this.obtenerUsuarioGuardado());

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap((res) => {
        this.cerrando = false;
        if (res) {
          const token = res.token || (res as any).accessToken || (res as any).jwt || 'session_active';
          localStorage.setItem('auth_token', token);
          localStorage.setItem('auth_user', JSON.stringify(res));
          this.currentUser.set(res);
          this.iniciarSondeo();
        }
      })
    );
  }

  establecerCredenciales(credentials: EstablecerCredencialesRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/establecer-credenciales`, credentials).pipe(
      tap((res) => this.guardarSesion(res))
    );
  }

  solicitarCambioCredenciales(
    credentials: SolicitarCambioCredencialesRequest,
  ): Observable<string | number | { pin: string | number }> {
    return this.http.post<string | number | { pin: string | number }>(
      `${this.apiUrl}/solicitar-cambio-credenciales`,
      credentials,
    );
  }

  logout(): void {
    if (this.cerrando) return;
    this.cerrando = true;
    this.detenerSondeo();

    // Registra el cierre de sesión en la bitácora (mejor esfuerzo; no bloquea la salida).
    this.http
      .post(`${this.apiUrl}/logout`, {})
      .pipe(catchError(() => of(null)))
      .subscribe();

    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  iniciarSondeo(): void {
    if (this.sondeoSub) {
      return;
    }
    this.sondeoSub = interval(this.intervaloMs)
      .pipe(
        switchMap(() => this.http.get<EstadoSesion>(`${this.apiUrl}/me`).pipe(catchError(() => of(null)))),
      )
      .subscribe();
  }

  detenerSondeo(): void {
    this.sondeoSub?.unsubscribe();
    this.sondeoSub = null;
  }

  isLoggedIn(): boolean {
    const token = localStorage.getItem('auth_token');
    if (!token || token === 'null' || token === 'undefined' || token.trim() === '') {
      return false;
    }
    return this.currentUser() !== null;
  }

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  /** Actualiza la sesión guardada tras un cambio de perfil o de nombre de usuario. */
  actualizarSesion(cambios: Partial<LoginResponse>, token?: string): void {
    const actual = this.currentUser();
    if (!actual) {
      return;
    }

    const actualizado: LoginResponse = { ...actual, ...cambios };
    if (token) {
      localStorage.setItem('auth_token', token);
      actualizado.token = token;
    }

    localStorage.setItem('auth_user', JSON.stringify(actualizado));
    this.currentUser.set(actualizado);
  }

  private obtenerUsuarioGuardado(): LoginResponse | null {
    try {
      const saved = localStorage.getItem('auth_user');
      if (!saved || saved === 'null' || saved === 'undefined') {
        return null;
      }
      return JSON.parse(saved);
    } catch {
      return null;
    }
  }

  private guardarSesion(res: LoginResponse): void {
    if (!res) {
      return;
    }

    this.cerrando = false;
    const token = res.token || (res as any).accessToken || (res as any).jwt || 'session_active';
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(res));
    this.currentUser.set(res);
    this.iniciarSondeo();
  }
}
