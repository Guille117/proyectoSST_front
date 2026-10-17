import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { EpisodioActivoService } from '../data/episodio-activo-service';

/** Rutas del módulo que se muestran sin los submódulos: la raíz y la selección del paciente. */
const RUTAS_SIN_SUBMENU = ['/medica', '/medica/atencion'];

@Component({
  selector: 'app-principal-medica',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './principal-medica.html',
  styleUrl: './principal-medica.scss',
})
export class PrincipalMedica {
  private readonly router = inject(Router);
  private readonly episodioActivo = inject(EpisodioActivoService);

  /**
   * Submódulos del módulo a la vista. El módulo arranca en la selección del paciente, que se muestra
   * sin título ni submenú: los submódulos se descubren al abrir el episodio de un paciente.
   */
  readonly submenuVisible = signal(this.mostrarSubmenu(this.router.url));

  constructor() {
    // Cada navegación decide si la pantalla activa lleva los submódulos del módulo
    this.router.events
      .pipe(
        filter((evento) => evento instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.submenuVisible.set(this.mostrarSubmenu(this.router.url)));
  }

  /**
   * Cierra el episodio en curso y vuelve al listado de pacientes en atención, que es la pantalla de
   * entrada del módulo.
   */
  cerrarEpisodio(): void {
    this.episodioActivo.limpiar();
    this.router.navigate(['/medica', 'atencion']);
  }

  /** La pantalla activa lleva el título del módulo y el submenú de submódulos. */
  private mostrarSubmenu(url: string): boolean {
    return !RUTAS_SIN_SUBMENU.includes(url.split('?')[0]);
  }
}
