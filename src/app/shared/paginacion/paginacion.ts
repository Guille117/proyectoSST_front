import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-paginacion',
  imports: [],
  templateUrl: './paginacion.html',
  styleUrl: './paginacion.scss',
})
export class Paginacion {
  @Input() paginaActual = 1;
  @Input() totalPaginas = 0;
  @Input() cantidadMostrar = 0;
  @Output() paginaCambiada = new EventEmitter<number>();

  paginaAnterior(): void {
    if (this.paginaActual > 1) {
      this.cambiarPagina(this.paginaActual - 1);
    }
  }

  paginaSiguiente(): void {
    if (this.paginaActual < this.totalPaginas) {
      this.cambiarPagina(this.paginaActual + 1);
    }
  }

  private cambiarPagina(pagina: number): void {
    this.paginaActual = pagina;
    this.paginaCambiada.emit(pagina);
  }
}
