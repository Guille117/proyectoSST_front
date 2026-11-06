/** Sección de Monitoreo a la que pertenece un control indicado. */
export type SeccionMonitoreoControl = 'signos' | 'glucosa' | 'hidrico';

/** Control de monitoreo que puede indicarse como atención. */
export interface ControlMonitoreo {
  nombre: string;
  seccion: SeccionMonitoreoControl;
}

/** Controles que ofrece el formulario de atenciones y su sección de Monitoreo. */
export const CONTROLES_MONITOREO: readonly ControlMonitoreo[] = [
  { nombre: 'Signos vitales', seccion: 'signos' },
  { nombre: 'Control de glucosa', seccion: 'glucosa' },
  { nombre: 'Control hídrico', seccion: 'hidrico' },
];

/** Nombres admitidos en los registros existentes, además de las opciones del formulario. */
const ALIASES_CONTROL: readonly ControlMonitoreo[] = [
  ...CONTROLES_MONITOREO,
  { nombre: 'Control de signos vitales', seccion: 'signos' },
  { nombre: 'Glucosa', seccion: 'glucosa' },
];

/** Normaliza el nombre para comparar sin depender de mayúsculas ni acentos. */
function normalizarNombre(nombre: string): string {
  return nombre
    .trim()
    .toLocaleLowerCase('es')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Devuelve el control indicado cuando el nombre corresponde a un monitoreo. */
export function controlDeNombre(nombre: string): ControlMonitoreo | null {
  const buscado = normalizarNombre(nombre);
  const coincidencia = ALIASES_CONTROL.find(
    (control) => normalizarNombre(control.nombre) === buscado,
  );

  if (!coincidencia) return null;
  return CONTROLES_MONITOREO.find((control) => control.seccion === coincidencia.seccion) ?? null;
}
