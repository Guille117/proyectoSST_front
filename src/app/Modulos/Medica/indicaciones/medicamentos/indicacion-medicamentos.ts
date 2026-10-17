import { NgClass } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Paginacion } from '../../../../shared/paginacion/paginacion';
import { PopUps } from '../../../../shared/popUps/popUpsService';
import {
  DuracionVista,
  TIPOS_DURACION,
  TipoDuracion,
  faltaDuracionEnDias as calcularFaltaDuracion,
  textoDuracion as describirDuracion,
} from '../data/duracion';

/* Tipos locales de la maqueta: se sustituirán por el contrato real del backend en la fase de integración. */
/** Colores de acento lateral de la tarjeta de la indicación; se reparten en ciclo al registrar. */
type TonoIndicacion = 'verde' | 'rojo' | 'naranja';

/** Estados en los que puede quedar una indicación registrada. */
type EstadoIndicacion = 'activa' | 'finalizada' | 'eliminada';

/** Filtros del listado de lo indicado: un estado concreto o «todas» las indicaciones vigentes. */
type FiltroIndicacion = 'todas' | 'activas' | 'finalizadas' | 'eliminadas';

interface IndicacionMedicamentoVista extends DuracionVista {
  id: number;
  nombre: string;
  /** Cantidad indicada con su unidad, por ejemplo «500 mg». */
  cantidad: string;
  /** Frecuencia indicada; el formulario solo admite números. */
  frecuencia: number | null;
  observaciones: string;
  fecha: string;
  hora: string;
  medico: string;
  estado: EstadoIndicacion;
  tono: TonoIndicacion;
}

/** Opción del filtro que decide qué indicaciones se muestran en el listado. */
interface FiltroIndicacionVista {
  id: FiltroIndicacion;
  etiqueta: string;
  /** Estado que muestra la opción; null cuando muestra las indicaciones vigentes. */
  estado: EstadoIndicacion | null;
}

/** Medicamento que devuelve la búsqueda: su nombre, su presentación y su vía de administración. */
interface MedicamentoCatalogoVista {
  id: number;
  /** Nombre del medicamento con su laboratorio, por ejemplo «Amoxicilina Bayer». */
  nombre: string;
  /** Presentación con su concentración, por ejemplo «tabletas de 500 mg». */
  presentacion: string;
  /** Vía de administración del medicamento: «Oral», «Intravenosa», etc. */
  administracion: string;
}

/**
 * Sección de medicamentos de las indicaciones médicas: registro de la indicación con la búsqueda del
 * medicamento en el catálogo y listado de los medicamentos indicados en el episodio.
 */
@Component({
  selector: 'app-indicacion-medicamentos',
  imports: [FormsModule, NgClass, Paginacion],
  templateUrl: './indicacion-medicamentos.html',
  styleUrl: './indicacion-medicamentos.scss',
  host: {
    '(document:click)': 'cerrarMenuAlClicFuera($event)',
  },
})
export class IndicacionMedicamentos {
  private readonly popUps = inject(PopUps);

  // ------------------- ESTADO DE LA VISTA -------------------
  /** Campos del formulario de la indicación. */
  medicamento = '';
  cantidad = '';
  frecuencia: number | null = null;
  duracionTipo: TipoDuracion | '' = '';
  duracionCantidad: number | null = null;
  observaciones = '';

  /** Medicamentos que devolvió la última búsqueda: alimentan la tabla de resultados del formulario. */
  medicamentosEncontrados: MedicamentoCatalogoVista[] = [];

  /**
   * La búsqueda está desplegada: el formulario muestra su buscador con la tabla de resultados y oculta
   * el resto de campos hasta que se elija un medicamento.
   */
  busquedaMedicamentoRealizada = false;

  /** Página de la tabla de resultados que se está viendo. */
  paginaMedicamentos = 1;

  /** Medicamentos que muestra cada página de la tabla de resultados. */
  readonly medicamentosPorPagina = 5;

