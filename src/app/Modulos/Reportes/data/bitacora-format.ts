import { BitacoraEntry } from './reportes-interfaz';

/** Texto legible de una acción de bitácora. */
export function accionLegible(accion: string): string {
  switch (accion) {
    case 'CREAR':
      return 'Creó';
    case 'EDITAR':
      return 'Editó';
    case 'ELIMINAR':
      return 'Eliminó';
    case 'LOGIN':
      return 'Inicio de sesión';
    case 'LOGOUT':
      return 'Cierre de sesión';
    default:
      return accion;
  }
}

/** Clase CSS de la insignia según la acción. */
export function claseAccion(accion: string): string {
  switch (accion) {
    case 'CREAR':
      return 'bitacora-accion bitacora-accion--crear';
    case 'EDITAR':
      return 'bitacora-accion bitacora-accion--editar';
    case 'ELIMINAR':
      return 'bitacora-accion bitacora-accion--eliminar';
    case 'LOGIN':
      return 'bitacora-accion bitacora-accion--login';
    case 'LOGOUT':
      return 'bitacora-accion bitacora-accion--logout';
    default:
      return 'bitacora-accion';
  }
}

/** Descripción legible de lo que se hizo en una entrada. */
export function descripcionBitacora(entrada: BitacoraEntry): string {
  if (entrada.accion === 'LOGIN') return 'Inicio de sesión';
  if (entrada.accion === 'LOGOUT') return 'Cierre de sesión';
  const entidad = entrada.entidad ?? entrada.modulo ?? 'registro';
  return `${accionLegible(entrada.accion)} ${entidad}`;
}

/** Formatea una fecha ISO a dd-mm-aaaa hh:mm. */
export function formatearFechaHora(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  const dos = (v: number) => `${v}`.padStart(2, '0');
  return `${dos(fecha.getDate())}-${dos(fecha.getMonth() + 1)}-${fecha.getFullYear()} ${dos(
    fecha.getHours(),
  )}:${dos(fecha.getMinutes())}`;
}
