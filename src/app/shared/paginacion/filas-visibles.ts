export const FILAS_VISIBLES_POR_DEFECTO = 5;

/**
 * Calcula cuántas filas caben en el panel de la tabla sin generar desplazamiento.
 * Si el navegador no puede medir el DOM (por ejemplo, en pruebas), conserva el valor por defecto.
 */
export function calcularFilasVisibles(panel: HTMLElement | null): number {
  if (!panel) return FILAS_VISIBLES_POR_DEFECTO;

  const tabla = panel.querySelector<HTMLTableElement>('table');
  const fila = tabla?.querySelector<HTMLTableRowElement>('tbody tr');
  const cabecera = tabla?.querySelector<HTMLTableSectionElement>('thead');
  const pie = tabla?.querySelector<HTMLTableSectionElement>('tfoot');
  const encabezado = panel.querySelector<HTMLElement>('.encabezado-registros');

  if (!tabla || !fila || !cabecera || !pie) return FILAS_VISIBLES_POR_DEFECTO;

  const altoFila = fila.getBoundingClientRect().height;
  const altoPanel = altoDisponible(panel);
  if (altoFila <= 0 || altoPanel <= 0) return FILAS_VISIBLES_POR_DEFECTO;

  const estiloPanel = getComputedStyle(panel);
  const relleno = parseFloat(estiloPanel.paddingTop) + parseFloat(estiloPanel.paddingBottom);
  const margenEncabezado = encabezado ? parseFloat(getComputedStyle(encabezado).marginBottom) : 0;
  const espacioFijo =
    relleno +
    (encabezado?.getBoundingClientRect().height ?? 0) +
    margenEncabezado +
    cabecera.getBoundingClientRect().height +
    pie.getBoundingClientRect().height +
    12;

  const filas = Math.floor((altoPanel - espacioFijo) / altoFila);
  return Math.max(1, filas);
}

/** Alto máximo del panel limitado también por el espacio que queda hasta el final de la ventana. */
function altoDisponible(panel: HTMLElement): number {
  const maxHeight = parseFloat(getComputedStyle(panel).maxHeight);
  const topDocumento = panel.getBoundingClientRect().top + window.scrollY;
  const altoVentana = window.innerHeight - topDocumento - 16;

  if (Number.isFinite(maxHeight) && maxHeight > 0) {
    return Math.min(maxHeight, altoVentana);
  }

  return altoVentana;
}
