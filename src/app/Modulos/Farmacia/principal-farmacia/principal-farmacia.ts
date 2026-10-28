import { Component, inject } from '@angular/core';
import { RouterOutlet, RouterLinkWithHref, RouterLinkActive } from "@angular/router";
import { PermisosService } from '../../Auth/data/permisos-service';

@Component({
  selector: 'app-principal-farmacia',
  imports: [RouterOutlet, RouterLinkWithHref, RouterLinkActive],
  templateUrl: './principal-farmacia.html',
  styleUrl: './principal-farmacia.scss',
})
export class PrincipalFarmacia {
  readonly permisos = inject(PermisosService);
}
