import { Component, inject } from '@angular/core';
import { TabSwitch } from '../../../shared/tab-switch/tab-switch';
import { ModalService } from '../../../modal-principal/modal-service';
import { ModalAgregarPaciente } from './modal-agregar-paciente/modal-agregar-paciente';

@Component({
  selector: 'app-paciente',
  imports: [TabSwitch],
  templateUrl: './paciente.html',
  styleUrl: './paciente.scss',
})
export class Paciente {
  private modalService = inject(ModalService);

  abrirModalAgregar(): void {
    this.modalService.open(ModalAgregarPaciente, {
      title: 'Agregar paciente',
      isEditing: false
    });
  }
}
