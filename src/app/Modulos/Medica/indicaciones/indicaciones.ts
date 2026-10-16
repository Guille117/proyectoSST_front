import { NgClass } from '@angular/common';
import { Component, ElementRef, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ArchivoSeleccionado, ResultadoArchivo } from '../../../shared/archivos/archivoInterfaz';
import { ArchivoService } from '../../../shared/archivos/archivoService';
import { Paginacion } from '../../../shared/paginacion/paginacion';
import { PopUps } from '../../../shared/popUps/popUpsService';
import { DatosPaciente } from '../datos-paciente/datos-paciente';

/* Tipos locales de la maqueta: se sustituirán por el contrato real del backend en la fase de integración. */
/** Secciones del rail de indicaciones: la maqueta desarrolla medicamentos, exámenes y cuidados. */
type SeccionIndicacion = 'medicamentos' | 'examenes' | 'cuidados';

interface SeccionVista {
  id: SeccionIndicacion;
  titulo: string;
  icono: string;
  /** Secciones que la maqueta tiene desarrolladas; las pendientes se listan pero no se abren. */
  desarrollada: boolean;
}

interface OpcionVista {
  id: string;
  nombre: string;
}

/** Colores de acento lateral de la tarjeta de la indicación; se reparten en ciclo al registrar. */
type TonoIndicacion = 'verde' | 'rojo' | 'naranja';

/** Estados en los que puede quedar una indicación registrada. */
type EstadoIndicacion = 'activa' | 'finalizada' | 'eliminada';

/** Estados en los que puede quedar un cuidado indicado. */
type EstadoCuidado = 'enProceso' | 'completado' | 'eliminado';

/** Estados en los que puede quedar un examen indicado. */
type EstadoExamen = 'activo' | 'eliminado';

/** Filtros del listado de lo indicado: un estado concreto o «todas» las indicaciones vigentes. */
type FiltroIndicacion = 'todas' | 'activas' | 'finalizadas' | 'eliminadas';

/** Filtros del listado de cuidados: un estado concreto o «todas» los cuidados vigentes. */
type FiltroCuidado = 'todas' | 'completados' | 'enProceso' | 'eliminados';

/** Tipos de duración del tratamiento; el número de días solo se usa con el tipo «días». */
type TipoDuracion = 'dias' | 'unica' | 'indefinida';

/** Duración de un registro con tratamiento: lo que elige el formulario y muestra la tarjeta. */
interface DuracionVista {
  /** Tipo de duración elegido; vacío cuando el registro no la precisa. */
  duracionTipo: TipoDuracion | '';
  /** Días escritos en el formulario; solo se usan con el tipo «días». */
  duracionCantidad: number | null;
}

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

/** Examen indicado al paciente con su nombre, su observación, su adjunto y su disponibilidad. */
interface ExamenVista {
  id: number;
  nombre: string;
  observacion: string;
  /** Imagen o PDF adjunto al indicar el examen; null cuando el examen no lleva archivo. */
  archivo: ArchivoSeleccionado | null;
  /** El examen disponible se lista con el borde verde y el ojo de la esquina inferior derecha. */
  disponible: boolean;
  /** Estado del registro: los eliminados solo se listan con el filtro «Eliminados». */
  estado: EstadoExamen;
}

/** Cuidado indicado al paciente: su nombre, su frecuencia, su duración y sus observaciones. */
interface CuidadoVista extends DuracionVista {
  id: number;
  nombre: string;
  /** Frecuencia indicada; el formulario solo admite números. */
  frecuencia: number | null;
  observaciones: string;
  fecha: string;
  hora: string;
  medico: string;
  /** Estado del registro: los eliminados solo se listan con el filtro «Eliminadas». */
  estado: EstadoCuidado;
}

/** Opción del filtro que decide qué indicaciones se muestran en el listado. */
interface FiltroIndicacionVista {
  id: FiltroIndicacion;
  etiqueta: string;
  /** Estado que muestra la opción; null cuando muestra las indicaciones vigentes. */
  estado: EstadoIndicacion | null;
}