  /** Medicamento del catálogo elegido para la indicación; null mientras no se elija ninguno. */
  medicamentoElegido: MedicamentoCatalogoVista | null = null;

  /** Tarjeta del listado con su menú desplegado; null si no hay ninguna. */
  menuIndicacionAbierta: number | null = null;

  /** Indicación cuyos datos están cargados en el formulario; null al capturar una nueva. */
  indicacionEnEdicion: number | null = null;

  // ------------------- MOCK: datos temporales para diseño -------------------
  /** Tipos de duración que ofrece el desplegable de la duración. */
  tiposDuracion = TIPOS_DURACION;

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

  /** Colores de acento de las tarjetas de lo indicado: se reparten en ciclo al registrar. */
  private readonly tonos: TonoIndicacion[] = ['verde', 'rojo', 'naranja'];

  /** MOCK: medicamentos indicados en el episodio actual, con los estados del filtro del listado. */
  indicaciones: IndicacionMedicamentoVista[] = [
    {
      id: 1,
      nombre: 'Paracetamol 500 mg',
      cantidad: '500 mg',
      frecuencia: 8,
      duracionTipo: 'dias',
      duracionCantidad: 5,
      observaciones: 'En caso de fiebre o dolor.',
      fecha: '10/10/2026',
      hora: '09:15',
      medico: 'Dr. Gómez',
      estado: 'activa',
      tono: 'naranja',
    },
    {
      id: 2,
      nombre: 'Omeprazol 40 mg',
      cantidad: '40 mg',
      frecuencia: 24,
      duracionTipo: 'dias',
      duracionCantidad: 7,
      observaciones: 'Administrar 30 minutos antes del desayuno.',
      fecha: '10/10/2026',
      hora: '09:20',
      medico: 'Dr. Gómez',
      estado: 'activa',
      tono: 'verde',
    },
    {
      id: 3,
      nombre: 'Metoclopramida 10 mg',
      cantidad: '10 mg',
      frecuencia: 8,
      duracionTipo: 'dias',
      duracionCantidad: 3,
      observaciones: 'En caso de náuseas o vómitos.',
      fecha: '10/10/2026',
      hora: '09:22',
      medico: 'Dr. Gómez',
      estado: 'finalizada',
      tono: 'rojo',
    },
    {
      id: 4,
      nombre: 'Suero fisiológico 0.9%',
      cantidad: '1000 ml',
      frecuencia: 12,
      duracionTipo: 'dias',
      duracionCantidad: 2,
      observaciones: 'Mantener hidratación.',
      fecha: '10/10/2026',
      hora: '09:25',
      medico: 'Dr. Gómez',
      estado: 'activa',
      tono: 'naranja',
    },
    {
      id: 5,
      nombre: 'Ketorolaco 30 mg',
      cantidad: '30 mg',
      frecuencia: 8,
      duracionTipo: 'dias',
      duracionCantidad: 3,
      observaciones: 'Registrada por error en el episodio.',
      fecha: '09/10/2026',
      hora: '16:40',
      medico: 'Dra. Herrera',
      estado: 'eliminada',
      tono: 'rojo',
    },
  ];
  // ------------------- FIN MOCK -------------------

  // ------------------- FILTROS DEL LISTADO -------------------
  /** Filtro elegido para el listado de lo indicado; abre mostrando las indicaciones vigentes. */
  filtroIndicacion: FiltroIndicacion = 'todas';

  /** Opciones del filtro: los estados de la indicación y «Todas», que deja fuera las eliminadas. */
  readonly filtrosIndicacion: FiltroIndicacionVista[] = [
    { id: 'todas', etiqueta: 'Todas', estado: null },
    { id: 'activas', etiqueta: 'Activas', estado: 'activa' },
    { id: 'finalizadas', etiqueta: 'Finalizadas', estado: 'finalizada' },
    { id: 'eliminadas', etiqueta: 'Eliminadas', estado: 'eliminada' },
  ];

