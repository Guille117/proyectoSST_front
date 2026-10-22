import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-principal-enfermeria',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './principal-enfermeria.html',
  styleUrl: './principal-enfermeria.scss',
})
export class PrincipalEnfermeria {}
