import { Component, EventEmitter, Input, Output } from '@angular/core';

/* Tipos locales de la maqueta: se sustituirán por el contrato real del backend en la fase de integración. */
interface DatoPacienteVista {
  etiqueta: string;
  valor: string;
}

/**
 * Ficha con los datos del paciente que acompaña a las pantallas del módulo Médico (evaluación
 * clínica, indicaciones médicas). Se dibuja pegada al borde derecho de la pantalla, desde la barra
 * superior hasta el borde inferior de la ventana, y tiene dos formas de uso:
 *
 * - Fija: el bloque se muestra siempre desplegado, sin pestaña ni controles para plegarlo.
 * - Plegable (plegable = true): una pestaña lateral lo abre y lo cierra y el chevron de su
 *   encabezado pliega el cuerpo dejando el título a la vista.
 *
 * El estado lo controla la pantalla que lo usa: recibe abierto y cuerpoVisible y avisa de los
 * cambios con abiertoCambia y cuerpoVisibleCambia, de modo que puede reservar el ancho del bloque y
 * plegarlo desde su propio código.
 */
@Component({
  selector: 'app-datos-paciente',
  imports: [],
  templateUrl: './datos-paciente.html',
  styleUrl: './datos-paciente.scss',
})
export class DatosPaciente {
  // ------------------- ESTADO DE LA VISTA -------------------
  /** El bloque se abre y se cierra desde su pestaña lateral en lugar de mostrarse siempre. */
  @Input() plegable = false;

  /** El bloque está desplegado: solo se dibuja cuando es verdadero. */
  @Input() abierto = true;

  /** Avisa del estado pedido desde la pestaña lateral del bloque plegable. */
  @Output() abiertoCambia = new EventEmitter<boolean>();

  /** El cuerpo con los datos está desplegado; el título de la ficha se ve siempre. */
  @Input() cuerpoVisible = true;

  /** Avisa del estado pedido desde el chevron del encabezado. */
  @Output() cuerpoVisibleCambia = new EventEmitter<boolean>();

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
  // ------------------- FIN MOCK -------------------

  // ------------------- ACCIONES DE LA VISTA -------------------
  /** Abre o cierra el bloque desde su pestaña lateral. */
  alternarFicha(): void {
    this.abiertoCambia.emit(!this.abierto);
  }

  /** Pliega o despliega el cuerpo del bloque desde el chevron de su encabezado. */
  alternarCuerpo(): void {
    this.cuerpoVisibleCambia.emit(!this.cuerpoVisible);
  }
}
