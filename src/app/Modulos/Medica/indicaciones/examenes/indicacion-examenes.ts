import { Component, ElementRef, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ArchivoSeleccionado, ResultadoArchivo } from '../../../../shared/archivos/archivoInterfaz';
import { ArchivoService } from '../../../../shared/archivos/archivoService';
import { PopUps } from '../../../../shared/popUps/popUpsService';

/* Tipos locales de la maqueta: se sustituirán por el contrato real del backend en la fase de integración. */
/** Estados en los que puede quedar un examen indicado. */
type EstadoExamen = 'activo' | 'eliminado';

/** Filtros del listado de exámenes: su disponibilidad, «todos» los vigentes o los eliminados. */
type FiltroExamen = 'todos' | 'disponibles' | 'noDisponibles' | 'eliminados';

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

interface FiltroExamenVista {
  id: FiltroExamen;
  etiqueta: string;
  /** Disponibilidad que muestra la opción; null cuando no filtra por disponibilidad. */
  disponible: boolean | null;
  /** La opción lista los exámenes eliminados en lugar de los vigentes. */
  eliminados: boolean;
}

/**
 * Sección de exámenes de las indicaciones médicas: registro del examen con su imagen o su PDF
 * adjunto y listado de los exámenes indicados en el episodio.
 */
@Component({
  selector: 'app-indicacion-examenes',
  imports: [FormsModule],
  templateUrl: './indicacion-examenes.html',
  styleUrl: './indicacion-examenes.scss',
  host: {
    '(document:click)': 'cerrarMenuAlClicFuera($event)',
  },
})
export class IndicacionExamenes {
  private readonly popUps = inject(PopUps);

  /** Tratamiento global de los archivos adjuntos: valida el formato y el peso y describe el archivo. */
  protected readonly archivos = inject(ArchivoService);

  /** Input de archivo del formulario del examen; se vacía al limpiar el formulario. */
  @ViewChild('archivoExamenInput') private inputArchivoExamen?: ElementRef<HTMLInputElement>;

  // ------------------- ESTADO DE LA VISTA -------------------
  /** Campos del formulario del examen: solo su nombre es obligatorio. */
  nombreExamen = '';
  observacionExamen = '';

  /** Imagen o PDF adjunto al examen que se está capturando; es opcional. */
  archivoExamen: ArchivoSeleccionado | null = null;

  /** Tarjeta del listado con su menú desplegado; null si no hay ninguna. */
  menuIndicacionAbierta: number | null = null;

  /** Examen cuyos datos están cargados en el formulario; null al capturar un examen nuevo. */
  examenEnEdicion: number | null = null;

  // ------------------- MOCK: datos temporales para diseño -------------------
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
  // ------------------- FIN MOCK -------------------

  // ------------------- FILTROS DEL LISTADO -------------------
  /** Filtro elegido para el listado de exámenes; abre mostrando todos los exámenes indicados. */
  filtroExamen: FiltroExamen = 'todos';

  /** Opciones del filtro de exámenes: su disponibilidad, «Todas» y los eliminados. */
  readonly filtrosExamen: FiltroExamenVista[] = [
    { id: 'todos', etiqueta: 'Todas', disponible: null, eliminados: false },
    { id: 'disponibles', etiqueta: 'Disponibles', disponible: true, eliminados: false },
    { id: 'noDisponibles', etiqueta: 'No disponibles', disponible: false, eliminados: false },
    { id: 'eliminados', etiqueta: 'Eliminados', disponible: null, eliminados: true },
  ];

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

  // ------------------- CONSULTAS PARA LA VISTA -------------------
  /** El botón Guardar del examen se habilita con el nombre del examen escrito. */
  get puedeGuardarExamen(): boolean {
    return this.nombreExamen.trim().length > 0;
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

  // ------------------- ACCIONES DE LA VISTA -------------------
  /** Muestra u oculta el menú de opciones de la tarjeta pulsada. */
  alternarMenuIndicacion(id: number): void {
    this.menuIndicacionAbierta = this.menuIndicacionAbierta === id ? null : id;
  }

  /** Cierra el menú de opciones que esté desplegado. */
  cerrarMenuIndicacion(): void {
    this.menuIndicacionAbierta = null;
  }

  /** Cierra el menú al pulsar fuera de la tarjeta que lo tiene abierto. */
  cerrarMenuAlClicFuera(evento: Event): void {
    if (this.menuIndicacionAbierta === null || !(evento.target instanceof Element)) {
      return;
    }

    const tarjeta = evento.target.closest<HTMLElement>('.indicacion-card');
    // Cada tarjeta del listado lleva el identificador de su examen
    const tarjetaAbierta = tarjeta?.dataset['examenId'];

    if (tarjetaAbierta !== String(this.menuIndicacionAbierta)) {
      this.cerrarMenuIndicacion();
    }
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

  /** Opción del filtro de exámenes elegida en el listado. */
  private get filtroActualExamen(): FiltroExamenVista {
    return (
      this.filtrosExamen.find((filtro) => filtro.id === this.filtroExamen) ?? this.filtrosExamen[0]
    );
  }
}
