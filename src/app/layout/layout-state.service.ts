import { Injectable, signal } from '@angular/core';

/** Estado de interfaz compartido por la barra superior y el menú lateral. */
@Injectable({
  providedIn: 'root',
})
export class LayoutState {
  readonly menuAbierto = signal(false);

  abrirMenu(): void {
    this.menuAbierto.set(true);
  }

  cerrarMenu(): void {
    this.menuAbierto.set(false);
  }

  alternarMenu(): void {
    this.menuAbierto.update((abierto) => !abierto);
  }
}
