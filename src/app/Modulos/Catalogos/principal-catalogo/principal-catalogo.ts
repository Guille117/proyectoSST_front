import { Component } from '@angular/core';
import { RouterLink, RouterOutlet, RouterLinkActive } from "@angular/router";

@Component({
  selector: 'app-principal-catalogo',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './principal-catalogo.html',
  styleUrl: './principal-catalogo.scss',
})
export class PrincipalCatalogo {}
