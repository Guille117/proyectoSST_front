import { Injectable, signal } from '@angular/core';

/** Clave con la que se conserva el episodio activo entre pantallas y recargas. */
const CLAVE_EPISODIO = 'medica_episodio_id';

/** Clave con la que se recuerda que el episodio abierto solo se puede consultar. */
const CLAVE_SOLO_LECTURA = 'medica_episodio_solo_lectura';

/** Clave con la que se conserva el paciente del episodio activo. */
const CLAVE_PACIENTE = 'medica_paciente_id';

/**
 * Episodio clínico activo del módulo Médico: lo guarda la selección del paciente y lo conserva
 * hasta que se cierra el episodio. Se persiste en localStorage para que las pantallas del episodio
 * lo recuperen aunque se recargue la página.
 */
@Injectable({
  providedIn: 'root',
})
export class EpisodioActivoService {
  private readonly episodioGuardado = signal<number | null>(this.leerEpisodio());
  private readonly soloLecturaGuardado = signal<boolean>(this.leerSoloLectura());
  private readonly pacienteGuardado = signal<number | null>(this.leerPaciente());

  /** Episodio activo; null cuando no se ha abierto ninguno. */
  readonly episodioId = this.episodioGuardado.asReadonly();

  /** Paciente del episodio activo; null cuando no se ha abierto ninguno. */
  readonly pacienteId = this.pacienteGuardado.asReadonly();

  /**
   * Guarda el episodio activo; un id inválido limpia el episodio en curso. Los episodios cerrados
   * se guardan en modo solo lectura para que sus pantallas oculten las acciones de escritura.
   */
  guardar(episodioId: number | null, soloLectura = false): void {
    if (episodioId === null || !Number.isInteger(episodioId) || episodioId <= 0) {
      this.limpiar();
      return;
    }

    this.episodioGuardado.set(episodioId);
    this.soloLecturaGuardado.set(soloLectura);
    localStorage.setItem(CLAVE_EPISODIO, String(episodioId));

    if (soloLectura) {
      localStorage.setItem(CLAVE_SOLO_LECTURA, 'true');
    } else {
      localStorage.removeItem(CLAVE_SOLO_LECTURA);
    }
  }

  /** Guarda el paciente del episodio activo; un id inválido lo olvida. */
  guardarPaciente(pacienteId: number | null): void {
    if (pacienteId === null || !Number.isInteger(pacienteId) || pacienteId <= 0) {
      this.pacienteGuardado.set(null);
      localStorage.removeItem(CLAVE_PACIENTE);
      return;
    }

    this.pacienteGuardado.set(pacienteId);
    localStorage.setItem(CLAVE_PACIENTE, String(pacienteId));
  }

  /** El episodio abierto es un historial cerrado: solo se puede consultar. */
  esSoloLectura(): boolean {
    return this.soloLecturaGuardado();
  }

  /** Devuelve el episodio activo o null si no hay ninguno guardado. */
  obtener(): number | null {
    return this.episodioGuardado();
  }

  /** Cierra el episodio activo y olvida sus identificadores. */
  limpiar(): void {
    this.episodioGuardado.set(null);
    this.soloLecturaGuardado.set(false);
    this.pacienteGuardado.set(null);
    localStorage.removeItem(CLAVE_EPISODIO);
    localStorage.removeItem(CLAVE_SOLO_LECTURA);
    localStorage.removeItem(CLAVE_PACIENTE);
  }

  /** Recupera el episodio guardado, descartando valores que no sean ids válidos. */
  private leerEpisodio(): number | null {
    const guardado = localStorage.getItem(CLAVE_EPISODIO);
    if (!guardado) return null;

    const episodioId = Number(guardado);
    return Number.isInteger(episodioId) && episodioId > 0 ? episodioId : null;
  }

  /** Recupera el paciente guardado, descartando valores que no sean ids válidos. */
  private leerPaciente(): number | null {
    const guardado = localStorage.getItem(CLAVE_PACIENTE);
    if (!guardado) return null;

    const pacienteId = Number(guardado);
    return Number.isInteger(pacienteId) && pacienteId > 0 ? pacienteId : null;
  }

  /** Recupera el modo de solo lectura guardado; sin episodio no se considera activo. */
  private leerSoloLectura(): boolean {
    return this.leerEpisodio() !== null && localStorage.getItem(CLAVE_SOLO_LECTURA) === 'true';
  }
}
