import { Component, HostListener, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet, RouterLinkWithHref, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { PermisosService } from '../../Modulos/Auth/data/permisos-service';
import { LayoutState } from '../layout-state.service';

@Component({
  selector: 'app-menu-lateral',
  imports: [RouterOutlet, RouterLinkWithHref, RouterLinkActive],
  templateUrl: './menu-lateral.html',
  styleUrl: './menu-lateral.scss',
})
export class MenuLateral {
  readonly permisos = inject(PermisosService);
  readonly layout = inject(LayoutState);
  private readonly router = inject(Router);

  constructor() {
    this.router.events
      .pipe(
        filter((evento) => evento instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.layout.cerrarMenu());
  }

  /** En pantallas estrechas, Escape cierra el menú deslizante. */
  @HostListener('document:keydown.escape')
  cerrarConEscape(): void {
    if (this.layout.menuAbierto()) {
      this.layout.cerrarMenu();
    }
  }
}