/** Opción del filtro que decide qué cuidados se muestran en el listado. */
interface FiltroCuidadoVista {
  id: FiltroCuidado;
  etiqueta: string;
  /** Estado que muestra la opción; null cuando muestra los cuidados vigentes. */
  estado: EstadoCuidado | null;
}

/** Filtros del listado de exámenes: su disponibilidad, «todos» los vigentes o los eliminados. */
type FiltroExamen = 'todos' | 'disponibles' | 'noDisponibles' | 'eliminados';

interface FiltroExamenVista {
  id: FiltroExamen;
  etiqueta: string;
  /** Disponibilidad que muestra la opción; null cuando no filtra por disponibilidad. */
  disponible: boolean | null;
  /** La opción lista los exámenes eliminados en lugar de los vigentes. */
  eliminados: boolean;
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
 * Indicaciones médicas del episodio: pantalla del módulo Médico que registra las indicaciones de
 * medicamentos, de exámenes y los cuidados del paciente. El rail de secciones muestra la estructura
 * completa del submenú y conmuta el área central entre las secciones que la maqueta tiene
 * desarrolladas.
 */
@Component({
  selector: 'app-indicaciones',
  imports: [FormsModule, NgClass, DatosPaciente, Paginacion],
  templateUrl: './indicaciones.html',
  styleUrl: './indicaciones.scss',
  host: {
    '(document:click)': 'cerrarMenuAlClicFuera($event)',
  },
})
export class Indicaciones {
  private readonly popUps = inject(PopUps);

  /** Tratamiento global de los archivos adjuntos: valida el formato y el peso y describe el archivo. */
  protected readonly archivos = inject(ArchivoService);

  /** Input de archivo del formulario del examen; se vacía al limpiar el formulario. */
  @ViewChild('archivoExamenInput') private inputArchivoExamen?: ElementRef<HTMLInputElement>;

  // ------------------- ESTADO DE LA VISTA -------------------
  /** Sección del rail que se muestra en el área central: su registro y su listado. */
  seccionActiva: SeccionIndicacion = 'medicamentos';

  /** La ficha con los datos del paciente está desplegada; la abre su pestaña lateral. */
  pacienteAbierto = false;

  /** El cuerpo de la ficha del paciente está desplegado; el chevron de su encabezado lo pliega. */
  datosPacienteVisibles = true;

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

  /** Campos del formulario del examen: solo su nombre es obligatorio. */
  nombreExamen = '';
  observacionExamen = '';

  /** Imagen o PDF adjunto al examen que se está capturando; es opcional. */
  archivoExamen: ArchivoSeleccionado | null = null;

  /** Campos del formulario del cuidado: nombre, frecuencia, duración y observaciones. */
  nombreCuidado = '';
  frecuenciaCuidado: number | null = null;
  duracionTipoCuidado: TipoDuracion | '' = '';
  duracionCantidadCuidado: number | null = null;
  observacionesCuidado = '';

  /** Tarjeta del listado (indicación o examen) con su menú desplegado; null si no hay ninguno. */
  menuIndicacionAbierta: number | null = null;

  /** Indicación cuyos datos están cargados en el formulario; null al capturar una nueva. */
  indicacionEnEdicion: number | null = null;

  /** Examen cuyos datos están cargados en el formulario; null al capturar un examen nuevo. */
  examenEnEdicion: number | null = null;

  /** Cuidado cuyos datos están cargados en el formulario; null al capturar un cuidado nuevo. */
  cuidadoEnEdicion: number | null = null;

  // ------------------- MOCK: datos temporales para diseño -------------------
  /** Secciones del rail de indicaciones; las tres están desarrolladas en la maqueta. */
  secciones: SeccionVista[] = [
    {
      id: 'medicamentos',
      titulo: 'Medicamentos',
      icono: 'bi-capsule',
      desarrollada: true,
    },
    {
      id: 'examenes',
      titulo: 'Exámenes',
      icono: 'bi-clipboard2-pulse',
      desarrollada: true,
    },
    {
      id: 'cuidados',
      titulo: 'Cuidados',
      icono: 'bi-heart-pulse',
      desarrollada: true,
    },
  ];

