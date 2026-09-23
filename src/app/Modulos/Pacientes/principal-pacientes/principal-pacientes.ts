import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-principal-pacientes',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './principal-pacientes.html',
  styleUrl: './principal-pacientes.scss',
})
export class PrincipalPacientes {}
