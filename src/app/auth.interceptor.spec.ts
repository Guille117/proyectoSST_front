import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AuthService } from './Modulos/Auth/data/auth-service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  const authService = {
    isLoggedIn: vi.fn(() => true),
    logout: vi.fn(),
  };

  beforeEach(() => {
    authService.isLoggedIn.mockReturnValue(true);
    authService.logout.mockClear();
    localStorage.setItem('auth_token', 'token');

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authService },
      ],
    });
  });

  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  it('cierra la sesión cuando el backend responde FUERA_DE_HORARIO', () => {
    TestBed.inject(HttpClient).get('/api/v1/pacientes').subscribe({ error: () => {} });

    const request = TestBed.inject(HttpTestingController).expectOne('/api/v1/pacientes');
    request.flush(
      { codigo: 'FUERA_DE_HORARIO', message: 'Acceso denegado' },
      { status: 403, statusText: 'Forbidden' },
    );

    expect(authService.logout).toHaveBeenCalled();
  });

  it('no cierra la sesión ante un 403 de permisos', () => {
    TestBed.inject(HttpClient).get('/api/v1/pacientes').subscribe({ error: () => {} });

    const request = TestBed.inject(HttpTestingController).expectOne('/api/v1/pacientes');
    request.flush(
      { message: 'No tiene permiso para realizar esta acción' },
      { status: 403, statusText: 'Forbidden' },
    );

    expect(authService.logout).not.toHaveBeenCalled();
  });
});
