import { Component } from '@angular/core';

/* Tipos locales de la maqueta: se sustituirán por el contrato real del backend en la fase de integración. */
interface DatoPacienteVista {
  etiqueta: string;
  valor: string;
}

/**
 * Bloque con los datos del paciente que acompaña a las pantallas del módulo Médico. Se muestra
 * siempre desplegado y pegado al borde derecho de la pantalla: no tiene control para plegarlo ni
 * para ocultarlo.
 */
@Component({
  selector: 'app-datos-paciente',
  imports: [],
  templateUrl: './datos-paciente.html',
  styleUrl: './datos-paciente.scss',
})
export class DatosPaciente {
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
}
