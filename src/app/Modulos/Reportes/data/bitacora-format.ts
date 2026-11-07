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
  const id = entrada.entidadId ? ` #${entrada.entidadId}` : '';
  return `${accionLegible(entrada.accion)} ${entidad}${id}`;
}

/** Resumen legible del cuerpo específico guardado en la bitácora. */
export function resumenDetalle(entrada: BitacoraEntry): string {
  if (!entrada.detalle || entrada.accion === 'LOGIN' || entrada.accion === 'LOGOUT') {
    return '—';
  }

  const texto = entrada.detalle.trim();
  if (!texto) return '—';

  try {
    const datos = JSON.parse(texto) as unknown;
    if (Array.isArray(datos)) {
      return `${datos.length} elemento(s)`;
    }
    if (datos && typeof datos === 'object') {
      const sensibles = /(password|passwd|pin|token|secret|clave)/i;
      const partes = Object.entries(datos as Record<string, unknown>)
        .filter(([clave]) => !sensibles.test(clave))
        .map(([clave, valor]) => `${clave}: ${valorLegible(valor)}`)
        .slice(0, 6);
      return recortar(partes.length ? partes.join(' · ') : '—');
    }
    return recortar(String(datos));
  } catch {
    return recortar(texto);
  }
}

function valorLegible(valor: unknown): string {
  if (valor === null || valor === undefined) return '—';
  if (Array.isArray(valor)) return `${valor.length} elemento(s)`;
  if (typeof valor === 'object') return '{…}';
  return String(valor);
}

function recortar(texto: string, maximo = 140): string {
  return texto.length > maximo ? `${texto.slice(0, maximo - 1)}…` : texto;
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
