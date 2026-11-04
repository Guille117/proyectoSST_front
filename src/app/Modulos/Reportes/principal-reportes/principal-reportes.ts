import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLinkWithHref, RouterLinkActive } from '@angular/router';
import { PermisosService } from '../../Auth/data/permisos-service';

@Component({
  selector: 'app-principal-reportes',
  imports: [RouterOutlet, RouterLinkWithHref, RouterLinkActive],
  templateUrl: './principal-reportes.html',
  styleUrl: './principal-reportes.scss',
})
export class PrincipalReportes {
  readonly permisos = inject(PermisosService);
}
