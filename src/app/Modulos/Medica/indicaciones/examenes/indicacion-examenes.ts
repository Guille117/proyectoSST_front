import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  catchError,
  finalize,
  forkJoin,
  map,
  of,
  Subscription,
  switchMap,
  TimeoutError,
} from 'rxjs';
import { ModalService } from '../../../../modal-principal/modal-service';
import {
  ArchivoSeleccionado,
  ResultadoArchivo,
} from '../../../../shared/archivos/archivoInterfaz';
import { ArchivoService } from '../../../../shared/archivos/archivoService';
import { PopUps } from '../../../../shared/popUps/popUpsService';
import { AuthService } from '../../../Auth/data/auth-service';
import { EpisodioActivoService } from '../../data/episodio-activo-service';
import { IndicacionExamenService } from './data/examen-service';
import {
  ExamenArchivoResponse,
  ExamenRequest,
  ExamenResponse,
} from './data/examenInterfaz';
import { VisorArchivos } from '../../../../shared/visor-archivos/visor-archivos';
import { ArchivoVisor } from '../../../../shared/visor-archivos/visor-archivos.interfaz';

/** Estados en los que puede quedar un examen indicado. */
type EstadoExamen = 'activo' | 'eliminado';

/** Filtros del listado de exámenes: su disponibilidad, «todos» los vigentes o los eliminados. */
type FiltroExamen = 'todos' | 'disponibles' | 'noDisponibles' | 'eliminados';

/** Examen indicado con sus archivos y su disponibilidad. */
interface ExamenVista {
  id: number;
  nombre: string;
  observacion: string;
  archivos: ExamenArchivoResponse[];
  /** Tiene al menos un archivo adjunto: se lista con el borde verde y el ojo. */
  disponible: boolean;
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
 * Sección de exámenes de las indicaciones médicas: registro del examen con sus imágenes o PDF
 * adjuntos y listado de los exámenes indicados en el episodio. Los archivos se administran desde
 * el visor: flechas para recorrerlos y eliminación del archivo que se está viendo.
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
export class IndicacionExamenes implements OnInit, OnDestroy {
  private readonly popUps = inject(PopUps);
  private readonly servicio = inject(IndicacionExamenService);
  private readonly modalService = inject(ModalService);
  private readonly authService = inject(AuthService);
  private readonly episodioActivo = inject(EpisodioActivoService);
  private readonly cdr = inject(ChangeDetectorRef);

  /** Tratamiento global de los archivos adjuntos: valida el formato y el peso y describe el archivo. */
  protected readonly archivos = inject(ArchivoService);

  /** El examen también admite TXT además de las imágenes y los PDF del servicio global. */
  readonly aceptadosExamen = `${this.archivos.aceptados},.txt`;

  private peticionLista?: Subscription;
  private peticionAccion?: Subscription;
  private destruido = false;
  private confirmando = false;

  /** Input de archivo del formulario del examen; se vacía al limpiar el formulario. */
  @ViewChild('archivoExamenInput') private inputArchivoExamen?: ElementRef<HTMLInputElement>;

  // ------------------- ESTADO DE LA VISTA -------------------
  /** El episodio es un historial cerrado: se consulta, pero no se registran cambios. */
  get soloLectura(): boolean {
    return this.episodioActivo.esSoloLectura();
  }

  /** Campos del formulario del examen: solo su nombre es obligatorio. */
  nombreExamen = '';
  observacionExamen = '';

  /** Imágenes o PDF nuevos que se adjuntarán al guardar. */
  archivosExamen: ArchivoSeleccionado[] = [];

  /** Archivos ya guardados del examen en edición; se pueden marcar con X para eliminarlos al guardar. */
  archivosExistentes: ExamenArchivoResponse[] = [];

  /** Identificadores de los archivos guardados que se eliminarán al confirmar los cambios. */
  archivosEliminados: number[] = [];

  /** Tarjeta del listado con su menú desplegado; null si no hay ninguna. */
  menuIndicacionAbierta: number | null = null;

  /** Examen cuyos datos están cargados en el formulario; null al capturar un examen nuevo. */
  examenEnEdicion: number | null = null;

