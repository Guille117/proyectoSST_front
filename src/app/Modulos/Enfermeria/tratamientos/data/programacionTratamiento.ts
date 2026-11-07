/** Tipo de duración con el que se describe la vigencia de una indicación. */
export type TipoDuracionTratamiento = 'dias' | 'unica' | 'indefinida';

/** Datos mínimos para calcular la programación de una indicación. */
export interface ProgramacionTratamiento {
  fechaInicio: Date;
  /** Puede faltar cuando la indicación se registra solo con su nombre. */
  frecuencia: number | null;
  /** Vacío cuando la indicación no define un tipo de duración. */
  duracionTipo: TipoDuracionTratamiento | '';
  duracionCantidad: number | null;
}

/** Aplicación programada de una indicación. */
export interface AplicacionProgramada {
  numero: number;
  fechaHora: Date;
}

/** Registro de Enfermería con la fecha programada y la fecha real en que se atendió. */
export interface RegistroProgramado {
  fechaHoraProgramada: string;
  fechaRegistro?: string;
}

const MS_HORA = 60 * 60 * 1000;
const LIMITE_INDEFINIDAS = 1000;

/** Calcula las aplicaciones de una indicación. En las indefinidas solo genera las ya vencidas. */
export function calcularAplicaciones(
  tratamiento: ProgramacionTratamiento,
  hasta: Date = new Date(),
): AplicacionProgramada[] {
  const inicio = new Date(tratamiento.fechaInicio);
  const frecuencia = tratamiento.frecuencia;
  if (
    Number.isNaN(inicio.getTime()) ||
    frecuencia === null ||
    !Number.isFinite(frecuencia) ||
    frecuencia <= 0
  ) {
    return [];
  }

  const paso = frecuencia * MS_HORA;

  if (tratamiento.duracionTipo === 'indefinida') {
    const aplicaciones: AplicacionProgramada[] = [];
    let fecha = inicio.getTime();
    let numero = 1;

    while (fecha <= hasta.getTime() && aplicaciones.length < LIMITE_INDEFINIDAS) {
      aplicaciones.push({ numero, fechaHora: new Date(fecha) });
      fecha += paso;
      numero++;
    }

    return aplicaciones;
  }

  const total = totalAplicaciones(tratamiento);

  return Array.from({ length: total }, (_, indice) => ({
    numero: indice + 1,
    fechaHora: new Date(inicio.getTime() + indice * paso),
  }));
}

/** Indica si todas las aplicaciones programadas ya tienen registro. */
export function estadoTratamiento(
  tratamiento: ProgramacionTratamiento,
  registros: RegistroProgramado[],
  _ahora: Date = new Date(),
): 'pendiente' | 'realizada' {
  if (tratamiento.duracionTipo === 'indefinida') return 'pendiente';

  const programadas = calcularAplicaciones(tratamiento);
  if (!programadas.length) return 'pendiente';

  const registradas = new Set(
    registros
      .map((registro) => claveMinuto(new Date(registro.fechaHoraProgramada)))
      .filter((clave) => !Number.isNaN(clave)),
  );

  return programadas.every((aplicacion) => registradas.has(claveMinuto(aplicacion.fechaHora)))
    ? 'realizada'
    : 'pendiente';
}

/** Fecha real de la última aplicación registrada, o null si no hay registros. */
export function ultimaAplicacionRegistrada(registros: RegistroProgramado[]): Date | null {
  const fechas = registros
    .map((registro) => new Date(registro.fechaRegistro ?? registro.fechaHoraProgramada))
    .filter((fecha) => !Number.isNaN(fecha.getTime()));

  if (!fechas.length) return null;

  return new Date(Math.max(...fechas.map((fecha) => fecha.getTime())));
}

/** Primera aplicación pendiente, o null si ya no hay. */
export function proximaAplicacion(
  tratamiento: ProgramacionTratamiento,
  registros: RegistroProgramado[] = [],
  ahora: Date = new Date(),
): Date | null {
  const inicio = new Date(tratamiento.fechaInicio);
  const frecuencia = tratamiento.frecuencia;
  if (
    Number.isNaN(inicio.getTime()) ||
    frecuencia === null ||
    !Number.isFinite(frecuencia) ||
    frecuencia <= 0
  ) {
    return null;
  }

  const paso = frecuencia * MS_HORA;
  const registradas = new Set(
    registros
      .map((registro) => claveMinuto(new Date(registro.fechaHoraProgramada)))
      .filter((clave) => !Number.isNaN(clave)),
  );
  const estaRegistrada = (fecha: Date): boolean => registradas.has(claveMinuto(fecha));

  if (tratamiento.duracionTipo === 'unica') {
    return estaRegistrada(inicio) ? null : inicio;
  }

  if (tratamiento.duracionTipo === 'dias') {
    return (
      calcularAplicaciones(tratamiento).find(
        (aplicacion) => !estaRegistrada(aplicacion.fechaHora),
      )?.fechaHora ?? null
    );
  }

  const pendiente = calcularAplicaciones(tratamiento, ahora).find(
    (aplicacion) => !estaRegistrada(aplicacion.fechaHora),
  );
  if (pendiente) return pendiente.fechaHora;

  if (inicio.getTime() > ahora.getTime()) return inicio;

  const pasos = Math.floor((ahora.getTime() - inicio.getTime()) / paso) + 1;
  return new Date(inicio.getTime() + pasos * paso);
}

/** Cantidad de aplicaciones que se deducen de la frecuencia y la duración. */
function totalAplicaciones(tratamiento: ProgramacionTratamiento): number {
  if (tratamiento.duracionTipo === 'unica') return 1;
  if (tratamiento.duracionTipo !== 'dias') return 0;

  const horas = (tratamiento.duracionCantidad ?? 0) * 24;
  const frecuencia = tratamiento.frecuencia;
  if (horas <= 0 || frecuencia === null || !Number.isFinite(frecuencia) || frecuencia <= 0) {
    return 0;
  }

  // Cantidad de aplicaciones = horas / frecuencia, truncada al entero.
  return Math.max(1, Math.floor(horas / frecuencia));
}

/** Clave de minuto para comparar fechas programadas sin depender de los segundos. */
function claveMinuto(fecha: Date): number {
  if (Number.isNaN(fecha.getTime())) return Number.NaN;
  return Math.floor(fecha.getTime() / 60000);
}
