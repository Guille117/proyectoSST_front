import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatosPaciente } from '../datos-paciente/datos-paciente';
import { Diagnostico } from '../diagnostico/diagnostico';
import { HistoriaClinica } from '../historia-clinica/historia-clinica';

/* Tipos locales de la maqueta: se sustituirán por el contrato real del backend en la fase de integración. */
interface SeccionVista {
  id: string;
  titulo: string;
  descripcion: string;
  icono: string;
}

interface SistemaExamenVista {
  id: string;
  nombre: string;
}

interface HallazgoVista {
  id: number;
  sistema: string;
  icono: string;
  descripcion: string;
  fecha: string;
  hora: string;
  medico: string;
}

interface DatoPacienteVista {
  etiqueta: string;
  valor: string;
}

@Component({
  selector: 'app-evaluacion',
  imports: [FormsModule, HistoriaClinica, Diagnostico, DatosPaciente],
  templateUrl: './evaluacion.html',
  styleUrl: './evaluacion.scss',
})
export class Evaluacion {
  // ------------------- ESTADO DE LA VISTA -------------------
  readonly maxCaracteres = 1000;

  /** Sección del episodio que se muestra en el área central de la pantalla. */
  seccionActiva = 'examen-fisico';
  sistemaSeleccionado = 'abdomen';

  /** La pestaña lateral del área de trabajo abre y cierra la ficha del paciente. */
  pacienteAbierto = false;

  /** El chevron del encabezado pliega el cuerpo de la ficha sin ocultar el título. */
  datosPacienteVisibles = true;

  /** Mientras está activo se representa el estado de carga del panel de hallazgos. */
  cargandoHallazgos = true;

  // ------------------- MOCK: datos temporales para diseño -------------------
  /** MOCK: identificación del paciente en la ficha. Se sustituirá por los datos reales. */
  datosPaciente: DatoPacienteVista[] = [
    { etiqueta: 'Expediente', valor: 'EXP-0241' },
    { etiqueta: 'Paciente', valor: 'Juan Pérez' },
  ];

  /** MOCK: datos de la atención vigente del paciente. */
  atencionPaciente: DatoPacienteVista[] = [
    { etiqueta: 'Tipo de atención', valor: 'Hospitalización' },
    { etiqueta: 'Fecha de ingreso', valor: '10-10-2026' },
    { etiqueta: 'Cama', valor: 'A-105' },
  ];

  /** MOCK: motivo de atención registrado en el episodio actual. */
  motivoAtencion = 'Dolor abdominal y vómitos';

  /** Arreglo vacío: en la maqueta representa que el paciente no tiene alergias registradas. */
  alergias: string[] = [];

  /** MOCK: últimas constantes vitales tomadas al paciente. */
  signosVitales: string[] = ['PA 120/80', 'FC 82', 'Temp 37.2 °C', 'SpO2 97%'];

  hallazgoActual =
    'Paciente consciente, orientado, en buen estado general, con signos vitales estables. ' +
    'Abdomen blando, depresible, con dolor a la palpación en epigastrio y mesogastrio, sin ' +
    'defensa ni rigidez. Ruidos intestinales presentes y normales. No datos de irritación ' +
    'peritoneal.';

  secciones: SeccionVista[] = [
    {
      id: 'historia-clinica',
      titulo: 'Historia clínica',
      descripcion: 'Antecedentes y padecimiento actual.',
      icono: 'bi-journal-medical',
    },
    {
      id: 'examen-fisico',
      titulo: 'Examen físico',
      descripcion: 'Valoración física por regiones.',
      icono: 'bi-heart-pulse',
    },
    {
      id: 'diagnostico',
      titulo: 'Diagnóstico',
      descripcion: 'Diagnóstico provisional y adicionales.',
      icono: 'bi-clipboard2-check',
    },
  ];

  sistemas: SistemaExamenVista[] = [
    { id: 'general', nombre: 'General' },
    { id: 'respiratorio', nombre: 'Respiratorio' },
    { id: 'cardiovascular', nombre: 'Cardiovascular' },
    { id: 'abdomen', nombre: 'Abdomen' },
    { id: 'neurologico', nombre: 'Neurológico' },
    { id: 'extremidades', nombre: 'Extremidades' },
    { id: 'otros', nombre: 'Otros' },
  ];

  hallazgos: HallazgoVista[] = [
    {
      id: 1,
      sistema: 'Abdomen',
      icono: 'bi-arrow-repeat',
      descripcion:
        'Abdomen blando y depresible, con dolor a la palpación en epigastrio y mesogastrio, ' +
        'sin defensa ni rigidez. Ruidos intestinales presentes y normales. Sin datos de ' +
        'irritación peritoneal.',
      fecha: '10-10-2026',
      hora: '10:35 AM',
      medico: 'Dr. Juan Pérez',
    },
  ];
  // ------------------- FIN MOCK -------------------

  // ------------------- CONSULTAS PARA LA VISTA -------------------
  /** Las secciones de historia clínica y diagnóstico muestran siempre el bloque de datos del paciente. */
  get seccionConDatosPaciente(): boolean {
    return this.seccionActiva !== 'examen-fisico';
  }

  /** Solo el examen físico registra hallazgos: las demás secciones no muestran el panel de hallazgos. */
  get mostrarHallazgos(): boolean {
    return this.seccionActiva === 'examen-fisico';
  }

  // ------------------- ACCIONES DE LA VISTA -------------------
  /**
   * Abre o cierra la ficha del paciente. Al abrirla se muestran los datos completos para que
   * el usuario vea la información de contexto aunque la hubiera plegado antes.
   */
  alternarDatosPaciente(): void {
    this.pacienteAbierto = !this.pacienteAbierto;

    if (this.pacienteAbierto) {
      this.datosPacienteVisibles = true;
    }
  }

  /** Pliega o despliega el cuerpo de la ficha desde el chevron del encabezado. */
  alternarCuerpoFicha(): void {
    this.datosPacienteVisibles = !this.datosPacienteVisibles;
  }

  /**
   * Cambia la sección del área central. La ficha plegable se cierra porque las secciones de historia
   * clínica y diagnóstico muestran su propio bloque de datos del paciente.
   */
  seleccionarSeccion(id: string): void {
    this.seccionActiva = id;
    this.pacienteAbierto = false;
  }

  seleccionarSistema(id: string): void {
    this.sistemaSeleccionado = id;
  }

  cancelarCaptura(): void {
    this.hallazgoActual = '';
  }

  // MOCK: la captura de hallazgos se conectará al backend en la fase de integración.
  guardarHallazgo(): void {}
}
