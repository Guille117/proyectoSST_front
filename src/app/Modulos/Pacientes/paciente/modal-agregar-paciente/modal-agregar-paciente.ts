import { Component } from '@angular/core';
import { MatSelectModule } from '@angular/material/select';
import { CampoValidado } from '../../../../shared/campo-validado/campo-validado';
import { TabSwitch } from '../../../../shared/tab-switch/tab-switch';
import { MedicoDatos } from '../data/pacienteInterfaz';
import { UsuarioService } from '../../../Usuarios/usu/data/usuario-service';
import { ServicioCama } from '../../camas/data/servicioCama';
import { camaResponseSimple, EstadoCama } from '../../camas/data/interfazCama';



@Component({
  selector: 'app-modal-agregar-paciente',
  imports: [CampoValidado, MatSelectModule, TabSwitch],
  templateUrl: './modal-agregar-paciente.html',
  styleUrl: './modal-agregar-paciente.scss',
})
export class ModalAgregarPaciente {
  constructor(
    private usuarioService: UsuarioService,
    private servicioCama: ServicioCama,
  ) {}

  contador = 1;
  tipoAtencion: 'emergencia' | 'hospitalizacion' = 'emergencia';
  medicoSeleccionado: MedicoDatos | null = null;
  camaSeleccionada: camaResponseSimple | null = null;
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
    this.cargarCamas();
  }

  // ----------------------- cargar datos ------------------------

  // medicos
  medicos: MedicoDatos[] = [];
  camas: camaResponseSimple[] = [];

  cargarMedicos() {
    this.usuarioService.getMedicos().subscribe((medicos) => {
      this.medicos = medicos;
    });
  }


  cargarCamas(){
  this.servicioCama.buscarCamas(EstadoCama.DISPONIBLE, true).subscribe((camas) => {
    this.camas = camas;
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
