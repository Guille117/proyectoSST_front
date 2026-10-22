/** Tipo de duración con el que se describe la vigencia de una indicación. */
export type TipoDuracionTratamiento = 'dias' | 'unica' | 'indefinida';

/** Datos mínimos para calcular la programación de una indicación. */
export interface ProgramacionTratamiento {
  fechaInicio: Date;
  frecuencia: number;
  duracionTipo: TipoDuracionTratamiento;
  duracionCantidad: number | null;
}

/** Aplicación programada de una indicación. */
export interface AplicacionProgramada {
  numero: number;
  fechaHora: Date;
}

/** Registro de Enfermería con la fecha programada que ya fue atendida. */
export interface RegistroProgramado {
  fechaHoraProgramada: string;
}

const MS_HORA = 60 * 60 * 1000;
const LIMITE_INDEFINIDAS = 1000;

/** Calcula las aplicaciones de una indicación. En las indefinidas solo genera las ya vencidas. */
export function calcularAplicaciones(
  tratamiento: ProgramacionTratamiento,
  hasta: Date = new Date(),
): AplicacionProgramada[] {
  const inicio = new Date(tratamiento.fechaInicio);
  if (
    Number.isNaN(inicio.getTime()) ||
    !Number.isFinite(tratamiento.frecuencia) ||
    tratamiento.frecuencia <= 0
  ) {
    return [];
  }

  const paso = tratamiento.frecuencia * MS_HORA;

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

/** Indica si las aplicaciones vencidas ya tienen registro. */
export function estadoTratamiento(
  tratamiento: ProgramacionTratamiento,
  registros: RegistroProgramado[],
  ahora: Date = new Date(),
): 'pendiente' | 'realizada' {
  const vencidas = calcularAplicaciones(tratamiento, ahora).filter(
    (aplicacion) => aplicacion.fechaHora.getTime() <= ahora.getTime(),
  );

  if (!vencidas.length) return 'pendiente';

  const registradas = new Set(
    registros
      .map((registro) => claveMinuto(new Date(registro.fechaHoraProgramada)))
      .filter((clave) => !Number.isNaN(clave)),
  );

  return vencidas.every((aplicacion) => registradas.has(claveMinuto(aplicacion.fechaHora)))
    ? 'realizada'
    : 'pendiente';
}

/** Fecha de la última aplicación registrada, o null si no hay registros. */
export function ultimaAplicacionRegistrada(registros: RegistroProgramado[]): Date | null {
  const fechas = registros
    .map((registro) => new Date(registro.fechaHoraProgramada))
    .filter((fecha) => !Number.isNaN(fecha.getTime()));

  if (!fechas.length) return null;

  return new Date(Math.max(...fechas.map((fecha) => fecha.getTime())));
}

/** Próxima aplicación programada a partir de ahora, o null si ya no hay. */
export function proximaAplicacion(
  tratamiento: ProgramacionTratamiento,
  ahora: Date = new Date(),
): Date | null {
  const inicio = new Date(tratamiento.fechaInicio);
  if (
    Number.isNaN(inicio.getTime()) ||
    !Number.isFinite(tratamiento.frecuencia) ||
    tratamiento.frecuencia <= 0
  ) {
    return null;
  }

  const paso = tratamiento.frecuencia * MS_HORA;

  if (tratamiento.duracionTipo === 'unica') {
    return inicio.getTime() > ahora.getTime() ? inicio : null;
  }

  if (tratamiento.duracionTipo === 'dias') {
    return (
      calcularAplicaciones(tratamiento).find(
        (aplicacion) => aplicacion.fechaHora.getTime() > ahora.getTime(),
      )?.fechaHora ?? null
    );
  }

  if (inicio.getTime() > ahora.getTime()) return inicio;

  const pasos = Math.floor((ahora.getTime() - inicio.getTime()) / paso) + 1;
  return new Date(inicio.getTime() + pasos * paso);
}

/** Cantidad de aplicaciones que se deducen de la frecuencia y la duración. */
function totalAplicaciones(tratamiento: ProgramacionTratamiento): number {
  if (tratamiento.duracionTipo === 'unica') return 1;
  if (tratamiento.duracionTipo !== 'dias') return 0;

  const horas = (tratamiento.duracionCantidad ?? 0) * 24;
  if (horas <= 0) return 0;

  return Math.max(1, Math.ceil(horas / tratamiento.frecuencia));
}

/** Clave de minuto para comparar fechas programadas sin depender de los segundos. */
function claveMinuto(fecha: Date): number {
  if (Number.isNaN(fecha.getTime())) return Number.NaN;
  return Math.floor(fecha.getTime() / 60000);
}
