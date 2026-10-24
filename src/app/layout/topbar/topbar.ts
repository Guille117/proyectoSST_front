import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../Modulos/Auth/data/auth-service';

/** Título que se muestra en la barra superior según el módulo activo. */
const TITULOS_MODULO: Record<string, string> = {
  farmacia: 'Módulo de Farmacia',
  usuarios: 'Módulo de usuarios',
  pacientes: 'Módulo de pacientes',
  catalogos: 'Gestión de catálogos',
  medica: 'Módulo Médico',
  enfermeria: 'Módulo de Enfermería',
  expediente: 'Expediente clínico',
};

@Component({
  selector: 'app-topbar',
  imports: [CommonModule],
  templateUrl: './topbar.html',
  styleUrl: './topbar.scss',
})
export class Topbar {
  public authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly tituloModulo = signal(this.obtenerTitulo(this.router.url));

  constructor() {
    this.router.events
      .pipe(
        filter((evento) => evento instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.tituloModulo.set(this.obtenerTitulo(this.router.url)));
  }

  logout(): void {
    this.authService.logout();
  }

  /** Obtiene el título del módulo a partir del primer segmento de la URL. */
  private obtenerTitulo(url: string): string {
    const segmento = url.split('?')[0].split('/')[1] ?? '';
    return TITULOS_MODULO[segmento] ?? '';
  }
}