  /** Exámenes del episodio con el filtro elegido. */
  examenes: ExamenVista[] = [];

  /** Estados de las peticiones: bloquean acciones incompatibles y muestran la carga. */
  cargando = false;
  guardando = false;
  eliminando = false;
  errorCarga = false;
  sinEpisodioActivo = false;

  // ------------------- FILTROS DEL LISTADO -------------------
  /** Filtro elegido para el listado de exámenes; abre mostrando todos los exámenes vigentes. */
  filtroExamen: FiltroExamen = 'todos';

  /** Opciones del filtro de exámenes: su disponibilidad, «Todas» y los eliminados. */
  readonly filtrosExamen: FiltroExamenVista[] = [
    { id: 'todos', etiqueta: 'Todas', disponible: null, eliminados: false },
    { id: 'disponibles', etiqueta: 'Disponibles', disponible: true, eliminados: false },
    { id: 'noDisponibles', etiqueta: 'No disponibles', disponible: false, eliminados: false },
    { id: 'eliminados', etiqueta: 'Eliminados', disponible: null, eliminados: true },
  ];

  // ------------------- CICLO DE VIDA -------------------
  ngOnInit(): void {
    this.cargarExamenes();
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.peticionLista?.unsubscribe();
    this.peticionAccion?.unsubscribe();
  }

  // ------------------- CONSULTAS PARA LA VISTA -------------------
  /** El botón Guardar del examen se habilita con el nombre escrito y sin una petición en curso. */
  get puedeGuardarExamen(): boolean {
    return this.nombreExamen.trim().length > 0 && !this.guardando;
  }

  /** Exámenes que muestra el listado con el filtro elegido. */
  get examenesFiltrados(): ExamenVista[] {
    const filtro = this.filtroActualExamen;

    if (filtro.eliminados) {
      return this.examenes;
    }

    if (filtro.disponible === null) {
      return this.examenes;
    }

    return this.examenes.filter((examen) => examen.disponible === filtro.disponible);
  }

  /** Texto del listado de exámenes cuando el filtro elegido no tiene coincidencias. */
  get mensajeSinExamenes(): string {
    const filtro = this.filtroActualExamen;

    return filtro.disponible === null && !filtro.eliminados
      ? 'Aún no hay exámenes indicados para el paciente.'
      : `No hay exámenes ${filtro.etiqueta.toLowerCase()}.`;
  }

  /**
   * La zona de arrastrar y soltar se muestra mientras no haya archivos nuevos y, al editar, solo si
   * el examen todavía no tiene archivos guardados.
   */
  get mostrarZonaCarga(): boolean {
    return (
      !this.archivosExamen.length &&
      !(this.examenEnEdicion !== null && this.archivosExistentes.length > 0)
    );
  }

