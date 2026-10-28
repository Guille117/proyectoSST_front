import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { PermisosService } from '../../Auth/data/permisos-service';

@Component({
  selector: 'app-principal-pacientes',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './principal-pacientes.html',
  styleUrl: './principal-pacientes.scss',
})
export class PrincipalPacientes {
  readonly permisos = inject(PermisosService);
}