  /** Tipos de duración que ofrece el desplegable de la duración. */
  tiposDuracion: OpcionVista[] = [
    { id: 'dias', nombre: 'Días' },
    { id: 'unica', nombre: 'Dosis única' },
    { id: 'indefinida', nombre: 'Por tiempo indefinido' },
  ];

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

  /** Colores de acento de las tarjetas de cuidados: el borde describe el estado del cuidado. */
  private readonly tonosCuidado: Record<EstadoCuidado, TonoIndicacion> = {
    completado: 'verde',
    enProceso: 'naranja',
    eliminado: 'rojo',
  };

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

  /** MOCK: exámenes indicados en el episodio actual, con la disponibilidad que filtra el listado. */
  examenes: ExamenVista[] = [
    {
      id: 1,
      nombre: 'Hemograma completo',
      observacion: 'Tomar la muestra en ayunas.',
      archivo: null,
      disponible: true,
      estado: 'activo',
    },
    {
      id: 2,
      nombre: 'Glucosa en ayunas',
      observacion: 'Reportar el resultado al médico de turno.',
      archivo: null,
      disponible: true,
      estado: 'activo',
    },
    {
      id: 3,
      nombre: 'Radiografía de tórax',
      observacion: 'Adjuntar la placa anterior para comparar.',
      archivo: null,
      disponible: false,
      estado: 'activo',
    },
    {
      id: 4,
      nombre: 'Urocultivo',
      observacion: 'Muestra de la primera micción del día.',
      archivo: null,
      disponible: false,
      estado: 'activo',
    },
    {
      id: 5,
      nombre: 'Perfil tiroideo',
      observacion: 'Examen duplicado en la orden.',
      archivo: null,
      disponible: false,
      estado: 'eliminado',
    },
  ];

