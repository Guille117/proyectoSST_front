import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Paginacion } from '../../../shared/paginacion/paginacion';

/* Tipos locales de la maqueta: se sustituirán por el contrato real del backend en la fase de integración. */
/** Tipos de duración del tratamiento; el número de días solo se usa con el tipo «días». */
export type TipoDuracion = 'dias' | 'unica' | 'indefinida';

/** Medicamento del catálogo que devuelve la búsqueda: son las columnas de la tabla de resultados. */
export interface MedicamentoCatalogoVista {
  id: number;
  nombre: string;
  presentacion: string;
  administracion: string;
}

/** Medicamento indicado al paciente: lo que captura el formulario de la tarjeta. */
export interface MedicamentoTratamiento {
  nombre: string;
  cantidad: string;
  frecuencia: number | null;
  duracionTipo: TipoDuracion | '';
  duracionCantidad: number | null;
  observaciones: string;
}

/** Opción del desplegable del tipo de duración: el valor que se registra y su etiqueta. */
interface OpcionVista {
  id: TipoDuracion;
  nombre: string;
}

/** Tipos de duración del desplegable; con ellos se describe la duración de lo ya agregado. */
export const TIPOS_DURACION: OpcionVista[] = [
  { id: 'dias', nombre: 'Días' },
  { id: 'unica', nombre: 'Dosis única' },
  { id: 'indefinida', nombre: 'Por tiempo indefinido' },
];

/** Texto de la duración de un medicamento: sus días o el nombre del tipo elegido. */
export function textoDuracion(medicamento: MedicamentoTratamiento): string {
  if (medicamento.duracionTipo === 'dias') {
    return `${medicamento.duracionCantidad} días`;
  }

  return TIPOS_DURACION.find((opcion) => opcion.id === medicamento.duracionTipo)?.nombre ?? '';
}

/**
 * Tarjeta del bloque de medicamentos del tratamiento: busca el medicamento en el catálogo —con su
 * tabla de resultados paginada de cinco en cinco y su pie— y captura la cantidad, la frecuencia, la
 * duración y las observaciones. Al guardar entrega el medicamento a la pantalla que la abrió y al
 * cancelar le avisa para que vuelva a su formulario: la pantalla solo decide cuándo se muestra.
 */
@Component({
  selector: 'app-medicamento-indicacion',
  imports: [FormsModule, Paginacion],
  templateUrl: './medicamento-indicacion.html',
  styleUrl: './medicamento-indicacion.scss',
})
export class MedicamentoIndicacion {
  // ------------------- ESTADO DE LA VISTA -------------------
  /** Campos del formulario del medicamento. */
  medicamento = '';
  cantidad = '';
  frecuencia: number | null = null;
  duracionTipo: TipoDuracion | '' = '';
  duracionCantidad: number | null = null;
  observaciones = '';

  /** Medicamentos que devolvió la última búsqueda: alimentan la tabla de resultados del formulario. */
  medicamentosEncontrados: MedicamentoCatalogoVista[] = [];

  /**
   * La búsqueda está desplegada: la tarjeta muestra su buscador con la tabla de resultados y oculta
   * el resto de campos hasta que se elija un medicamento.
   */
  busquedaMedicamentoRealizada = false;

  /** Página de la tabla de resultados que se está viendo. */
  paginaMedicamentos = 1;

  /** Medicamentos que muestra cada página de la tabla de resultados. */
  readonly medicamentosPorPagina = 5;

  /** Medicamento del catálogo elegido para el tratamiento; null mientras no se elija ninguno. */
  medicamentoElegido: MedicamentoCatalogoVista | null = null;

  // ------------------- SALIDAS -------------------
  /** Medicamento capturado, con sus datos, para la pantalla que abrió la tarjeta. */
  @Output() medicamentoAgregado = new EventEmitter<MedicamentoTratamiento>();

  /** La captura se descartó: la pantalla que abrió la tarjeta vuelve a su formulario. */
  @Output() cancelado = new EventEmitter<void>();

