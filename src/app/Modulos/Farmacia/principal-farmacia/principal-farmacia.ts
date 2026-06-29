import { Component } from '@angular/core';
import { RouterOutlet, RouterLinkWithHref, RouterLinkActive } from "@angular/router";

@Component({
  selector: 'app-principal-farmacia',
  imports: [RouterOutlet, RouterLinkWithHref, RouterLinkActive],
  templateUrl: './principal-farmacia.html',
  styleUrl: './principal-farmacia.scss',
})
export class PrincipalFarmacia {}
