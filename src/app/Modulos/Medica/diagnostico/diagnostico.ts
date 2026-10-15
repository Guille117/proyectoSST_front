import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PopUps } from '../../../shared/popUps/popUpsService';

/* Tipos locales de la maqueta: se sustituirán por el contrato real del backend en la fase de integración. */
interface TipoDiagnosticoVista {
  id: string;
  nombre: string;
}

interface DiagnosticoAdicionalVista {
  id: number;
  tipo: TipoDiagnosticoVista;
  descripcion: string;
}

/**
 * Diagnóstico del episodio: sección de Evaluación clínica con el registro del diagnóstico principal
 * y de los diagnósticos adicionales.
 */
@Component({
  selector: 'app-diagnostico',
  imports: [FormsModule],
  templateUrl: './diagnostico.html',
  styleUrl: './diagnostico.scss',
})
export class Diagnostico {
  private readonly popUps = inject(PopUps);

  // ------------------- ESTADO DE LA VISTA -------------------
  /** Tipo que se aplicará al diagnóstico escrito en el campo. */
  tipoSeleccionado: TipoDiagnosticoVista;

  /** Fila del listado en edición; null cuando lo escrito se agregará como diagnóstico nuevo. */
  diagnosticoEnEdicion: number | null = null;

  // ------------------- MOCK: datos temporales para diseño -------------------
  /** MOCK: diagnóstico principal del episodio. Se sustituirá por los datos reales. */
  diagnostico = 'Gastroenteritis aguda de probable origen infeccioso';

  /** Tipos de diagnóstico que se pueden asignar. */
  readonly tipoPrincipal: TipoDiagnosticoVista = { id: 'principal', nombre: 'Principal' };

  tiposDiagnostico: TipoDiagnosticoVista[] = [
    this.tipoPrincipal,
    { id: 'secundario', nombre: 'Secundario' },
    { id: 'asociado', nombre: 'Asociado' },
  ];

  /** MOCK: diagnósticos adicionales registrados en el episodio. */
  diagnosticosAdicionales: DiagnosticoAdicionalVista[] = [
    {
      id: 1,
      tipo: { id: 'secundario', nombre: 'Secundario' },
      descripcion: 'Deshidratación leve',
    },
    { id: 2, tipo: { id: 'asociado', nombre: 'Asociado' }, descripcion: 'Hipertensión arterial' },
  ];

  // ------------------- FIN MOCK -------------------

  constructor() {
    this.tipoSeleccionado = this.tipoPrincipal;
  }

  // ------------------- CONSULTAS PARA LA VISTA -------------------
  /** El botón Guardar solo se habilita cuando hay algo que registrar: lo escrito o los adicionales. */
  get hayDiagnostico(): boolean {
    return this.diagnostico.trim().length > 0 || this.diagnosticosAdicionales.length > 0;
  }

  // ------------------- ACCIONES DE LA VISTA -------------------
  seleccionarTipo(tipo: TipoDiagnosticoVista): void {
    this.tipoSeleccionado = tipo;
  }

  // MOCK: la búsqueda en el catálogo de diagnósticos se conectará al backend en la fase de integración.
  buscarDiagnostico(): void {}

  /**
   * MOCK: agrega lo escrito al listado de diagnósticos adicionales. Si hay una fila en edición se
   * reemplazan sus datos en lugar de agregar una nueva y, en ambos casos, el campo queda vacío para
   * la siguiente captura.
   */
  agregarDiagnostico(): void {
    const descripcion = this.diagnostico.trim();

    if (!descripcion) {
      return;
    }

    if (this.diagnosticoEnEdicion !== null) {
      const idEditado = this.diagnosticoEnEdicion;

      this.diagnosticosAdicionales = this.diagnosticosAdicionales.map((adicional) =>
        adicional.id === idEditado
          ? { ...adicional, tipo: this.tipoSeleccionado, descripcion }
          : adicional,
      );
      this.diagnosticoEnEdicion = null;
    } else {
      const ultimoId = this.diagnosticosAdicionales.reduce(
        (mayor, adicional) => Math.max(mayor, adicional.id),
        0,
      );

      this.diagnosticosAdicionales = [
        ...this.diagnosticosAdicionales,
        { id: ultimoId + 1, tipo: this.tipoSeleccionado, descripcion },
      ];
    }

    this.diagnostico = '';
  }

  /** Carga la fila elegida en el formulario para corregirla. */
  editarDiagnostico(adicional: DiagnosticoAdicionalVista): void {
    this.diagnosticoEnEdicion = adicional.id;
    this.diagnostico = adicional.descripcion;
    this.tipoSeleccionado = adicional.tipo;
  }

  // MOCK: la eliminación se confirma con el popup global y solo quita la fila de la maqueta.
  async eliminarDiagnostico(adicional: DiagnosticoAdicionalVista): Promise<void> {
    const confirmado = await this.popUps
      .confirmarToast(`¿Está seguro de eliminar el diagnóstico "${adicional.descripcion}"?`)
      .catch(() => false);

    if (!confirmado) {
      return;
    }

    this.diagnosticosAdicionales = this.diagnosticosAdicionales.filter(
      (registrado) => registrado.id !== adicional.id,
    );

    if (this.diagnosticoEnEdicion === adicional.id) {
      this.diagnosticoEnEdicion = null;
    }
  }

  /** Deja el formulario listo para capturar un diagnóstico nuevo. */
  cancelarCaptura(): void {
    this.diagnostico = '';
    this.tipoSeleccionado = this.tipoPrincipal;
    this.diagnosticoEnEdicion = null;
  }

  // MOCK: el diagnóstico se guardará en el backend en la fase de integración.
  guardarDiagnostico(): void {}
}