  // ------------------- CARGA DEL LISTADO -------------------
  /** Carga los exámenes del episodio activo con el filtro elegido. */
  cargarExamenes(): void {
    if (this.destruido) return;

    const episodioId = this.episodioActivo.obtener();
    this.sinEpisodioActivo = episodioId === null;

    if (episodioId === null) {
      this.examenes = [];
      this.errorCarga = false;
      this.cargando = false;
      this.cdr.markForCheck();
      return;
    }

    this.cargando = true;
    this.errorCarga = false;
    this.cdr.markForCheck();
    this.peticionLista?.unsubscribe();

    this.peticionLista = this.servicio
      .buscarPorEpisodio(episodioId, this.filtroActualExamen.eliminados ? 'ELIMINADO' : 'ACTIVO')
      .pipe(
        finalize(() => {
          this.cargando = false;
          if (!this.destruido) this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (respuestas) => {
          if (this.destruido) return;

          this.examenes = respuestas.map((respuesta) => this.aVista(respuesta));
        },
        error: (error) => {
          if (this.destruido) return;

          this.examenes = [];
          this.errorCarga = true;
          this.mostrarError(error, 'No se pudieron cargar los exámenes. Intente nuevamente.');
        },
      });
  }

  /** Muestra los exámenes del filtro elegido y recarga el listado. */
  seleccionarFiltroExamen(filtro: FiltroExamen): void {
    this.filtroExamen = filtro;
    this.cerrarMenuIndicacion();
    this.limpiarFormularioExamen();
    this.cargarExamenes();
  }

  // ------------------- ARCHIVOS DEL EXAMEN -------------------
  /** Agrega al formulario las imágenes o los PDF elegidos en el input. */
  seleccionarArchivosExamen(evento: Event): void {
    const input = evento.target as HTMLInputElement | null;
    const seleccionados = input?.files ? Array.from(input.files) : [];

    this.agregarArchivosExamen(seleccionados);
    this.vaciarInputArchivo();
  }

  /** Agrega al formulario los archivos que se sueltan sobre la zona de carga. */
  soltarArchivosExamen(evento: DragEvent): void {
    evento.preventDefault();

    const seleccionados = evento.dataTransfer?.files
      ? Array.from(evento.dataTransfer.files)
      : [];

    this.agregarArchivosExamen(seleccionados);
  }

  /** Abre el gestor de archivos para seguir agregando adjuntos al examen. */
  abrirGestorArchivosExamen(): void {
    this.inputArchivoExamen?.nativeElement.click();
  }

  /** Quita el adjunto nuevo de la posición indicada y deja el input listo para volver a elegir. */
  quitarArchivoExamen(indice: number): void {
    this.archivosExamen = this.archivosExamen.filter((_, posicion) => posicion !== indice);
    this.vaciarInputArchivo();
  }

  /** Marca un archivo guardado para eliminarlo cuando se confirmen los cambios del examen. */
  quitarArchivoExistente(archivo: ExamenArchivoResponse): void {
    if (this.guardando) return;

    this.archivosExistentes = this.archivosExistentes.filter((item) => item.id !== archivo.id);
    if (!this.archivosEliminados.includes(archivo.id)) {
      this.archivosEliminados = [...this.archivosEliminados, archivo.id];
    }
  }

  /** Valida los archivos elegidos, suma los admitidos y avisa del primer rechazo. */
  private agregarArchivosExamen(seleccionados: File[]): void {
    const admitidos: ArchivoSeleccionado[] = [];
    let mensaje = '';

    for (const archivo of seleccionados) {
      const resultado = this.procesarArchivoExamen(archivo);

      if (resultado.mensaje) {
        mensaje ||= resultado.mensaje;
        continue;
      }

      if (resultado.seleccionado) {
        admitidos.push(resultado.seleccionado);
      }
    }

    if (admitidos.length) {
      this.archivosExamen = [...this.archivosExamen, ...admitidos];
    }

    if (mensaje) {
      this.popUps.advertencia(mensaje);
    }
  }

  /** Valida los archivos del examen y admite TXT además de los formatos del servicio global. */
  private procesarArchivoExamen(archivo: File): ResultadoArchivo {
    if (!this.esTxt(archivo)) {
      return this.archivos.procesarArchivo(archivo);
    }

    if (archivo.size > this.archivos.tamanoMaximoMb * 1024 * 1024) {
      return {
        seleccionado: null,
        mensaje: `El archivo supera el tamaño máximo de ${this.archivos.tamanoMaximoMb} MB.`,
      };
    }

    return { seleccionado: this.archivos.describir(archivo), mensaje: null };
  }

  /** Verdadero cuando el archivo es un TXT, por tipo MIME o por extensión. */
  private esTxt(archivo: File): boolean {
    return archivo.type === 'text/plain' || archivo.name.toLowerCase().endsWith('.txt');
  }

  /** Vacía el input de archivo: sin esto, volver a elegir el mismo archivo no dispara el evento. */
  private vaciarInputArchivo(): void {
    if (this.inputArchivoExamen) {
      this.inputArchivoExamen.nativeElement.value = '';
    }
  }

  /** Peso legible del archivo guardado; vacío cuando el backend no lo informó. */
  pesoArchivo(archivo: ExamenArchivoResponse): string {
    return archivo.tamano ? this.archivos.pesoLegible(archivo.tamano) : '';
  }

  /** Icono que corresponde al archivo guardado según su extensión. */
  iconoArchivo(archivo: ExamenArchivoResponse): string {
    const nombre = archivo.nombreOriginal.toLowerCase();

    if (/\.(png|jpe?g)$/.test(nombre)) return 'bi-file-earmark-image';
    if (nombre.endsWith('.pdf')) return 'bi-file-earmark-pdf';
    return 'bi-file-earmark-text';
  }

  // ------------------- MENÚ DE LA TARJETA -------------------
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

  // ------------------- CAPTURA Y EDICIÓN -------------------
  /** Carga en el formulario el examen elegido para corregirlo; los archivos se ven en el visor. */
  editarExamen(examen: ExamenVista): void {
    if (this.guardando || this.eliminando) return;

    this.cerrarMenuIndicacion();
    this.examenEnEdicion = examen.id;
    this.nombreExamen = examen.nombre;
    this.observacionExamen = examen.observacion;
    this.archivosExamen = [];
    this.archivosExistentes = [...examen.archivos];
    this.archivosEliminados = [];
    this.vaciarInputArchivo();
  }

  /** Deja el formulario del examen listo para capturar uno nuevo. */
  limpiarFormularioExamen(): void {
    this.nombreExamen = '';
    this.observacionExamen = '';
    this.archivosExamen = [];
    this.archivosExistentes = [];
    this.archivosEliminados = [];
    this.examenEnEdicion = null;
    this.vaciarInputArchivo();
  }

  /**
   * Crea el examen o actualiza el que está en edición. Al editar, siempre pide confirmación y, si se
   * marcaron archivos existentes con X, los elimina después de guardar los cambios.
   */
  async agregarExamen(): Promise<void> {
    if (this.destruido || this.guardando || this.confirmando) return;

    const nombre = this.nombreExamen.trim();
    if (!nombre) return;

    const episodioId = this.episodioActivo.obtener();
    if (episodioId === null) {
      this.popUps.advertencia('No hay un episodio activo. Abra el episodio del paciente.');
      return;
    }

    const usuarioId = this.authService.currentUser()?.id;
    if (!usuarioId) {
      this.popUps.error(
        'No se pudo identificar al usuario de la sesión. Inicie sesión nuevamente.',
      );
      return;
    }

    const idEditado = this.examenEnEdicion;

    if (idEditado !== null) {
      const cantidad = this.archivosEliminados.length;
      const detalle = cantidad
        ? ` Se eliminarán ${cantidad} ${cantidad === 1 ? 'archivo' : 'archivos'}.`
        : '';
      this.confirmando = true;
      const confirmado = await this.popUps
        .confirmarToast(`¿Está seguro de guardar los cambios del examen "${nombre}"?${detalle}`)
        .catch(() => false);
      this.confirmando = false;

      if (!confirmado || this.destruido) return;
    }

    const solicitud: ExamenRequest = {
      nombreExamen: nombre,
      observacion: this.observacionExamen.trim() || null,
      episodioId,
      usuarioId,
    };
    const archivos = this.archivosExamen.map((adjunto) => adjunto.archivo);
    const eliminaciones =
      idEditado !== null
        ? this.archivosEliminados.map((archivoId) =>
            this.servicio.eliminarArchivo(idEditado, archivoId),
          )
        : [];

    this.guardando = true;
    this.cdr.markForCheck();
    this.peticionAccion?.unsubscribe();
    this.peticionAccion = (
      idEditado === null
        ? this.servicio.crearExamen(solicitud, archivos)
        : this.servicio.actualizarExamen(idEditado, solicitud, archivos)
    )
      .pipe(
        switchMap(() => {
          if (!eliminaciones.length) {
            return of({ eliminacionCompleta: true });
          }

          return forkJoin(eliminaciones).pipe(
            map(() => ({ eliminacionCompleta: true })),
            catchError((error) => {
              this.mostrarError(
                error,
                'El examen se actualizó, pero no se pudieron eliminar todos los archivos.',
              );
              return of({ eliminacionCompleta: false });
            }),
          );
        }),
        finalize(() => {
          this.guardando = false;
          if (!this.destruido) this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: ({ eliminacionCompleta }) => {
          if (this.destruido) return;

          this.limpiarFormularioExamen();
          if (eliminacionCompleta) {
            this.popUps.exito(
              idEditado === null
                ? 'Examen guardado exitosamente.'
                : 'Examen actualizado exitosamente.',
            );
          }
          this.cargarExamenes();
        },
        error: (error) => {
          if (this.destruido) return;

          this.mostrarError(error, 'No se pudo guardar el examen. Intente nuevamente.');
        },
      });
  }

  /** Confirma y pasa el examen al estado eliminado; el listado se recarga. */
  async eliminarExamen(examen: ExamenVista): Promise<void> {
    if (this.destruido || this.eliminando || this.guardando) return;

    this.cerrarMenuIndicacion();

    const confirmado = await this.popUps
      .confirmarToast(`¿Está seguro de eliminar el examen "${examen.nombre}"?`)
      .catch(() => false);

    if (!confirmado || this.destruido) return;

    this.eliminando = true;
    this.cdr.markForCheck();
    this.peticionAccion?.unsubscribe();
    this.peticionAccion = this.servicio
      .cambiarEstado(examen.id, 'ELIMINADO')
      .pipe(
        finalize(() => {
          this.eliminando = false;
          if (!this.destruido) this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          if (this.destruido) return;

          if (this.examenEnEdicion === examen.id) {
            this.limpiarFormularioExamen();
          }
          this.popUps.exito('Examen eliminado exitosamente.');
          this.cargarExamenes();
        },
        error: (error) => {
          if (this.destruido) return;

          this.mostrarError(error, 'No se pudo eliminar el examen. Intente nuevamente.');
        },
      });
  }

  /** Abre el visor de los archivos del examen para recorrerlos o eliminar el que se está viendo. */
  verArchivosExamen(examen: ExamenVista): void {
    if (!examen.archivos.length) {
      this.popUps.advertencia(`El examen "${examen.nombre}" no tiene un archivo adjunto.`);
      return;
    }

    const archivos: ArchivoVisor[] = examen.archivos.map((archivo) => ({
      id: archivo.id,
      nombreOriginal: archivo.nombreOriginal,
      tamano: archivo.tamano,
    }));

    this.modalService.open(VisorArchivos, {
      title: `Archivos de ${examen.nombre}`,
      modalClass: 'modal-visor-documentos',
      archivos,
      indiceInicial: 0,
      cargarArchivo: (archivo: ArchivoVisor) =>
        this.servicio.obtenerArchivo(examen.id, Number(archivo.id)),
      onEliminar: (archivo: ArchivoVisor) =>
        this.servicio.eliminarArchivo(examen.id, Number(archivo.id)),
      onCambio: () => this.cargarExamenes(),
    });
  }

  // ------------------- APOYO -------------------
  /** Traduce el examen del backend a los datos que pinta la tarjeta. */
  private aVista(respuesta: ExamenResponse): ExamenVista {
    const archivos = respuesta.archivos ?? [];

    return {
      id: respuesta.id,
      nombre: respuesta.nombreExamen,
      observacion: respuesta.observacion ?? '',
      archivos,
      disponible: archivos.length > 0,
      estado: respuesta.estado === 'ACTIVO' ? 'activo' : 'eliminado',
    };
  }

  /** Opción del filtro de exámenes elegida en el listado. */
  private get filtroActualExamen(): FiltroExamenVista {
    return (
      this.filtrosExamen.find((filtro) => filtro.id === this.filtroExamen) ?? this.filtrosExamen[0]
    );
  }

  /** Distingue el timeout de comunicación del resto de errores del backend. */
  private mostrarError(error: unknown, mensajeDefault: string): void {
    if (error instanceof TimeoutError) {
      this.popUps.error(
        'Error de comunicación. El servidor no respondió dentro del tiempo esperado.',
      );
      return;
    }

    this.popUps.errorDesdeBackend(error, mensajeDefault);
  }
}
