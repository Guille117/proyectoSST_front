import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-principal-medica',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './principal-medica.html',
  styleUrl: './principal-medica.scss',
})
export class PrincipalMedica {}
