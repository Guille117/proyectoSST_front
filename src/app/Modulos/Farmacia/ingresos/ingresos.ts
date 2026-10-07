import { Component, inject, signal } from '@angular/core';
import { ModalService } from '../../../modal-principal/modal-service';
import { ModalMasDetalle } from '../modalesFarmacia/modal-mas-detalle/modal-mas-detalle';
import { AgregarCompra } from './agregar-compra/agregar-compra';

@Component({
  selector: 'app-ingresos',
  imports: [AgregarCompra],
  templateUrl: './ingresos.html',
  styleUrl: './ingresos.scss',
})
export class Ingresos {

  private modalService = inject(ModalService);

  abrirModalDetalleMed() {
    this.modalService.open(ModalMasDetalle, {title: 'Agregar detalle de producto'});
  }

  abrirModalCompra() {
    this.mostrarAgregarCompra.set(true);
  }

  cancelarAgregarCompra() {
    this.mostrarAgregarCompra.set(false);
  }

  mostrarAgregarCompra = signal(false);
  nombreUsuario = signal('Usuario');
}