  /** MOCK: cuidados indicados en el episodio actual, con los estados del filtro del listado. */
  cuidados: CuidadoVista[] = [
    {
      id: 1,
      nombre: 'Cambio de posición',
      frecuencia: 2,
      duracionTipo: 'dias',
      duracionCantidad: 5,
      observaciones: 'Alternar decúbito lateral y evitar apoyar la zona de la úlcera.',
      fecha: '10/10/2026',
      hora: '09:15',
      medico: 'Dr. Gómez',
      estado: 'enProceso',
    },
    {
      id: 2,
      nombre: 'Control de signos vitales',
      frecuencia: 4,
      duracionTipo: 'dias',
      duracionCantidad: 3,
      observaciones: 'Registrar la saturación y la temperatura en cada control.',
      fecha: '10/10/2026',
      hora: '09:20',
      medico: 'Dr. Gómez',
      estado: 'enProceso',
    },
    {
      id: 3,
      nombre: 'Balance hídrico estricto',
      frecuencia: 24,
      duracionTipo: 'dias',
      duracionCantidad: 2,
      observaciones: 'Medir la diuresis y anotar los ingresos de cada turno.',
      fecha: '10/10/2026',
      hora: '09:24',
      medico: 'Dr. Gómez',
      estado: 'enProceso',
    },
    {
      id: 4,
      nombre: 'Curación de herida',
      frecuencia: 12,
      duracionTipo: 'dias',
      duracionCantidad: 5,
      observaciones: 'Lavar con solución fisiológica y cubrir con gasa estéril.',
      fecha: '10/10/2026',
      hora: '09:28',
      medico: 'Dr. Gómez',
      estado: 'completado',
    },
    {
      id: 5,
      nombre: 'Vigilancia de diuresis',
      frecuencia: 8,
      duracionTipo: 'indefinida',
      duracionCantidad: null,
      observaciones: 'Cuidado duplicado en la orden.',
      fecha: '09/10/2026',
      hora: '16:40',
      medico: 'Dra. Herrera',
      estado: 'eliminado',
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

  /** Filtro elegido para el listado de exámenes; abre mostrando todos los exámenes indicados. */
  filtroExamen: FiltroExamen = 'todos';

  /** Opciones del filtro de exámenes: su disponibilidad, «Todas» y los eliminados. */
  readonly filtrosExamen: FiltroExamenVista[] = [
    { id: 'todos', etiqueta: 'Todas', disponible: null, eliminados: false },
    { id: 'disponibles', etiqueta: 'Disponibles', disponible: true, eliminados: false },
    { id: 'noDisponibles', etiqueta: 'No disponibles', disponible: false, eliminados: false },
    { id: 'eliminados', etiqueta: 'Eliminados', disponible: null, eliminados: true },
  ];

  /** Filtro elegido para el listado de cuidados; abre mostrando los cuidados vigentes. */
  filtroCuidado: FiltroCuidado = 'todas';

  /** Opciones del filtro de cuidados: sus estados y «Todas», que deja fuera los eliminados. */
  readonly filtrosCuidado: FiltroCuidadoVista[] = [
    { id: 'todas', etiqueta: 'Todas', estado: null },
    { id: 'completados', etiqueta: 'Completadas', estado: 'completado' },
    { id: 'enProceso', etiqueta: 'En proceso', estado: 'enProceso' },
    { id: 'eliminados', etiqueta: 'Eliminadas', estado: 'eliminado' },
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

  /** Muestra los exámenes de la disponibilidad elegida y suelta lo que dependía del listado anterior. */
  seleccionarFiltroExamen(filtro: FiltroExamen): void {
    this.filtroExamen = filtro;
    this.cerrarMenuIndicacion();

    const sigueEnElListado = this.examenesFiltrados.some(
      (examen) => examen.id === this.examenEnEdicion,
    );

    // El examen en edición no puede quedar fuera del listado visible
    if (this.examenEnEdicion !== null && !sigueEnElListado) {
      this.limpiarFormularioExamen();
    }
  }

  /** Muestra los cuidados del estado elegido y suelta lo que dependía del listado anterior. */
  seleccionarFiltroCuidado(filtro: FiltroCuidado): void {
    this.filtroCuidado = filtro;
    this.cerrarMenuIndicacion();

    const sigueEnElListado = this.cuidadosFiltrados.some(
      (cuidado) => cuidado.id === this.cuidadoEnEdicion,
    );

    // El cuidado en edición no puede quedar fuera del listado visible
    if (this.cuidadoEnEdicion !== null && !sigueEnElListado) {
      this.limpiarFormularioCuidado();
    }
  }

  // ------------------- CONSULTAS PARA LA VISTA -------------------
  /** El botón Guardar solo se habilita cuando hay un medicamento escrito. */
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

  /** El botón Guardar del examen se habilita con el nombre del examen escrito. */
  get puedeGuardarExamen(): boolean {
    return this.nombreExamen.trim().length > 0;
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

  /** Exámenes que muestra el listado con el filtro elegido; «Todas» deja fuera los eliminados. */
  get examenesFiltrados(): ExamenVista[] {
    const filtro = this.filtroActualExamen;

    return this.examenes.filter((examen) => {
      if (filtro.eliminados) {
        return examen.estado === 'eliminado';
      }

      return (
        examen.estado !== 'eliminado' &&
        (filtro.disponible === null || examen.disponible === filtro.disponible)
      );
    });
  }

  /** Texto del listado de exámenes cuando el filtro elegido no tiene coincidencias. */
  get mensajeSinExamenes(): string {
    const filtro = this.filtroActualExamen;

    return filtro.disponible === null && !filtro.eliminados
      ? 'Aún no hay exámenes indicados para el paciente.'
      : `No hay exámenes ${filtro.etiqueta.toLowerCase()}.`;
  }

  /** El botón Guardar del cuidado se habilita con el nombre del cuidado escrito. */
  get hayCuidado(): boolean {
    return this.nombreCuidado.trim().length > 0;
  }

  /** La duración en días obliga a indicar cuántos días dura el cuidado. */
  get faltaDuracionEnDiasCuidado(): boolean {
    return this.faltaDuracionEnDiasDe(this.duracionTipoCuidado, this.duracionCantidadCuidado);
  }

  /** El botón Guardar se habilita con el nombre del cuidado y la duración en días resuelta. */
  get puedeGuardarCuidado(): boolean {
    return this.hayCuidado && !this.faltaDuracionEnDiasCuidado;
  }

  /** Cuidados que muestra el listado con el filtro elegido; «Todas» deja fuera los eliminados. */
  get cuidadosFiltrados(): CuidadoVista[] {
    const estado = this.filtroActualCuidado.estado;

    return this.cuidados.filter((cuidado) =>
      estado === null ? cuidado.estado !== 'eliminado' : cuidado.estado === estado,
    );
  }

  /**
   * Texto del listado cuando el filtro elegido no tiene cuidados. No se concuerda con la etiqueta
   * del filtro porque «cuidado» es masculino y las etiquetas del listado son «Completadas» y
   * «Eliminadas», tomadas del listado de indicaciones.
   */
  get mensajeSinCuidados(): string {
    const filtro = this.filtroActualCuidado;

    return filtro.estado === null
      ? 'Aún no hay cuidados indicados para el paciente.'
      : `No hay cuidados con el filtro «${filtro.etiqueta}».`;
  }

  /** Texto de la duración que muestra la tarjeta: «7 días», «Dosis única» o «Por tiempo indefinido». */
  textoDuracion(registro: DuracionVista): string {
    if (registro.duracionTipo === 'dias') {
      return `${registro.duracionCantidad} días`;
    }

    return this.nombreOpcion(this.tiposDuracion, registro.duracionTipo);
  }

  /** Color del borde lateral de la tarjeta del cuidado: describe su estado en el listado. */
  tonoCuidado(cuidado: CuidadoVista): TonoIndicacion {
    return this.tonosCuidado[cuidado.estado];
  }

  // ------------------- ACCIONES DE LA VISTA -------------------
  /**
   * Muestra la sección pulsada del rail y repliega lo que quede desplegado en la sección anterior.
   * La ficha con los datos del paciente es común a las tres secciones, así que no se toca.
   */
  seleccionarSeccion(id: SeccionIndicacion): void {
    this.seccionActiva = id;
    this.cerrarMenuIndicacion();
  }

  /**
   * Abre o cierra la ficha con los datos del paciente desde la pestaña lateral del bloque
   * compartido, igual que en evaluación clínica. Al abrirla se muestran los datos completos para
   * que el usuario vea la información de contexto aunque la hubiera plegado antes.
   */
  cambiarFichaPaciente(abierto: boolean): void {
    this.pacienteAbierto = abierto;

    if (abierto) {
      this.datosPacienteVisibles = true;
    }
  }

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
    // Cada tarjeta del listado lleva su identificador: el de la indicación, el del examen o el del
    // cuidado
    const tarjetaAbierta =
      tarjeta?.dataset['indicacionId'] ??
      tarjeta?.dataset['examenId'] ??
      tarjeta?.dataset['cuidadoId'];

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

  // ------------------- ARCHIVO DEL EXAMEN -------------------
  /** Adjunta la imagen o el PDF elegido en el input cuando su formato y su peso se admiten. */
  seleccionarArchivoExamen(evento: Event): void {
    this.adjuntarArchivoExamen(this.archivos.procesar(evento));
  }

  /** Adjunta el archivo que se suelta sobre la zona de carga. */
  soltarArchivoExamen(evento: DragEvent): void {
    evento.preventDefault();
    this.adjuntarArchivoExamen(this.archivos.procesar(evento));
  }

  /** Quita el adjunto y vacía el input para poder volver a elegir el mismo archivo. */
  quitarArchivoExamen(): void {
    this.archivoExamen = null;
    this.vaciarInputArchivo();
  }

  /** Deja el adjunto elegido en el formulario o avisa del rechazo cuando no se admite. */
  private adjuntarArchivoExamen(resultado: ResultadoArchivo): void {
    if (resultado.mensaje) {
      this.popUps.advertencia(resultado.mensaje);
      this.vaciarInputArchivo();
      return;
    }

    if (resultado.seleccionado) {
      this.archivoExamen = resultado.seleccionado;
    }
  }

  /** Vacía el input de archivo: sin esto, volver a elegir el mismo archivo no dispara el evento. */
  private vaciarInputArchivo(): void {
    if (this.inputArchivoExamen) {
      this.inputArchivoExamen.nativeElement.value = '';
    }
  }

  /** Carga en el formulario el examen elegido para corregirlo. */
  editarExamen(examen: ExamenVista): void {
    this.examenEnEdicion = examen.id;
    this.nombreExamen = examen.nombre;
    this.observacionExamen = examen.observacion;
    this.archivoExamen = examen.archivo;
  }

  /** Deja el formulario del examen listo para capturar uno nuevo. */
  limpiarFormularioExamen(): void {
    this.nombreExamen = '';
    this.observacionExamen = '';
    this.archivoExamen = null;
    this.examenEnEdicion = null;
    this.vaciarInputArchivo();
  }

  /**
   * MOCK: registra el examen escrito con su imagen o su PDF adjunto. Si hay un examen en edición se
   * reemplazan sus datos conservando su disponibilidad; si no, se agrega al final del listado. En
   * ambos casos el formulario queda limpio para la siguiente captura. La maqueta lista como
   * disponible todo examen recién indicado; la disponibilidad real la aportará el servicio de
   * exámenes en la fase de integración.
   */
  agregarExamen(): void {
    const nombre = this.nombreExamen.trim();

    if (!nombre) {
      return;
    }

    const datos = {
      nombre,
      observacion: this.observacionExamen.trim(),
      archivo: this.archivoExamen,
    };

    if (this.examenEnEdicion !== null) {
      const idEditado = this.examenEnEdicion;

      this.examenes = this.examenes.map((registrado) =>
        registrado.id === idEditado ? { ...registrado, ...datos } : registrado,
      );
    } else {
      const ultimoId = this.examenes.reduce((mayor, examen) => Math.max(mayor, examen.id), 0);

      this.examenes = [
        ...this.examenes,
        { id: ultimoId + 1, ...datos, disponible: true, estado: 'activo' },
      ];
    }

    this.limpiarFormularioExamen();
  }

  /** Abre en una pestaña nueva la imagen o el PDF adjunto al examen; avisa cuando no lleva archivo. */
  verAdjuntoExamen(examen: ExamenVista): void {
    const adjunto = examen.archivo?.archivo;

    if (!adjunto) {
      this.popUps.advertencia(`El examen \"${examen.nombre}\" no tiene un archivo adjunto.`);
      return;
    }

    const direccion = URL.createObjectURL(adjunto);

    window.open(direccion, '_blank', 'noopener');
    // La dirección del adjunto se libera cuando el navegador ya ha abierto la pestaña
    setTimeout(() => URL.revokeObjectURL(direccion), 0);
  }

  /**
   * MOCK: la eliminación del examen se confirma con el popup global y el registro pasa al estado
   * eliminado, de modo que sale del listado vigente y queda disponible en el filtro «Eliminados».
   */
  async eliminarExamen(examen: ExamenVista): Promise<void> {
    this.cerrarMenuIndicacion();

    const confirmado = await this.popUps
      .confirmarToast(`¿Está seguro de eliminar el examen \"${examen.nombre}\"?`)
      .catch(() => false);

    if (!confirmado) {
      return;
    }

    if (this.examenEnEdicion === examen.id) {
      this.limpiarFormularioExamen();
    }

    this.examenes = this.examenes.map<ExamenVista>((registrado) =>
      registrado.id === examen.id ? { ...registrado, estado: 'eliminado' } : registrado,
    );
  }

  /** Carga en el formulario el cuidado elegido para corregirlo. */
  editarCuidado(cuidado: CuidadoVista): void {
    this.cuidadoEnEdicion = cuidado.id;
    this.nombreCuidado = cuidado.nombre;
    this.frecuenciaCuidado = cuidado.frecuencia;
    this.duracionTipoCuidado = cuidado.duracionTipo;
    this.duracionCantidadCuidado = cuidado.duracionCantidad;
    this.observacionesCuidado = cuidado.observaciones;
  }

  /** Deja el formulario del cuidado listo para capturar uno nuevo. */
  limpiarFormularioCuidado(): void {
    this.nombreCuidado = '';
    this.frecuenciaCuidado = null;
    this.duracionTipoCuidado = '';
    this.duracionCantidadCuidado = null;
    this.observacionesCuidado = '';
    this.cuidadoEnEdicion = null;
  }

  /**
   * MOCK: registra el cuidado escrito. Si hay una tarjeta en edición se reemplazan sus datos
   * conservando la fecha, la hora, el médico y el estado originales; si no, se agrega al final del
   * listado y queda en proceso. En ambos casos el formulario queda limpio para la siguiente captura.
   * La fecha, la hora y el médico reales los aportará el backend en la integración.
   */
  agregarCuidado(): void {
    const nombre = this.nombreCuidado.trim();

    if (!nombre || this.faltaDuracionEnDiasCuidado) {
      return;
    }

    const datos = {
      nombre,
      frecuencia: this.frecuenciaCuidado,
      duracionTipo: this.duracionTipoCuidado,
      // El número de días solo se guarda con el tipo «días»
      duracionCantidad: this.duracionTipoCuidado === 'dias' ? this.duracionCantidadCuidado : null,
      observaciones: this.observacionesCuidado.trim(),
    };

    if (this.cuidadoEnEdicion !== null) {
      const idEditado = this.cuidadoEnEdicion;

      this.cuidados = this.cuidados.map((registrado) =>
        registrado.id === idEditado ? { ...registrado, ...datos } : registrado,
      );
    } else {
      const ultimoId = this.cuidados.reduce(
        (mayor, registrado) => Math.max(mayor, registrado.id),
        0,
      );

      this.cuidados = [
        ...this.cuidados,
        {
          id: ultimoId + 1,
          ...datos,
          estado: 'enProceso',
          fecha: '10/10/2026',
          hora: '09:30',
          medico: 'Dr. Gómez',
        },
      ];
    }

    this.limpiarFormularioCuidado();
  }

  /**
   * MOCK: la eliminación del cuidado se confirma con el popup global y el registro pasa al estado
   * eliminado, de modo que sale del listado vigente y queda disponible en el filtro «Eliminadas».
   */
  async eliminarCuidado(cuidado: CuidadoVista): Promise<void> {
    this.cerrarMenuIndicacion();

    const confirmado = await this.popUps
      .confirmarToast(`¿Está seguro de eliminar el cuidado "${cuidado.nombre}"?`)
      .catch(() => false);

    if (!confirmado) {
      return;
    }

    if (this.cuidadoEnEdicion === cuidado.id) {
      this.limpiarFormularioCuidado();
    }

    this.cuidados = this.cuidados.map<CuidadoVista>((registrado) =>
      registrado.id === cuidado.id ? { ...registrado, estado: 'eliminado' } : registrado,
    );
  }

  /**
   * La duración en días exige su cantidad: lo comprueban igual los formularios de las secciones.
   */
  private faltaDuracionEnDiasDe(tipo: TipoDuracion | '', cantidad: number | null): boolean {
    return tipo === 'dias' && (cantidad ?? 0) <= 0;
  }

  /** Devuelve el nombre de la opción elegida en un desplegable. */
  private nombreOpcion(opciones: OpcionVista[], id: string): string {
    return opciones.find((opcion) => opcion.id === id)?.nombre ?? '';
  }

  /** Texto sin acentos, sin espacios sobrantes y en minúsculas para comparar la búsqueda. */
  private normalizarTexto(texto: string): string {
    return texto
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  /** Opción del filtro elegida en el listado. */
  private get filtroActual(): FiltroIndicacionVista {
    return (
      this.filtrosIndicacion.find((filtro) => filtro.id === this.filtroIndicacion) ??
      this.filtrosIndicacion[0]
    );
  }

  /** Opción del filtro de exámenes elegida en el listado. */
  private get filtroActualExamen(): FiltroExamenVista {
    return (
      this.filtrosExamen.find((filtro) => filtro.id === this.filtroExamen) ?? this.filtrosExamen[0]
    );
  }

  /** Opción del filtro de cuidados elegida en el listado. */
  private get filtroActualCuidado(): FiltroCuidadoVista {
    return (
      this.filtrosCuidado.find((filtro) => filtro.id === this.filtroCuidado) ??
      this.filtrosCuidado[0]
    );
  }

  /** Color de acento que le corresponde a la siguiente indicación registrada. */
  private tonoSiguiente(): TonoIndicacion {
    return this.tonos[this.indicaciones.length % this.tonos.length];
  }
}
