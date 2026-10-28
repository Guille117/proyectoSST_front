import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLinkWithHref, RouterLinkActive } from "@angular/router";
import { PermisosService } from '../../Modulos/Auth/data/permisos-service';

@Component({
  selector: 'app-menu-lateral',
  imports: [RouterOutlet, RouterLinkWithHref, RouterLinkActive],
  templateUrl: './menu-lateral.html',
  styleUrl: './menu-lateral.scss',
})
export class MenuLateral {
  readonly permisos = inject(PermisosService);
}
