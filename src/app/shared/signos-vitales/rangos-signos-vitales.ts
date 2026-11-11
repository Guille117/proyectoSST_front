/** Signos vitales con rango normal definido. */
export type SignoVitalRango =
  | 'sistolica'
  | 'diastolica'
  | 'frecuenciaCardiaca'
  | 'frecuenciaRespiratoria'
  | 'temperatura'
  | 'saturacion';

interface LimiteSigno {
  min: number;
  max: number | null;
  /** El máximo no pertenece al rango normal (p. ej. PA: «menos de 120/80»). */
  maxExclusivo?: boolean;
}

/** Rangos normales de los signos vitales. */
export const RANGOS_SIGNOS_VITALES: Record<SignoVitalRango, LimiteSigno> = {
  sistolica: { min: 90, max: 120, maxExclusivo: true },
  diastolica: { min: 60, max: 80, maxExclusivo: true },
  frecuenciaCardiaca: { min: 60, max: 100 },
  frecuenciaRespiratoria: { min: 12, max: 20 },
  temperatura: { min: 36.5, max: 37.3 },
  saturacion: { min: 95, max: 100 },
};

/** Indica si el valor está fuera del rango normal del signo vital. */
export function fueraDeRango(
  signo: SignoVitalRango,
  valor: number | null | undefined,
): boolean {
  if (valor === null || valor === undefined || !Number.isFinite(valor)) return false;

  const { min, max, maxExclusivo } = RANGOS_SIGNOS_VITALES[signo];
  return valor < min || (max !== null && (maxExclusivo ? valor >= max : valor > max));
}
