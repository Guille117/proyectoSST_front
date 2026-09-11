import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from "@angular/router";

@Component({
  selector: 'app-principal-usuarios',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './principal-usuarios.html',
  styleUrl: './principal-usuarios.scss',
})
export class PrincipalUsuarios {}
