import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { PermisosService } from '../../Auth/data/permisos-service';
import { EpisodioActivoService } from '../../Medica/data/episodio-activo-service';

/** Rutas del módulo que se muestran sin los submódulos: la raíz y la selección del paciente. */
const RUTAS_SIN_SUBMENU = ['/enfermeria', '/enfermeria/atencion'];

@Component({
  selector: 'app-principal-enfermeria',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './principal-enfermeria.html',
  styleUrl: './principal-enfermeria.scss',
})
export class PrincipalEnfermeria {
  readonly permisos = inject(PermisosService);
  private readonly router = inject(Router);
  private readonly episodioActivo = inject(EpisodioActivoService);

  /** Los submódulos se muestran al abrir el episodio; la entrada es la selección del paciente. */
  readonly submenuVisible = signal(this.mostrarSubmenu(this.router.url));

  constructor() {
    this.router.events
      .pipe(
        filter((evento) => evento instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.submenuVisible.set(this.mostrarSubmenu(this.router.url)));
  }

  /** Cierra el episodio en curso y vuelve al listado de pacientes. */
  cerrarEpisodio(): void {
    this.episodioActivo.limpiar();
    this.router.navigate(['/enfermeria', 'atencion']);
  }

  private mostrarSubmenu(url: string): boolean {
    return !RUTAS_SIN_SUBMENU.includes(url.split('?')[0]);
  }
}