  // ------------------- MOCK: datos temporales para diseño -------------------
  /** Tipos de duración que ofrece el desplegable de la duración. */
  tiposDuracion: OpcionVista[] = TIPOS_DURACION;

  /**
   * MOCK: catálogo de medicamentos que devolverá la búsqueda en la fase de integración. Cada
   * presentación del medicamento lleva su nombre, su presentación y la vía por la que se administra,
   * que son las columnas de la tabla de resultados del formulario.
   */
  catalogoMedicamentos: MedicamentoCatalogoVista[] = [
    {
      id: 1,
      nombre: 'Amoxicilina Bayer',
      presentacion: 'tabletas de 500 mg',
      administracion: 'Oral',
    },
    {
      id: 2,
      nombre: 'Amoxicilina Bayer',
      presentacion: 'suspensión inyectable de 500 mg',
      administracion: 'Intravenosa',
    },
    {
      id: 3,
      nombre: 'Paracetamol Genfar',
      presentacion: 'tabletas de 500 mg',
      administracion: 'Oral',
    },
    {
      id: 4,
      nombre: 'Ibuprofeno MK',
      presentacion: 'tabletas de 400 mg',
      administracion: 'Oral',
    },
    {
      id: 5,
      nombre: 'Omeprazol La Santé',
      presentacion: 'cápsulas de 20 mg',
      administracion: 'Oral',
    },
    {
      id: 6,
      nombre: 'Metoclopramida Genfar',
      presentacion: 'solución inyectable de 10 mg',
      administracion: 'Intravenosa',
    },
    {
      id: 7,
      nombre: 'Ketorolaco Eurofarma',
      presentacion: 'solución inyectable de 30 mg',
      administracion: 'Intramuscular',
    },
    {
      id: 8,
      nombre: 'Diclofenaco MK',
      presentacion: 'gel tópico al 1 %',
      administracion: 'Tópica',
    },
  ];
  // ------------------- FIN MOCK -------------------

  // ------------------- CONSULTAS PARA LA VISTA -------------------
  /** La tarjeta tiene un medicamento escrito. */
  get hayMedicamento(): boolean {
    return this.medicamento.trim().length > 0;
  }

  /** La duración en días obliga a indicar cuántos días dura el tratamiento. */
  get faltaDuracionEnDias(): boolean {
    return this.faltaDuracionEnDiasDe(this.duracionTipo, this.duracionCantidad);
  }

  /**
   * El botón Guardar se habilita con el medicamento escrito y la duración en días resuelta. Con la
   * tabla de resultados desplegada se espera a que se elija un medicamento.
   */
  get puedeGuardar(): boolean {
    return !this.busquedaMedicamentoRealizada && this.hayMedicamento && !this.faltaDuracionEnDias;
  }

  /** Filas de la página actual de la tabla de resultados. */
  get medicamentosDeLaPagina(): MedicamentoCatalogoVista[] {
    const inicio = (this.paginaMedicamentos - 1) * this.medicamentosPorPagina;

    return this.medicamentosEncontrados.slice(inicio, inicio + this.medicamentosPorPagina);
  }

  /** Número que le corresponde a la primera fila de la página actual de la tabla. */
  get numeroInicialDeLaPagina(): number {
    return (this.paginaMedicamentos - 1) * this.medicamentosPorPagina + 1;
  }

  /** Texto del medicamento elegido: su nombre, su presentación y su vía de administración. */
  get textoMedicamentoElegido(): string {
    const elegido = this.medicamentoElegido;

    return elegido
      ? `${elegido.nombre}, ${elegido.presentacion}, administración ${elegido.administracion.toLowerCase()}`
      : '';
  }

  /** Texto de la tabla de resultados cuando la búsqueda no encuentra medicamentos en el catálogo. */
  get mensajeSinMedicamentosEncontrados(): string {
    const termino = this.medicamento.trim();

    return termino
      ? `No se encontraron medicamentos que coincidan con «${termino}».`
      : 'El catálogo no tiene medicamentos para mostrar.';
  }