  /** Muestra el estado elegido y suelta lo que dependía del listado anterior. */
  seleccionarFiltroIndicacion(filtro: FiltroIndicacion): void {
    this.filtroIndicacion = filtro;
    this.cerrarMenuIndicacion();

    const sigueEnElListado = this.indicacionesFiltradas.some(
      (indicacion) => indicacion.id === this.indicacionEnEdicion,
    );

    // La indicación en edición no puede quedar fuera del listado visible
    if (this.indicacionEnEdicion !== null && !sigueEnElListado) {
      this.limpiarFormulario();
    }
  }

  // ------------------- CONSULTAS PARA LA VISTA -------------------
  /** El botón Guardar solo se habilita cuando hay un medicamento escrito. */
  get hayMedicamento(): boolean {
    return this.medicamento.trim().length > 0;
  }

  /** La duración en días obliga a indicar cuántos días dura el tratamiento. */
  get faltaDuracionEnDias(): boolean {
    return calcularFaltaDuracion(this.duracionTipo, this.duracionCantidad);
  }

  /**
   * El botón Guardar se habilita con el medicamento escrito y la duración en días resuelta. Con la
   * tabla de resultados desplegada se espera a que se elija un medicamento.
   */
  get puedeGuardar(): boolean {
    return !this.busquedaMedicamentoRealizada && this.hayMedicamento && !this.faltaDuracionEnDias;
  }

  /** Indicaciones que muestra el listado con el filtro elegido; «Todas» deja fuera las eliminadas. */
  get indicacionesFiltradas(): IndicacionMedicamentoVista[] {
    const estado = this.filtroActual.estado;

    return this.indicaciones.filter((indicacion) =>
      estado === null ? indicacion.estado !== 'eliminada' : indicacion.estado === estado,
    );
  }

