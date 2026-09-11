import { Component, EventEmitter, Output } from '@angular/core';
import { Input } from '@angular/core';
import { NgClass } from '@angular/common';
@Component({
  selector: 'app-tab-switch',
  imports: [NgClass],
  templateUrl: './tab-switch.html',
  styleUrl: './tab-switch.scss',
})
export class TabSwitch {
  @Input() op1: string = '';
  @Input() op2: string = '';
  @Output() opcionCambiada = new EventEmitter<boolean>();
  
  mostrarActivos: boolean = true;

  seleccionarOpcion(activos: boolean): void {
    if (this.mostrarActivos === activos) return;

    this.mostrarActivos = activos;
    this.opcionCambiada.emit(activos);
  }
}
