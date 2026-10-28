import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth-service';
import { PermisoAuth } from './authInterfaz';

export type AccionPermiso = 'LEER' | 'CREAR' | 'EDITAR' | 'ELIMINAR';

export const MODULOS = {
  FARMACIA: 'FARMACIA',
  USUARIOS: 'USUARIOS',
  PACIENTES: 'PACIENTES',
  MEDICA: 'MEDICA',
  ENFERMERIA: 'ENFERMERIA',
  CATALOGOS: 'CATALOGOS',
  REPORTES: 'REPORTES',
} as const;

export const CATALOGOS = [
  { submodulo: 'CATALOGOS-FARMACIA', ruta: 'farmaciaCatalogo' },
  { submodulo: 'CATALOGOS-PACIENTES', ruta: 'pacienteCatalogo' },
  { submodulo: 'CATALOGOS-USUARIOS', ruta: 'usuariosCatalogo' },
  { submodulo: 'CATALOGOS-CLINICA', ruta: 'gestionClinicaCatalogo' },
] as const;

@Injectable({ providedIn: 'root' })
export class PermisosService {
  private readonly auth = inject(AuthService);

  puedeLeerModulo(codigo: string): boolean {
    return this.puedeModulo(codigo, 'LEER');
  }

  puedeCrearModulo(codigo: string): boolean {
    return this.puedeModulo(codigo, 'CREAR');
  }

  puedeEditarModulo(codigo: string): boolean {
    return this.puedeModulo(codigo, 'EDITAR');
  }

  puedeEliminarModulo(codigo: string): boolean {
    return this.puedeModulo(codigo, 'ELIMINAR');
  }

  puedeLeerSubmodulo(codigo: string): boolean {
    return this.puedeSubmodulo(codigo, 'LEER');
  }

  puedeCrearSubmodulo(codigo: string): boolean {
    return this.puedeSubmodulo(codigo, 'CREAR');
  }

  puedeEditarSubmodulo(codigo: string): boolean {
    return this.puedeSubmodulo(codigo, 'EDITAR');
  }

  puedeEliminarSubmodulo(codigo: string): boolean {
    return this.puedeSubmodulo(codigo, 'ELIMINAR');
  }

  puedeModulo(codigo: string, accion: AccionPermiso): boolean {
    return this.permisos().some(
      (permiso) =>
        permiso.moduloCodigo === codigo && this.flag(permiso, accion),
    );
  }

  puedeSubmodulo(codigo: string, accion: AccionPermiso): boolean {
    return this.permisos().some(
      (permiso) =>
        permiso.submoduloCodigo === codigo && this.flag(permiso, accion),
    );
  }

  soloLecturaModulo(codigo: string): boolean {
    return (
      this.puedeLeerModulo(codigo) &&
      !this.puedeCrearModulo(codigo) &&
      !this.puedeEditarModulo(codigo) &&
      !this.puedeEliminarModulo(codigo)
    );
  }

  tieneAlgunCatalogo(): boolean {
    return CATALOGOS.some((catalogo) => this.puedeLeerSubmodulo(catalogo.submodulo));
  }

  rutaInicio(): string {
    if (this.puedeLeerModulo(MODULOS.FARMACIA)) return '/farmacia';
    if (this.puedeLeerModulo(MODULOS.PACIENTES)) return '/pacientes';
    if (this.puedeLeerModulo(MODULOS.MEDICA)) return '/medica';
    if (this.puedeLeerModulo(MODULOS.ENFERMERIA)) return '/enfermeria';
    if (this.tieneAlgunCatalogo()) return '/catalogos';
    if (this.puedeLeerModulo(MODULOS.USUARIOS)) return '/usuarios';
    return '/login';
  }

  private permisos(): PermisoAuth[] {
    return this.auth.currentUser()?.permisos ?? [];
  }

  private flag(permiso: PermisoAuth, accion: AccionPermiso): boolean {
    switch (accion) {
      case 'LEER':
        return permiso.puedeLeer;
      case 'CREAR':
        return permiso.puedeCrear;
      case 'EDITAR':
        return permiso.puedeEditar;
      case 'ELIMINAR':
        return permiso.puedeEliminar;
      default:
        return false;
    }
  }
}
