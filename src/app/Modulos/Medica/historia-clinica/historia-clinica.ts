import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

/**
 * Historia clínica del episodio: sección de Evaluación clínica con un único cuadro de texto para
 * registrar el interrogatorio y los botones para habilitar la edición y para guardar.
 */
@Component({
  selector: 'app-historia-clinica',
  imports: [FormsModule],
  templateUrl: './historia-clinica.html',
  styleUrl: './historia-clinica.scss',
})
export class HistoriaClinica {
  // ------------------- ESTADO DE LA VISTA -------------------
  /** Mientras está activo el cuadro se puede escribir; si no, se muestra como texto de lectura. */
  modoEdicion = false;

  // ------------------- MOCK: datos temporales para diseño -------------------
  /** MOCK: historia clínica registrada del paciente. Se sustituirá por los datos reales. */
  historiaClinica =
    'Paciente masculino de 45 años, originario y residente del municipio. Antecedentes ' +
    'heredofamiliares: madre con hipertensión arterial. Antecedentes personales patológicos: ' +
    'hipertensión arterial en tratamiento con losartán de 50 mg cada 12 horas; sin antecedentes ' +
    'quirúrgicos. Niega alergias a medicamentos. Padecimiento actual: cuadro de dos días de ' +
    'evolución con dolor abdominal continuo en epigastrio y mesogastrio, acompañado de vómitos de ' +
    'contenido alimentario, sin fiebre ni diarrea. Acude por la persistencia del dolor y el mal ' +
    'estado general.';
  // ------------------- FIN MOCK -------------------

  // ------------------- ACCIONES DE LA VISTA -------------------
  /** Habilita la escritura en el cuadro de la historia clínica. */
  activarEdicion(): void {
    this.modoEdicion = true;
  }

  // MOCK: la historia clínica se guardará en el backend en la fase de integración. Por ahora solo
  // se cierra la edición conservando lo escrito.
  guardarHistoria(): void {
    this.modoEdicion = false;
  }
}
