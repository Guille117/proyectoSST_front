import { Component, inject, signal } from '@angular/core';
import { ModalService } from '../../../modal-principal/modal-service';
import { ModalMasDetalle } from '../modalesFarmacia/modal-mas-detalle/modal-mas-detalle';
import { ModalMasCompra } from '../modalesFarmacia/modal-mas-compra/modal-mas-compra';

@Component({
  selector: 'app-ingresos',
  imports: [],
  templateUrl: './ingresos.html',
  styleUrl: './ingresos.scss',
})
export class Ingresos {

  private modalService = inject(ModalService);

  abrirModalDetalleMed() {
    this.modalService.open(ModalMasDetalle, {title: 'Agregar detalle de producto'});
  }

  abrirModalCompra() {
    this.modalService.open(ModalMasCompra, {
      title: 'Registro de compra',
      subtitle: 'Paso 1 de 2: Selección de productos',
    });
  }

  nombreUsuario = signal('Usuario');
}
