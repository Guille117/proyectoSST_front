import { Component, inject } from '@angular/core';
import { TabSwitch } from '../../../shared/tab-switch/tab-switch';
import { ChangeDetectorRef } from '@angular/core';
import { ModalService } from '../../../modal-principal/modal-service';
import { ModalAgregarPaciente } from './modal-agregar-paciente/modal-agregar-paciente';
import { PacienteService } from './data/paciente-service';
import { PacienteResumido } from './data/pacienteInterfaz';

@Component({
  selector: 'app-paciente',
  imports: [TabSwitch],
  templateUrl: './paciente.html',
  styleUrl: './paciente.scss',
})
export class Paciente {

  // dependencias inyectadas
  private modalService = inject(ModalService);
  private servicioPaciente = inject(PacienteService);
  private readonly cdr = inject(ChangeDetectorRef);

  //--------------------------------------
    ngOnInit(){
      this.listarPacientes();
    }


  // ------------------- LISTAR PACIENTES -------------------
  pacientes: PacienteResumido[] = [];

  listarPacientes(){
    this.servicioPaciente.listarPacientes().subscribe({
      next: (pacientes) => {
        this.pacientes = pacientes;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al listar pacientes', err);
      }
    });
  }


// ------------------- ACCIONES DE MODAL -------------------
  abrirModalAgregar(): void {
    this.modalService.open(ModalAgregarPaciente, {
      title: 'Agregar paciente',
      isEditing: false,
      onSuccess: () => this.listarPacientes(),
    });
  }
}
