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
  @Output() paginaCambiada = new EventEmitter<number>();

  mostrando = 0

  ngOnInit() {
    this.iniciarVariables();
  }

  iniciarVariables(){
    if(this.cantidadMostrar > this.totalregistros){
      this.mostrando = this.totalregistros;
    }else{
      this.mostrando = this.cantidadMostrar;
    }
  }

  paginaAnterior(): void {
    if (this.paginaActual > 1) {
      this.cambiarPagina(this.paginaActual - 1);
    }
  }
    
  paginaSiguiente(): void {
    if (this.paginaActual < this.totalregistros) {
      this.cambiarPagina(this.paginaActual + 1);
    }
  }

  private cambiarPagina(pagina: number): void {
    this.paginaActual = pagina;
    this.paginaCambiada.emit(pagina);
  }
}
