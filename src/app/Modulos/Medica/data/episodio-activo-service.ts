import { Injectable, signal } from '@angular/core';

/** Clave con la que se conserva el episodio activo entre pantallas y recargas. */
const CLAVE_EPISODIO = 'medica_episodio_id';

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

  /** Episodio activo; null cuando no se ha abierto ninguno. */
  readonly episodioId = this.episodioGuardado.asReadonly();

  /** Guarda el episodio activo; un id inválido limpia el episodio en curso. */
  guardar(episodioId: number | null): void {
    if (episodioId === null || !Number.isInteger(episodioId) || episodioId <= 0) {
      this.limpiar();
      return;
    }

    this.episodioGuardado.set(episodioId);
    localStorage.setItem(CLAVE_EPISODIO, String(episodioId));
  }

  /** Devuelve el episodio activo o null si no hay ninguno guardado. */
  obtener(): number | null {
    return this.episodioGuardado();
  }

  /** Cierra el episodio activo y olvida su identificador. */
  limpiar(): void {
    this.episodioGuardado.set(null);
    localStorage.removeItem(CLAVE_EPISODIO);
  }

  /** Recupera el episodio guardado, descartando valores que no sean ids válidos. */
  private leerEpisodio(): number | null {
    const guardado = localStorage.getItem(CLAVE_EPISODIO);
    if (!guardado) return null;

    const episodioId = Number(guardado);
    return Number.isInteger(episodioId) && episodioId > 0 ? episodioId : null;
  }
}
