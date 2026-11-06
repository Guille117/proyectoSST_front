import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './Modulos/Auth/data/auth-service';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const authService = inject(AuthService);
  const token = localStorage.getItem('auth_token');

  if (!token || token === 'null' || token === 'undefined' || !token.trim()) {
    return next(request);
  }

  const authenticatedRequest = request.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });

  return next(authenticatedRequest).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && authService.isLoggedIn()) {
        authService.logout();
      }
      if (error.status === 403 && error.error?.codigo === 'FUERA_DE_HORARIO' && authService.isLoggedIn()) {
        authService.logout();
      }
      return throwError(() => error);
    }),
  );
};
