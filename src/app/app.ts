import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ModalPrincipal } from './modal-principal/modal-principal';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ModalPrincipal],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('frontSST');
}
