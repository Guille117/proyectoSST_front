import { Component, EventEmitter, Input, Output } from '@angular/core';
import { NgClass } from '@angular/common';
@Component({
  selector: 'app-tab-switch',
  imports: [NgClass],
  templateUrl: './tab-switch.html',
  styleUrl: './tab-switch.scss',
})
export class TabSwitch {
  @Input() op1 = '';
  @Input() op2 = '';
  @Input() disabled = false;
  @Output() opcionCambiada = new EventEmitter<boolean>();

  private _mostrarActivos = true;

  @Input()
  set mostrarActivos(valor: boolean) {
    this._mostrarActivos = valor;
  }

  get mostrarActivos(): boolean {
    return this._mostrarActivos;
  }

  seleccionarOpcion(estado: boolean): void {
    if (this.disabled) return;
    if (estado === this._mostrarActivos) return;
    this._mostrarActivos = estado;
    this.opcionCambiada.emit(estado);
  }
}
