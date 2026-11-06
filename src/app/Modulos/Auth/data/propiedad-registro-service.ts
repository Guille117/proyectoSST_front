import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth-service';

const ROLES_ACCESO_GLOBAL = ['Administrador'];

/** Decide si el usuario actual puede editar o eliminar un registro clínico. */
@Injectable({ providedIn: 'root' })
export class PropiedadRegistroService {
  private readonly auth = inject(AuthService);

  esAccesoGlobal(): boolean {
    const roles = this.auth.currentUser()?.roles ?? [];
    return roles.some((rol) => ROLES_ACCESO_GLOBAL.includes(rol));
  }

  puedeGestionar(usuarioId: number | null | undefined): boolean {
    if (this.esAccesoGlobal()) return true;
    const actual = this.auth.currentUser()?.id;
    return usuarioId != null && actual != null && usuarioId === actual;
  }
}
