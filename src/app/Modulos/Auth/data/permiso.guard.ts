import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { CATALOGOS, PermisosService } from './permisos-service';

export const moduloGuard: CanActivateFn = (route) => {
  const permisos = inject(PermisosService);
  const router = inject(Router);
  const modulos = modulosRequeridos(route.data);

  if (modulos.length === 0 || modulos.some((modulo) => permisos.puedeLeerModulo(modulo))) {
    return true;
  }
  return router.createUrlTree([permisos.rutaInicio()]);
};

export const catalogoModuloGuard: CanActivateFn = () => {
  const permisos = inject(PermisosService);
  const router = inject(Router);
  return permisos.tieneAlgunCatalogo() ? true : router.createUrlTree([permisos.rutaInicio()]);
};

export const submoduloGuard: CanActivateFn = (route) => {
  const permisos = inject(PermisosService);
  const router = inject(Router);
  const submodulo = route.data?.['submodulo'] as string | undefined;

  if (!submodulo || permisos.puedeLeerSubmodulo(submodulo)) {
    return true;
  }

  const redireccion = route.data?.['redireccion'] as string | undefined;
  return router.createUrlTree([redireccion ?? permisos.rutaInicio()]);
};

export const catalogoInicioGuard: CanActivateFn = () => {
  const permisos = inject(PermisosService);
  const router = inject(Router);
  const catalogo = CATALOGOS.find((item) => permisos.puedeLeerSubmodulo(item.submodulo));

  if (catalogo) {
    return router.createUrlTree(['/catalogos', catalogo.ruta]);
  }
  return router.createUrlTree([permisos.rutaInicio()]);
};

function modulosRequeridos(data: Record<string, unknown> | undefined): string[] {
  if (!data) return [];
  const modulos = data['modulos'];
  if (Array.isArray(modulos)) {
    return modulos.filter((modulo): modulo is string => typeof modulo === 'string');
  }
  const modulo = data['modulo'];
  return typeof modulo === 'string' ? [modulo] : [];
}
