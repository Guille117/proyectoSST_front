import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-salidas',
  imports: [],
  templateUrl: './salidas.html',
  styleUrl: './salidas.scss',
})
export class Salidas {
  /** Pestaña activa del detalle: `false` = Solicitudes, `true` = Devoluciones. */
  readonly enDevoluciones = signal(false);

  /** Cambia la vista del detalle entre solicitudes y devoluciones. */
  seleccionarVista(devoluciones: boolean): void {
    if (this.enDevoluciones() === devoluciones) {
      return;
    }

    this.enDevoluciones.set(devoluciones);
  }
}
