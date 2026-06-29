import { Component } from '@angular/core';
import { RouterOutlet, RouterLinkWithHref } from "@angular/router";

@Component({
  selector: 'app-menu-lateral',
  imports: [RouterOutlet, RouterLinkWithHref],
  templateUrl: './menu-lateral.html',
  styleUrl: './menu-lateral.scss',
})
export class MenuLateral {}
