import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatosPaciente } from '../datos-paciente/datos-paciente';
import {
  MedicamentoIndicacion,
  MedicamentoTratamiento,
  textoDuracion,
} from '../indicaciones/medicamentos/medicamento-indicacion/medicamento-indicacion';

/* Tipos locales de la maqueta: se sustituirán por el contrato real del backend en la fase de integración. */
/** Motivos de egreso que ofrece la pantalla de alta médica. */
type SeccionAlta = 'indicacion-medica' | 'retiro-voluntario' | 'referencia-traslado';

/** Condiciones de egreso del desplegable del registro; vacía mientras no se elige ninguna. */
type CondicionEgreso = '' | 'mejorado' | 'estable' | 'sin-cambios' | 'empeorado' | 'fallecido';

interface SeccionVista {
  id: SeccionAlta;
  titulo: string;
  descripcion: string;
  icono: string;
}

/** Opción del desplegable de la condición de egreso: el valor que se registra y su etiqueta. */
interface OpcionVista {
  id: CondicionEgreso;
  nombre: string;
}

/**
 * Alta médica del episodio: pantalla del módulo Médico con las secciones del egreso del paciente
 * (alta por indicación médica, retiro voluntario y referencia o traslado) y el registro del egreso,
 * que es el mismo para las tres secciones: diagnóstico de egreso, condición de egreso y observación.
 * El panel de secciones marca el motivo de egreso elegido y la ficha con los datos del paciente
 * acompaña al registro, igual que en las demás pantallas del módulo. El botón Agregar tratamiento
 * deja su sitio al registro del egreso y muestra en su lugar la tarjeta de medicamentos: cada
 * medicamento que se guarda allí se suma al tratamiento que acompaña al egreso.
 */
@Component({
  selector: 'app-alta',
  imports: [FormsModule, DatosPaciente, MedicamentoIndicacion],
  templateUrl: './alta.html',
  styleUrl: './alta.scss',
})
export class Alta {
  // ------------------- ESTADO DE LA VISTA -------------------
  /** Sección del egreso elegida en el panel de secciones. */
  seccionActiva: SeccionAlta = 'indicacion-medica';

  /** Longitud máxima de la observación del egreso. */
  readonly maxCaracteres = 1000;

  /** Campos del registro del egreso: diagnóstico, condición y observación. */
  diagnosticoEgreso = '';
  condicionEgreso: CondicionEgreso = '';
  observacionEgreso = '';

  /**
   * La ficha con los datos del paciente acompaña al registro del egreso y su pestaña lateral la abre
   * y la cierra; se dibuja desplegada por defecto para que los datos queden a la vista.
   */
  pacienteAbierto = true;

  /** El cuerpo de la ficha del paciente está desplegado; el chevron de su encabezado lo pliega. */
  datosPacienteVisibles = true;

  /**
   * La tarjeta de medicamentos ocupa el lugar del registro del egreso: el botón Agregar tratamiento
   * la abre y al guardar un medicamento o al cancelar vuelve el registro del egreso.
   */
  mostrandoMedicamentos = false;

  /** Medicamentos agregados al tratamiento que acompaña al egreso del paciente. */
  tratamiento: MedicamentoTratamiento[] = [];

  // ------------------- MOCK: datos temporales para diseño -------------------
  /** Secciones del egreso del paciente, en el orden en que las muestra la pantalla. */
  secciones: SeccionVista[] = [
    {
      id: 'indicacion-medica',
      titulo: 'Alta por indicación médica',
      descripcion: 'Egreso indicado por el médico.',
      icono: 'bi-person',
    },
    {
      id: 'retiro-voluntario',
      titulo: 'Retiro voluntario',
      descripcion: 'Salida por decisión del paciente.',
      icono: 'bi-box-arrow-right',
    },
    {
      id: 'referencia-traslado',
      titulo: 'Referencia / traslado',
      descripcion: 'Traslado a otro centro o servicio.',
      icono: 'bi-arrow-left-right',
    },
  ];

  /** Condiciones de egreso que ofrece el desplegable del registro. */
  condicionesEgreso: OpcionVista[] = [
    { id: 'mejorado', nombre: 'Mejorado' },
    { id: 'estable', nombre: 'Estable' },
    { id: 'sin-cambios', nombre: 'Sin cambios' },
    { id: 'empeorado', nombre: 'Empeorado' },
    { id: 'fallecido', nombre: 'Fallecido' },
  ];
  // ------------------- FIN MOCK -------------------

  // ------------------- CONSULTAS PARA LA VISTA -------------------
  /** El botón Guardar solo se habilita cuando el registro lleva el diagnóstico de egreso. */
  get puedeGuardar(): boolean {
    return this.diagnosticoEgreso.trim().length > 0;
  }

  /**
   * Texto de la duración de un medicamento del tratamiento; el listado de lo agregado lo describe con
   * el mismo texto del formulario de la tarjeta de medicamentos.
   */
  protected readonly duracionDelMedicamento = textoDuracion;

  // ------------------- ACCIONES DE LA VISTA -------------------
  /** Marca la tarjeta pulsada como la sección del egreso elegida. */
  seleccionarSeccion(id: SeccionAlta): void {
    this.seccionActiva = id;
  }

  /** Deja el registro del egreso listo para capturarlo de nuevo. */
  cancelarCaptura(): void {
    this.diagnosticoEgreso = '';
    this.condicionEgreso = '';
    this.observacionEgreso = '';
  }

  /**
   * Abre o cierra la ficha con los datos del paciente desde la pestaña lateral del bloque
   * compartido, igual que en las demás pantallas del módulo. Al abrirla se muestran los datos
   * completos para que el usuario vea la información de contexto aunque la hubiera plegado antes.
   */
  cambiarFichaPaciente(abierto: boolean): void {
    this.pacienteAbierto = abierto;

    if (abierto) {
      this.datosPacienteVisibles = true;
    }
  }

  /**
   * Abre la tarjeta de medicamentos del tratamiento en el lugar del registro del egreso: el registro
   * deja de dibujarse mientras la tarjeta está a la vista.
   */
  agregarTratamiento(): void {
    this.mostrandoMedicamentos = true;
  }

  /** Descarta la captura del tratamiento y devuelve el registro del egreso sin agregar nada. */
  cancelarTratamiento(): void {
    this.mostrandoMedicamentos = false;
  }

  // MOCK: el tratamiento del egreso se guardará con el egreso en el backend en la fase de integración.
  /** Suma al tratamiento el medicamento capturado en la tarjeta y devuelve el registro del egreso. */
  registrarMedicamento(medicamento: MedicamentoTratamiento): void {
    this.tratamiento = [...this.tratamiento, medicamento];
    this.mostrandoMedicamentos = false;
  }

  /** Quita del tratamiento el medicamento indicado por su posición en el listado. */
  quitarMedicamento(indice: number): void {
    this.tratamiento = this.tratamiento.filter((_, posicion) => posicion !== indice);
  }

  // MOCK: el egreso se guardará en el backend en la fase de integración.
  guardarEgreso(): void {}
}
