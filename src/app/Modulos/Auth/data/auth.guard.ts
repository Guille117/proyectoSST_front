import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth-service';
import { PermisosService } from './permisos-service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    return true;
  }

  return router.createUrlTree(['/login']);
};

export const loginGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const permisos = inject(PermisosService);
  const router = inject(Router);

  if (authService.isLoggedIn()) {
    const inicio = permisos.rutaInicio();
    if (inicio !== '/login') {
      return router.createUrlTree([inicio]);
    }
  }

  return true;
};
