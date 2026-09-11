import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { LoginRequest, LoginResponse } from './authInterfaz';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = `${environment.apiUrl}/auth`;

  currentUser = signal<LoginResponse | null>(this.obtenerUsuarioGuardado());

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap((res) => {
        if (res) {
          const token = res.token || (res as any).accessToken || (res as any).jwt || 'session_active';
          localStorage.setItem('auth_token', token);
          localStorage.setItem('auth_user', JSON.stringify(res));
          this.currentUser.set(res);
        }
      })
    );
  }

  logout(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    this.currentUser.set(null);
    this.router.navigate(['/login']);
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
}
