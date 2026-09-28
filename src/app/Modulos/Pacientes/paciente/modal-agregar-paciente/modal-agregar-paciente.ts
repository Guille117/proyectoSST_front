import { Component } from '@angular/core';
import { CampoValidado } from '../../../../shared/campo-validado/campo-validado';
import { MedicoDatos } from '../data/pacienteInterfaz';
import { UsuarioService } from '../../../Usuarios/usu/data/usuario-service';

@Component({
  selector: 'app-modal-agregar-paciente',
  imports: [CampoValidado],
  templateUrl: './modal-agregar-paciente.html',
  styleUrl: './modal-agregar-paciente.scss',
})
export class ModalAgregarPaciente {
  constructor(private usuarioService: UsuarioService) {}

  contador = 0;
  tipoAtencion: 'emergencia' | 'hospitalizacion' = 'emergencia';
  archivoReferencia: File | null = null;
  pasos = [
    'Información del paciente',
    'Tipo de atención',
    'Información de responsable',
    'Referencia',
  ];

  // ----------------------- carga de inicio.------------------
  ngOnInit() {
    this.cargarMedicos();
  }

  // ----------------------- cargar datos ------------------------

  // medicos
  medicos: MedicoDatos[] = [];

  cargarMedicos() {
    this.usuarioService.getMedicos().subscribe((medicos) => {
      this.medicos = medicos;
    });
  }









  seleccionarArchivo(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.archivoReferencia = input.files?.[0] ?? null;
  }

  soltarArchivo(event: DragEvent): void {
    event.preventDefault();
    this.archivoReferencia = event.dataTransfer?.files[0] ?? null;
  }

  quitarArchivo(input: HTMLInputElement): void {
    this.archivoReferencia = null;
    input.value = '';
  }
}
