import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  TIPOS_DURACION,
  TipoDuracion,
  faltaDuracionEnDias,
} from '../../data/duracion';

/** Cuidado capturado para el tratamiento del alta médica. */
export interface CuidadoTratamiento {
  nombre: string;
  frecuencia: number | null;
  duracionTipo: TipoDuracion | '';
  duracionCantidad: number | null;
  observaciones: string;
}

/**
 * Formulario del cuidado que comparten las indicaciones médicas y el tratamiento del alta: captura
 * el nombre, la frecuencia, la duración y las observaciones, y entrega el cuidado a la pantalla que
 * lo contiene. Al cancelar solo avisa para que la pantalla decida qué hacer.
 */
@Component({
  selector: 'app-cuidado-indicacion',
  imports: [FormsModule],
  templateUrl: './cuidado-indicacion.html',
  styleUrl: './cuidado-indicacion.scss',
})
export class CuidadoIndicacion implements OnChanges {
  // ------------------- ESTADO DE LA VISTA -------------------
  nombre = '';
  frecuencia: number | null = null;
  duracionTipo: TipoDuracion | '' = '';
  duracionCantidad: number | null = null;
  observaciones = '';

  /** Tipos de duración que ofrece el desplegable. */
  readonly tiposDuracion = TIPOS_DURACION;

  // ------------------- ENTRADAS Y SALIDAS -------------------
  /** El título de la tarjeta se oculta cuando la pantalla ya lo muestra en sus pestañas. */
  @Input() mostrarTitulo = true;

  /** Cuidado que se carga en el formulario para corregirlo; null al capturar uno nuevo. */
  @Input() cuidadoInicial: CuidadoTratamiento | null = null;

  /** Cuidado capturado, listo para sumarse al tratamiento. */
  @Output() cuidadoAgregado = new EventEmitter<CuidadoTratamiento>();

  /** La captura se descartó. */
  @Output() cancelado = new EventEmitter<void>();

  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios['cuidadoInicial']) {
      this.cargarInicial(this.cuidadoInicial);
    }
  }

  // ------------------- CONSULTAS PARA LA VISTA -------------------
  /** El botón Guardar se habilita con el nombre escrito. */
  get hayCuidado(): boolean {
    return this.nombre.trim().length > 0;
  }

  /** La duración en días exige su cantidad. */
  get faltaDuracionEnDiasCuidado(): boolean {
    return faltaDuracionEnDias(this.duracionTipo, this.duracionCantidad);
  }

  /** El botón Guardar se habilita con la frecuencia y el tipo de duración resueltos. */
  get puedeGuardar(): boolean {
    return (
      this.hayCuidado &&
      !this.faltaDuracionEnDiasCuidado &&
      this.duracionTipo !== '' &&
      this.frecuencia !== null &&
      Number.isInteger(this.frecuencia) &&
      this.frecuencia > 0
    );
  }

  // ------------------- ACCIONES DE LA VISTA -------------------
  /** Entrega el cuidado capturado y deja el formulario listo para el siguiente. */
  agregarCuidado(): void {
    if (!this.puedeGuardar) {
      return;
    }

    this.cuidadoAgregado.emit({
      nombre: this.nombre.trim(),
      frecuencia: this.frecuencia,
      duracionTipo: this.duracionTipo,
      duracionCantidad: this.duracionTipo === 'dias' ? this.duracionCantidad : null,
      observaciones: this.observaciones.trim(),
    });

    this.limpiarFormulario();
  }

  /** Descarta la captura y avisa a la pantalla que contiene el formulario. */
  cancelarCaptura(): void {
    this.limpiarFormulario();
    this.cancelado.emit();
  }

  /** Deja el formulario listo para capturar un cuidado nuevo. */
  limpiarFormulario(): void {
    this.nombre = '';
    this.frecuencia = null;
    this.duracionTipo = '';
    this.duracionCantidad = null;
    this.observaciones = '';
  }

  // ------------------- APOYO -------------------
  /** Carga el cuidado que se va a editar o limpia el formulario al empezar una captura nueva. */
  private cargarInicial(cuidado: CuidadoTratamiento | null): void {
    if (!cuidado) {
      this.limpiarFormulario();
      return;
    }

    this.nombre = cuidado.nombre;
    this.frecuencia = cuidado.frecuencia;
    this.duracionTipo = cuidado.duracionTipo;
    this.duracionCantidad = cuidado.duracionCantidad;
    this.observaciones = cuidado.observaciones;
  }
}