  // ------------------- ACCIONES DE LA VISTA -------------------
  /** Descripción del medicamento para la tabla de resultados: su nombre y su presentación. */
  descripcionMedicamento(opcion: MedicamentoCatalogoVista): string {
    return `${opcion.nombre} ${opcion.presentacion}`;
  }

  /**
   * MOCK: busca el medicamento escrito en el catálogo y muestra las coincidencias en la tabla de
   * resultados del formulario. La búsqueda sin texto lista el catálogo completo y la comparación
   * ignora mayúsculas y acentos. La consulta al backend llega en la fase de integración.
   */
  buscarMedicamento(): void {
    const termino = this.normalizarTexto(this.medicamento);

    this.busquedaMedicamentoRealizada = true;
    this.paginaMedicamentos = 1;

    this.medicamentosEncontrados = termino
      ? this.catalogoMedicamentos.filter((opcion) =>
          this.normalizarTexto(this.descripcionMedicamento(opcion)).includes(termino),
        )
      : [...this.catalogoMedicamentos];
  }

  /** Muestra otra página de la tabla de resultados. */
  seleccionarPaginaMedicamentos(pagina: number): void {
    this.paginaMedicamentos = pagina;
  }

  /**
   * Elige el medicamento pulsado en la tabla de resultados: su descripción queda registrada en el
   * formulario, el buscador con la tabla dejan su sitio al medicamento elegido y vuelven los campos.
   */
  seleccionarMedicamento(opcion: MedicamentoCatalogoVista): void {
    this.cerrarResultadosMedicamento();
    this.medicamento = this.descripcionMedicamento(opcion);
    this.medicamentoElegido = opcion;
  }

  /** Devuelve el formulario al buscador para elegir otro medicamento en lugar del elegido. */
  cambiarMedicamento(): void {
    this.medicamento = '';
    this.cerrarResultadosMedicamento();
    this.buscarMedicamento();
  }

  /** Cierra la tabla de resultados de la búsqueda y suelta el medicamento elegido. */
  cerrarResultadosMedicamento(): void {
    this.busquedaMedicamentoRealizada = false;
    this.paginaMedicamentos = 1;
    this.medicamentosEncontrados = [];
    this.medicamentoElegido = null;
  }

  /**
   * MOCK: entrega a la pantalla que abrió la tarjeta el medicamento capturado y deja el formulario
   * listo para el siguiente. El registro real del tratamiento lo hará el backend en la integración.
   */
  agregarMedicamento(): void {
    if (!this.puedeGuardar) {
      return;
    }

    this.medicamentoAgregado.emit({
      nombre: this.medicamento.trim(),
      cantidad: this.cantidad.trim(),
      frecuencia: this.frecuencia,
      duracionTipo: this.duracionTipo,
      // El número de días solo se guarda con el tipo «días»
      duracionCantidad: this.duracionTipo === 'dias' ? this.duracionCantidad : null,
      observaciones: this.observaciones.trim(),
    });

    this.limpiarFormulario();
  }

  /** Descarta la captura y avisa a la pantalla que abrió la tarjeta para que vuelva a su formulario. */
  cancelarCaptura(): void {
    this.limpiarFormulario();
    this.cancelado.emit();
  }

  /** Deja el formulario listo para capturar un medicamento nuevo. */
  limpiarFormulario(): void {
    this.medicamento = '';
    this.cantidad = '';
    this.frecuencia = null;
    this.duracionTipo = '';
    this.duracionCantidad = null;
    this.observaciones = '';
    this.cerrarResultadosMedicamento();
  }

  // ------------------- APOYO -------------------
  /** La duración en días solo está resuelta cuando se han escrito los días del tratamiento. */
  private faltaDuracionEnDiasDe(tipo: TipoDuracion | '', cantidad: number | null): boolean {
    return tipo === 'dias' && (cantidad ?? 0) <= 0;
  }

  /** Texto sin mayúsculas ni acentos, para comparar la búsqueda con el catálogo. */
  private normalizarTexto(texto: string): string {
    return texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }
}
