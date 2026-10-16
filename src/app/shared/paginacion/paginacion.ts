import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-paginacion',
  imports: [],
  templateUrl: './paginacion.html',
  styleUrl: './paginacion.scss',
})
export class Paginacion {
  @Input() paginaActual = 1;
  @Input() totalregistros = 0;
  @Input() cantidadMostrar = 0;
  /** Texto que se intercala con el recuento de registros; vacío cuando la pantalla no lo precisa. */
  @Input() textoAlterno = '';
  @Output() paginaCambiada = new EventEmitter<number>();

  get mostrando(): number {
    return Math.max(0, Math.min(this.cantidadMostrar, this.totalregistros - (this.paginaActual - 1) * this.cantidadMostrar));
  }

  /** Recuento de los registros que muestra la página actual del listado. */
  get textoMostrando(): string {
    return `Mostrando ${this.mostrando} de ${this.totalregistros} resultados`;
  }

  get totalPaginas(): number {
    return Math.max(1, Math.ceil(this.totalregistros / this.cantidadMostrar));
  }

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
