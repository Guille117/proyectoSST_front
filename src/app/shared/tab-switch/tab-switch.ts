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
  @Input() mostrarActivos = true;
  @Output() opcionCambiada = new EventEmitter<boolean>();

  seleccionarOpcion(): void {
    this.mostrarActivos = !this.mostrarActivos;
    this.opcionCambiada.emit(this.mostrarActivos);
  }
}
