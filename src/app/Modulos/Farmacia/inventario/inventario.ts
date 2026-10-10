import { Component } from '@angular/core';
import { TabSwitch } from '../../../shared/tab-switch/tab-switch';

export type EstadoInventario =
  | 'vencidos'
  | 'por-vencer'
  | 'stock-bajo'
  | 'sin-stock'
  | 'eliminados';

interface FiltroEstado {
  valor: EstadoInventario;
  etiqueta: string;
}

@Component({
  selector: 'app-inventario',
  imports: [TabSwitch],
  templateUrl: './inventario.html',
  styleUrl: './inventario.scss',
})
export class Inventario {
  // ------------ FILTROS Y SELECCION ------------
  isMedicamento = true;
  estadoSeleccionado: EstadoInventario | null = null;

  readonly estados: FiltroEstado[] = [
    { valor: 'vencidos', etiqueta: 'Vencidos' },
    { valor: 'por-vencer', etiqueta: 'Por vencer' },
    { valor: 'stock-bajo', etiqueta: 'Stock bajo' },
    { valor: 'sin-stock', etiqueta: 'Sin stock' },
    { valor: 'eliminados', etiqueta: 'Eliminados' },
  ];

  seleccionarEstado(estado: EstadoInventario): void {
    this.estadoSeleccionado = this.estadoSeleccionado === estado ? null : estado;
  }
}
