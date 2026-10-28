import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";
import { PermisosService } from '../../Auth/data/permisos-service';

@Component({
  selector: 'app-principal-usuarios',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './principal-usuarios.html',
  styleUrl: './principal-usuarios.scss',
})
export class PrincipalUsuarios {
  readonly permisos = inject(PermisosService);
}
