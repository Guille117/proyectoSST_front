import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MenuLateral } from "./layout/menu-lateral/menu-lateral";
import { Topbar } from "./layout/topbar/topbar";

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, MenuLateral, Topbar],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('frontSST');
}
