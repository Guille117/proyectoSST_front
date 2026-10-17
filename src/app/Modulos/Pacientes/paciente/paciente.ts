import { Component, inject } from '@angular/core';
import { TabSwitch } from '../../../shared/tab-switch/tab-switch';
import { ChangeDetectorRef } from '@angular/core';
import { ModalService } from '../../../modal-principal/modal-service';
import { ModalAgregarPaciente } from './modal-agregar-paciente/modal-agregar-paciente';
import { PacienteService } from './data/paciente-service';
import { PacienteResumido, TipoAtencion } from './data/pacienteInterfaz';

/** Signo vital que se muestra en el detalle del paciente. */
interface SignoVitalVista {
  etiqueta: string;
  valor: string;
  unidad: string;
}

/** Paciente del listado con el detalle que se muestra en el panel de la derecha. */
interface PacienteVista extends PacienteResumido {
  edad: number;
  sexo: string;
  fechaIngreso: string;
  /** Código de la cama o del box según el tipo de atención, sin la etiqueta. */
  ubicacion: string;
  diagnostico: string;
  alergias: string;
  signosVitales: SignoVitalVista[];
}

// MOCK: detalle temporal de diseño. Se sustituirá por el detalle real del paciente (edad, sexo,
// ingreso, cama, diagnóstico, alergias y signos vitales) en la fase de integración.
/** Signos vitales de la maqueta que comparten los pacientes. */
const SIGNOS_VITALES_MOCK: SignoVitalVista[] = [
  { etiqueta: 'PA', valor: '120/80', unidad: 'mmHg' },
  { etiqueta: 'FC', valor: '82', unidad: 'lpm' },
  { etiqueta: 'Temp', valor: '37.2', unidad: '°C' },
  { etiqueta: 'SpO2', valor: '97', unidad: '%' },
];

/** Detalle de la maqueta: se reparte por posición entre los pacientes que devuelve el backend. */
const DETALLES_MOCK: Omit<PacienteVista, keyof PacienteResumido>[] = [
  {
    edad: 45,
    sexo: 'Masculino',
    ubicacion: 'A-105',
    diagnostico: 'Gastroenteritis aguda',
    fechaIngreso: '10-10-2026',
    alergias: 'Ninguna conocida',
    signosVitales: SIGNOS_VITALES_MOCK,
  },
  {
    edad: 32,
    sexo: 'Femenino',
    ubicacion: '2',
    diagnostico: 'Cólico renal',
    fechaIngreso: '10-10-2026',
    alergias: 'Ninguna conocida',
    signosVitales: SIGNOS_VITALES_MOCK,
  },
  {
    edad: 58,
    sexo: 'Masculino',
    ubicacion: 'A-106',
    diagnostico: 'Neumonía adquirida en la comunidad',
    fechaIngreso: '10-10-2026',
    alergias: 'Penicilina',
    signosVitales: SIGNOS_VITALES_MOCK,
  },
  {
    edad: 27,
    sexo: 'Femenino',
    ubicacion: 'B-201',
    diagnostico: 'Postoperatorio de apendicectomía',
    fechaIngreso: '09-10-2026',
    alergias: 'Ninguna conocida',
    signosVitales: SIGNOS_VITALES_MOCK,
  },
];
// ------------------- FIN MOCK -------------------

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
  pacientes: PacienteVista[] = [];
  pacienteSeleccionado: PacienteVista | null = null;

  /** Etiquetas del tipo de atención del paciente. */
  protected readonly etiquetasTipo: Record<TipoAtencion, string> = {
    HOSPITALIZACION: 'Hospitalización',
    EMERGENCIA: 'Emergencia',
  };

  listarPacientes(){
    this.servicioPaciente.listarPacientes().subscribe({
      next: (pacientes) => {
        this.pacientes = pacientes.map((paciente, posicion) => this.aVista(paciente, posicion));
        // El detalle arranca con el primer paciente del listado
        this.pacienteSeleccionado = this.pacientes[0] ?? null;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al listar pacientes', err);
      }
    });
  }

  // ------------------- SELECCIÓN DEL PACIENTE -------------------
  seleccionarPaciente(paciente: PacienteVista): void {
    this.pacienteSeleccionado = paciente;
  }

  esSeleccionado(paciente: PacienteVista): boolean {
    return this.pacienteSeleccionado === paciente;
  }

  /** Solo las atenciones con hospitalización tienen cama; la emergencia no muestra destino. */
  protected esHospitalizacion(paciente: PacienteVista): boolean {
    return paciente.tipoTratamiento === 'HOSPITALIZACION';
  }


// ------------------- ACCIONES DE MODAL -------------------
  abrirModalAgregar(): void {
    this.modalService.open(ModalAgregarPaciente, {
      title: 'Agregar paciente',
      isEditing: false,
      onSuccess: () => this.listarPacientes(),
    });
  }

  // ------------------- AUXILIARES -------------------
  /** Combina los datos reales del resumen con el detalle temporal de la maqueta. */
  private aVista(paciente: PacienteResumido, posicion: number): PacienteVista {
    const detalle = DETALLES_MOCK[posicion % DETALLES_MOCK.length];
    return { ...paciente, ...detalle };
  }
}