  /** Texto del listado cuando el filtro elegido no tiene indicaciones. */
  get mensajeSinIndicaciones(): string {
    const filtro = this.filtroActual;

    return filtro.estado === null
      ? 'Aún no hay medicamentos indicados para el paciente.'
      : `No hay indicaciones ${filtro.etiqueta.toLowerCase()}.`;
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

  /** Texto de la duración que muestra la tarjeta. */
  textoDuracion(registro: DuracionVista): string {
    return describirDuracion(registro);
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
   * Elige el medicamento pulsado en la tabla de resultados: su descripción queda registrada en la
   * indicación y el buscador con la tabla dejan su sitio al medicamento elegido y al resto del
   * formulario.
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

  /** Muestra u oculta el menú de opciones de la tarjeta pulsada. */
  alternarMenuIndicacion(id: number): void {
    this.menuIndicacionAbierta = this.menuIndicacionAbierta === id ? null : id;
  }

  /** Cierra el menú de opciones que esté desplegado. */
  cerrarMenuIndicacion(): void {
    this.menuIndicacionAbierta = null;
  }

  /** Cierra el menú al pulsar fuera de la tarjeta que lo tiene abierto, como en el listado de camas. */
  cerrarMenuAlClicFuera(evento: Event): void {
    if (this.menuIndicacionAbierta === null || !(evento.target instanceof Element)) {
      return;
    }

    const tarjeta = evento.target.closest<HTMLElement>('.indicacion-card');
    // Cada tarjeta del listado lleva el identificador de su indicación
    const tarjetaAbierta = tarjeta?.dataset['indicacionId'];

    if (tarjetaAbierta !== String(this.menuIndicacionAbierta)) {
      this.cerrarMenuIndicacion();
    }
  }

  /** Carga en el formulario la indicación elegida para corregirla. */
  editarIndicacion(indicacion: IndicacionMedicamentoVista): void {
    this.indicacionEnEdicion = indicacion.id;
    this.medicamento = indicacion.nombre;
    this.cantidad = indicacion.cantidad;
    this.frecuencia = indicacion.frecuencia;
    this.duracionTipo = indicacion.duracionTipo;
    this.duracionCantidad = indicacion.duracionCantidad;
    this.observaciones = indicacion.observaciones;
    this.cerrarResultadosMedicamento();
  }

  /** Deja el formulario listo para capturar una indicación nueva. */
  limpiarFormulario(): void {
    this.medicamento = '';
    this.cantidad = '';
    this.frecuencia = null;
    this.duracionTipo = '';
    this.duracionCantidad = null;
    this.observaciones = '';
    this.indicacionEnEdicion = null;
    this.cerrarResultadosMedicamento();
  }

  /**
   * MOCK: registra la indicación escrita. Si hay una tarjeta en edición se reemplazan sus datos
   * conservando la fecha, la hora y el médico originales; si no, se agrega al final del listado. En
   * ambos casos el formulario queda limpio para la siguiente captura. La fecha, la hora y el médico
   * reales los aportará el backend en la integración.
   */
  agregarIndicacion(): void {
    const nombre = this.medicamento.trim();

    // Con la tabla de resultados desplegada todavía no hay medicamento elegido que registrar
    if (!nombre || this.faltaDuracionEnDias || this.busquedaMedicamentoRealizada) {
      return;
    }

    const datos = {
      nombre,
      cantidad: this.cantidad.trim(),
      frecuencia: this.frecuencia,
      duracionTipo: this.duracionTipo,
      // El número de días solo se guarda con el tipo «días»
      duracionCantidad: this.duracionTipo === 'dias' ? this.duracionCantidad : null,
      observaciones: this.observaciones.trim(),
    };

    if (this.indicacionEnEdicion !== null) {
      const idEditado = this.indicacionEnEdicion;

      this.indicaciones = this.indicaciones.map((registrada) =>
        registrada.id === idEditado ? { ...registrada, ...datos } : registrada,
      );
    } else {
      const ultimoId = this.indicaciones.reduce(
        (mayor, registrada) => Math.max(mayor, registrada.id),
        0,
      );

      this.indicaciones = [
        ...this.indicaciones,
        {
          id: ultimoId + 1,
          ...datos,
          estado: 'activa',
          tono: this.tonoSiguiente(),
          fecha: '10/10/2026',
          hora: '09:30',
          medico: 'Dr. Gómez',
        },
      ];
    }

    this.limpiarFormulario();
  }

  /**
   * MOCK: la eliminación se confirma con el popup global y la indicación pasa al estado eliminada, de
   * modo que sale del listado vigente y queda disponible en el filtro «Eliminadas».
   */
  async eliminarIndicacion(indicacion: IndicacionMedicamentoVista): Promise<void> {
    this.cerrarMenuIndicacion();

    const confirmado = await this.popUps
      .confirmarToast(`¿Está seguro de eliminar la indicación "${indicacion.nombre}"?`)
      .catch(() => false);

    if (!confirmado) {
      return;
    }

    if (this.indicacionEnEdicion === indicacion.id) {
      this.limpiarFormulario();
    }

    this.indicaciones = this.indicaciones.map<IndicacionMedicamentoVista>((registrada) =>
      registrada.id === indicacion.id ? { ...registrada, estado: 'eliminada' } : registrada,
    );
  }

  /** Color de acento que le corresponde a la siguiente indicación registrada. */
  private tonoSiguiente(): TonoIndicacion {
    return this.tonos[this.indicaciones.length % this.tonos.length];
  }

  /** Opción del filtro elegida en el listado. */
  private get filtroActual(): FiltroIndicacionVista {
    return (
      this.filtrosIndicacion.find((filtro) => filtro.id === this.filtroIndicacion) ??
      this.filtrosIndicacion[0]
    );
  }

  /** Texto sin acentos, sin espacios sobrantes y en minúsculas para comparar la búsqueda. */
  private normalizarTexto(texto: string): string {
    return texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }
}
