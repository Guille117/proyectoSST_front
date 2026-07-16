import { Component, inject, signal } from '@angular/core';
import { ModalPrincipal } from '../../../modal-principal/modal-principal';
import { ModalService } from '../../../modal-principal/modal-service';
import { ModalMasDetalle } from '../modalesFarmacia/modal-mas-detalle/modal-mas-detalle';
import { ModalMasCompra } from '../modalesFarmacia/modal-mas-compra/modal-mas-compra';

@Component({
  selector: 'app-ingresos',
  imports: [ModalPrincipal],
  templateUrl: './ingresos.html',
  styleUrl: './ingresos.scss',
})
export class Ingresos {

  private modalService = inject(ModalService);

  abrirModalDetalleMed() {
    this.modalService.open(ModalMasDetalle, {title: 'Agregar detalle de producto'});
  }

  abrirModalCompra() {
    this.modalService.open(ModalMasCompra, { });
  }

  nombreUsuario = signal('Usuario');
}
