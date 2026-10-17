/** Tipos de duración que comparten las indicaciones de medicamentos y los cuidados. */
export type TipoDuracion = 'dias' | 'unica' | 'indefinida';

/** Opción de un desplegable: el valor que se registra y su etiqueta. */
export interface OpcionVista {
  id: string;
  nombre: string;
}

/** Duración de un registro: lo que elige el formulario y muestra la tarjeta. */
export interface DuracionVista {
  /** Tipo de duración elegido; vacío cuando el registro no la precisa. */
  duracionTipo: TipoDuracion | '';
  /** Días escritos en el formulario; solo se usan con el tipo «días». */
  duracionCantidad: number | null;
}

/** Tipos de duración que ofrece el desplegable de la duración. */
export const TIPOS_DURACION: OpcionVista[] = [
  { id: 'dias', nombre: 'Días' },
  { id: 'unica', nombre: 'Dosis única' },
  { id: 'indefinida', nombre: 'Por tiempo indefinido' },
];

/** Texto de la duración que muestra la tarjeta: «7 días», «Dosis única» o «Por tiempo indefinido». */
export function textoDuracion(registro: DuracionVista): string {
  if (registro.duracionTipo === 'dias') {
    return `${registro.duracionCantidad} días`;
  }

  return TIPOS_DURACION.find((opcion) => opcion.id === registro.duracionTipo)?.nombre ?? '';
}

/** La duración en días exige su cantidad: lo comprueban igual los formularios de las secciones. */
export function faltaDuracionEnDias(
  tipo: TipoDuracion | '',
  cantidad: number | null,
): boolean {
  return tipo === 'dias' && (cantidad ?? 0) <= 0;
}
