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
import { finalize, forkJoin, Subscription, TimeoutError } from 'rxjs';
import { ArchivoService } from '../../../shared/archivos/archivoService';
import { PopUps } from '../../../shared/popUps/popUpsService';
import { VisorArchivos } from '../../../shared/visor-archivos/visor-archivos';
import { ArchivoVisor } from '../../../shared/visor-archivos/visor-archivos.interfaz';
import { ModalService } from '../../../modal-principal/modal-service';
import { AuthService } from '../../Auth/data/auth-service';
import { EpisodioActivoService } from '../../Medica/data/episodio-activo-service';
import { IndicacionCuidadoService } from '../../Medica/indicaciones/cuidados/data/cuidado-service';
import { CuidadoResponse } from '../../Medica/indicaciones/cuidados/data/cuidadoInterfaz';
import { IndicacionExamenService } from '../../Medica/indicaciones/examenes/data/examen-service';
import {
  ExamenArchivoResponse,
  ExamenResponse,
} from '../../Medica/indicaciones/examenes/data/examenInterfaz';
import { MedicamentoIndicacionService } from '../../Medica/indicaciones/medicamentos/data/medicamento-service';
import { MedicamentoIndicacionResponse } from '../../Medica/indicaciones/medicamentos/data/medicamentoInterfaz';
import { ProcedimientoMedicoService } from '../../Medica/procedimiento-medico/data/procedimiento-medico-service';
import {
  ProcedimientoMedicoRequest,
  RecursoDisponibleResponse,
  TipoProcedimientoResponse,
} from '../../Medica/procedimiento-medico/data/procedimientoMedicoInterfaz';
import {
  AplicacionMedicamentoResponse,
  EjecucionCuidadoResponse,
} from '../data/registrosEnfermeriaInterfaz';
import { RegistrosEnfermeriaService } from '../data/registrosEnfermeriaService';
import {
  calcularAplicaciones,
  estadoTratamiento,
  ProgramacionTratamiento,
  proximaAplicacion,
  ultimaAplicacionRegistrada,
} from './data/programacionTratamiento';

/** Secciones del submenú de tratamientos de enfermería. */
type SeccionTratamiento = 'medicamentos' | 'examenes' | 'cuidados';

/** Estado de la administración de un medicamento o ejecución de un cuidado. */
type EstadoAdministracion = 'administrado' | 'noAdministrado' | '';

/** Estado de una aplicación registrada en el historial. */
type EstadoAplicacion = Exclude<EstadoAdministracion, ''>;

/** Filtros del listado de indicaciones según su estado. */
type FiltroTratamiento = 'pendientes' | 'realizadas';

/** Estado de una indicación dentro del listado de tratamientos. */
type EstadoTratamiento = 'pendiente' | 'realizada';

/** Tipo de duración con el que se describe la vigencia de una indicación. */
type TipoDuracionTratamiento = 'dias' | 'unica' | 'indefinida';

/** Tipo de duración que devuelve el backend. */
type TipoDuracionApi = 'DIAS' | 'DOSIS_UNICA' | 'TIEMPO_INDEFINIDO';

interface SeccionTratamientoVista {
  id: SeccionTratamiento;
  titulo: string;
  icono: string;
}

/** Opción del filtro del listado de indicaciones. */
interface FiltroTratamientoVista {
  id: FiltroTratamiento;
  etiqueta: string;
}

/** Opción del desplegable del estado de la administración. */
interface EstadoAdministracionVista {
  id: EstadoAplicacion;
  nombre: string;
}

/** Datos comunes de una indicación lista para pintar su tarjeta. */
interface IndicacionTratamientoVista {
  id: number;
  estado: EstadoTratamiento;
  observaciones: string;
  fechaInicio: string;
}

/** Indicaciones cuya tarjeta muestra el pie con la fecha, la hora y el médico. */
interface IndicacionConMetaVista extends IndicacionTratamientoVista {
  fecha: string;
  hora: string;
  medico: string;
}

/** Aplicación registrada de un medicamento o cuidado en el historial de la tarjeta. */
interface AplicacionMedicamentoVista {
  id: number;
  numero: number;
  estado: EstadoAplicacion;
  fechaHoraProgramada: string;
  fechaHora: string;
  fechaRegistro: string;
  usuario: string;
  observacion: string;
  cantidad: number | null;
}

/** Aplicación programada de una indicación, con su registro si ya se capturó. */
interface AplicacionProgramadaVista {
  numero: number;
  fechaHora: string;
  registro: AplicacionMedicamentoVista | null;
}

/** Indicación cuyas aplicaciones registradas se muestran en la tabla de la tarjeta. */
interface IndicacionConAplicaciones {
  id: number;
  aplicaciones: AplicacionMedicamentoVista[];
}

/** Indicación cuya programación se calcula con la fecha de inicio y la frecuencia. */
interface IndicacionConProgramacion extends IndicacionConAplicaciones {
  fechaInicio: string;
  frecuencia: number;
  duracionTipo: TipoDuracionTratamiento;
  duracionCantidad: number | null;
  ultimaAplicacion: Date | null;
  proximaAplicacion: Date | null;
}

/** Medicamento indicado que muestra la tarjeta de tratamientos. */
interface MedicamentoIndicadoVista
  extends IndicacionConMetaVista,
    IndicacionConProgramacion {
  nombre: string;
  cantidad: number;
  unidad: string;
  frecuencia: number;
  duracionTipo: TipoDuracionTratamiento;
  duracionCantidad: number | null;
  medicamentoLibre: boolean;
}

/** Examen indicado que muestra la tarjeta de tratamientos. */
interface ExamenIndicadoVista extends IndicacionTratamientoVista {
  nombre: string;
  archivos: ExamenArchivoResponse[];
  fecha: string;
  hora: string;
  usuario: string;
}

/** Cuidado indicado que muestra la tarjeta de tratamientos. */
interface CuidadoIndicadoVista extends IndicacionConMetaVista, IndicacionConProgramacion {
  nombre: string;
  frecuencia: number;
  duracionTipo: TipoDuracionTratamiento;
  duracionCantidad: number | null;
}

/** Medicamento agregado a la solicitud de farmacia. */
interface MedicamentoSolicitadoVista {
  id: number;
  nombre: string;
  cantidad: number;
}

/**
 * Tratamientos de enfermería: indicaciones médicas de medicamentos, exámenes y cuidados, con el
 * registro de las aplicaciones y ejecuciones realizadas por Enfermería.
 */
@Component({
  selector: 'app-tratamientos',
  imports: [FormsModule],
  templateUrl: './tratamientos.html',
  styleUrl: './tratamientos.scss',
})
export class Tratamientos implements OnInit, OnDestroy {
  private readonly popUps = inject(PopUps);
  private readonly authService = inject(AuthService);
  private readonly episodioActivo = inject(EpisodioActivoService);
  private readonly servicioProcedimientos = inject(ProcedimientoMedicoService);
  private readonly servicioMedicamentos = inject(MedicamentoIndicacionService);
  private readonly servicioCuidados = inject(IndicacionCuidadoService);
  private readonly servicioExamenes = inject(IndicacionExamenService);
  private readonly registrosEnfermeria = inject(RegistrosEnfermeriaService);
  private readonly archivos = inject(ArchivoService);
  private readonly modalService = inject(ModalService);
  private readonly cdr = inject(ChangeDetectorRef);

  /** Archivos que admite el gestor de exámenes, incluido TXT. */
  readonly aceptadosExamen = `${this.archivos.aceptados},.txt`;

  /** Input oculto con el que se cargan los archivos del examen. */
  @ViewChild('inputArchivosExamen') private inputArchivosExamen?: ElementRef<HTMLInputElement>;

  /** Sección del rail que se muestra en el área central. */
  seccionActiva: SeccionTratamiento = 'medicamentos';

  /** Filtro elegido para el listado de indicaciones; abre mostrando las pendientes. */
  filtroActivo: FiltroTratamiento = 'pendientes';

  /** La pantalla muestra la solicitud de medicamento en las dos secciones centrales. */
  solicitandoMedicamento = false;

  /** Campos del formulario de administración de medicamentos o cuidados. */
  estadoAdministracion: EstadoAdministracion = '';
  cantidadAdministrada: number | null = null;
  observacionAdministracion = '';

  /** Opciones del desplegable del estado de la administración. */
  readonly estadosAdministracion: EstadoAdministracionVista[] = [
    { id: 'administrado', nombre: 'Administrado' },
    { id: 'noAdministrado', nombre: 'No administrado' },
  ];

  /** Búsqueda y selección de medicamentos para la solicitud a farmacia. */
  textoBusquedaMedicamento = '';
  busquedaMedicamentoRealizada = false;
  cargandoMedicamentos = false;
  medicamentosEncontrados: RecursoDisponibleResponse[] = [];
  medicamentoSeleccionado: RecursoDisponibleResponse | null = null;
  cantidadMedicamento: number | null = null;
  medicamentosSolicitados: MedicamentoSolicitadoVista[] = [];

  /** Estados de la carga de tipos y del envío de la solicitud. */
  cargandoTiposSolicitud = false;
  enviandoSolicitud = false;
  private tiposSolicitud: TipoProcedimientoResponse[] = [];

  /** Datos reales del episodio activo. */
  medicamentos: MedicamentoIndicadoVista[] = [];
  examenes: ExamenIndicadoVista[] = [];
  cuidados: CuidadoIndicadoVista[] = [];

  /** Estados de carga, error y contexto del episodio. */
  cargandoIndicaciones = false;
  errorCargaIndicaciones = false;
  sinEpisodioActivo = false;
  guardandoAdministracion = false;
  eliminandoAplicacion = false;
  subiendoArchivosExamen = false;

  /** Medicamento cuyo historial de aplicaciones está desplegado; null si ninguno. */
  private indicacionAplicacionesAbierta: number | null = null;

  /** Examen que recibirá los archivos elegidos. */
  private examenCargandoArchivos: number | null = null;

  /** Aplicación del historial que se está editando; null si no hay ninguna. */
  private aplicacionEnEdicion: {
    seccion: SeccionTratamiento;
    indicacionId: number;
    registroId: number;
    fechaHoraProgramada: string;
  } | null = null;

  private peticionIndicaciones?: Subscription;
  private peticionAccion?: Subscription;
  private peticionArchivos?: Subscription;
  private peticionSolicitud?: Subscription;
  private destruido = false;

  /** Secciones del rail de tratamientos. */
  readonly secciones: SeccionTratamientoVista[] = [
    { id: 'medicamentos', titulo: 'Medicamentos', icono: 'bi-capsule' },
    { id: 'examenes', titulo: 'Exámenes', icono: 'bi-clipboard2-pulse' },
    { id: 'cuidados', titulo: 'Cuidados', icono: 'bi-heart-pulse' },
  ];

  /** Opciones del filtro del listado de indicaciones. */
  readonly filtros: FiltroTratamientoVista[] = [
    { id: 'pendientes', etiqueta: 'Pendientes' },
    { id: 'realizadas', etiqueta: 'Realizadas' },
  ];

  ngOnInit(): void {
    this.cargarIndicaciones();
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.peticionIndicaciones?.unsubscribe();
    this.peticionAccion?.unsubscribe();
    this.peticionArchivos?.unsubscribe();
    this.peticionSolicitud?.unsubscribe();
  }

  /** El episodio es un historial cerrado: se consulta, pero no se registran cambios. */
  get soloLectura(): boolean {
    return this.episodioActivo.esSoloLectura();
  }

  /** Datos de la sección activa que se muestran en el listado. */
  get seccionActual(): SeccionTratamientoVista {
    return this.secciones.find((seccion) => seccion.id === this.seccionActiva) ?? this.secciones[0];
  }

  /** Estado de las indicaciones que deja pasar el filtro elegido. */
  private get estadoFiltro(): EstadoTratamiento {
    return this.filtroActivo === 'pendientes' ? 'pendiente' : 'realizada';
  }

  /** Medicamentos que muestra el listado con el filtro elegido. */
  get medicamentosFiltrados(): MedicamentoIndicadoVista[] {
    return this.medicamentos.filter((indicacion) => indicacion.estado === this.estadoFiltro);
  }

  /** Exámenes que muestra el listado con el filtro elegido. */
  get examenesFiltrados(): ExamenIndicadoVista[] {
    return this.examenes.filter((indicacion) => indicacion.estado === this.estadoFiltro);
  }

  /** Cuidados que muestra el listado con el filtro elegido. */
  get cuidadosFiltrados(): CuidadoIndicadoVista[] {
    return this.cuidados.filter((indicacion) => indicacion.estado === this.estadoFiltro);
  }

  /** Texto del listado cuando el filtro elegido no tiene indicaciones. */
  get mensajeSinIndicaciones(): string {
    if (this.cargandoIndicaciones) return 'Cargando indicaciones...';
    if (this.sinEpisodioActivo) return 'Abra un episodio para consultar sus indicaciones.';
    if (this.errorCargaIndicaciones) {
      return 'No se pudieron cargar las indicaciones. Intente nuevamente.';
    }

    return this.filtroActivo === 'pendientes'
      ? 'No hay indicaciones pendientes.'
      : 'No hay indicaciones realizadas.';
  }

  /** La administración se marcó como no realizada. */
  get esNoAdministrado(): boolean {
    return this.estadoAdministracion === 'noAdministrado';
  }

  /** Opciones visibles del estado según la sección activa. */
  get opcionesEstadoRegistro(): EstadoAdministracionVista[] {
    return this.seccionActiva === 'cuidados'
      ? [
          { id: 'administrado', nombre: 'Realizado' },
          { id: 'noAdministrado', nombre: 'No realizado' },
        ]
      : this.estadosAdministracion;
  }

  /** El formulario de administración se puede guardar con sus campos obligatorios. */
  get puedeGuardarAdministracion(): boolean {
    if (this.guardandoAdministracion || this.estadoAdministracion === '') return false;
    if (this.seccionActiva !== 'medicamentos') return true;
    if (this.aplicacionEnEdicion) return true;
    if (this.estadoAdministracion === 'noAdministrado') return true;

    return this.cantidadAdministrada !== null && this.cantidadAdministrada > 0;
  }

  /** Indica si el formulario está editando una aplicación del historial. */
  get editandoAplicacion(): boolean {
    return this.aplicacionEnEdicion !== null;
  }

  /** Título del panel lateral según la sección y el modo del formulario. */
  get tituloPanelLateral(): string {
    if (this.editandoAplicacion) {
      return this.seccionActiva === 'cuidados' ? 'Editar cuidado' : 'Editar aplicación';
    }

    if (this.seccionActiva === 'medicamentos') return 'Registrar administración';
    if (this.seccionActiva === 'cuidados') return 'Registrar cuidado';
    return 'Historial';
  }

  /** Nombre de la indicación abierta que recibirá el próximo registro. */
  get indicacionParaRegistrar(): string | null {
    const id = this.indicacionAplicacionesAbierta;
    if (id === null) return null;

    if (this.seccionActiva === 'medicamentos') {
      return this.medicamentos.find((indicacion) => indicacion.id === id)?.nombre ?? null;
    }
    if (this.seccionActiva === 'cuidados') {
      return this.cuidados.find((indicacion) => indicacion.id === id)?.nombre ?? null;
    }

    return null;
  }

  /** Medicamentos visibles: si hay un historial abierto, solo se muestra su tarjeta. */
  get medicamentosVisibles(): MedicamentoIndicadoVista[] {
    const abierto = this.indicacionAplicacionesAbierta;

    return abierto === null
      ? this.medicamentosFiltrados
      : this.medicamentosFiltrados.filter((indicacion) => indicacion.id === abierto);
  }

  /** Cuidados visibles: si hay un historial abierto, solo se muestra su tarjeta. */
  get cuidadosVisibles(): CuidadoIndicadoVista[] {
    const abierto = this.indicacionAplicacionesAbierta;

    return abierto === null
      ? this.cuidadosFiltrados
      : this.cuidadosFiltrados.filter((indicacion) => indicacion.id === abierto);
  }

  /** Máximo que se puede agregar del medicamento seleccionado. */
  get cantidadMaximaMedicamento(): number {
    const seleccionado = this.medicamentoSeleccionado;
    if (!seleccionado) return 0;

    const existente = this.medicamentosSolicitados.find(
      (medicamento) => medicamento.id === seleccionado.id,
    );

    return Math.max(0, seleccionado.disponible - (existente?.cantidad ?? 0));
  }

  /** Se puede agregar el medicamento seleccionado con la cantidad indicada. */
  get puedeAgregarMedicamento(): boolean {
    return (
      !this.cargandoMedicamentos &&
      !this.enviandoSolicitud &&
      this.medicamentoSeleccionado !== null &&
      this.cantidadMedicamento !== null &&
      Number.isInteger(this.cantidadMedicamento) &&
      this.cantidadMedicamento > 0 &&
      this.cantidadMedicamento <= this.cantidadMaximaMedicamento
    );
  }

  /** Hay un tipo de procedimiento disponible para generar la solicitud. */
  get hayTipoSolicitud(): boolean {
    return this.tipoSolicitudMedicamento !== null;
  }

  /** La solicitud se puede enviar con al menos un medicamento y un tipo disponible. */
  get puedeEnviarSolicitud(): boolean {
    return (
      !this.enviandoSolicitud &&
      !this.cargandoTiposSolicitud &&
      this.medicamentosSolicitados.length > 0 &&
      this.tipoSolicitudMedicamento !== null
    );
  }

  /** Tipo de procedimiento que se usará para generar la solicitud de farmacia. */
  private get tipoSolicitudMedicamento(): TipoProcedimientoResponse | null {
    const activos = this.tiposSolicitud.filter((tipo) => tipo.estado !== false);

    return (
      activos.find(
        (tipo) => /solicitud/i.test(tipo.nombre) && /medicamento/i.test(tipo.nombre),
      ) ??
      activos.find((tipo) => /solicitud/i.test(tipo.nombre)) ??
      activos.find((tipo) => /medicamento/i.test(tipo.nombre)) ??
      null
    );
  }

  // ------------------- CARGA DEL EPISODIO -------------------
  /** Carga indicaciones, exámenes y registros del episodio activo. */
  cargarIndicaciones(): void {
    if (this.destruido) return;

    const episodioId = this.episodioActivo.obtener();
    this.sinEpisodioActivo = episodioId === null;

    if (episodioId === null) {
      this.medicamentos = [];
      this.examenes = [];
      this.cuidados = [];
      this.cargandoIndicaciones = false;
      this.errorCargaIndicaciones = false;
      this.cdr.markForCheck();
      return;
    }

    this.cargandoIndicaciones = true;
    this.errorCargaIndicaciones = false;
    this.cdr.markForCheck();
    this.peticionIndicaciones?.unsubscribe();

    this.peticionIndicaciones = forkJoin({
      medicamentos: this.servicioMedicamentos.getIndicacionesPorEpisodio(episodioId, 'ACTIVO'),
      cuidados: this.servicioCuidados.buscarPorEpisodio(episodioId, 'EN_PROCESO'),
      examenes: this.servicioExamenes.buscarPorEpisodio(episodioId, 'ACTIVO'),
      aplicaciones: this.registrosEnfermeria.buscarAplicacionesPorEpisodio(episodioId),
      ejecuciones: this.registrosEnfermeria.buscarEjecucionesPorEpisodio(episodioId),
    })
      .pipe(
        finalize(() => {
          this.cargandoIndicaciones = false;
          if (!this.destruido) this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (datos) => {
          if (this.destruido) return;

          const aplicaciones = this.agruparAplicaciones(datos.aplicaciones);
          const ejecuciones = this.agruparEjecuciones(datos.ejecuciones);

          this.medicamentos = datos.medicamentos.map((indicacion) =>
            this.aMedicamentoVista(indicacion, aplicaciones.get(indicacion.id) ?? []),
          );
          this.cuidados = datos.cuidados.map((indicacion) =>
            this.aCuidadoVista(indicacion, ejecuciones.get(indicacion.id) ?? []),
          );
          this.examenes = datos.examenes.map((examen) => this.aExamenVista(examen));
        },
        error: (error) => {
          if (this.destruido) return;

          this.medicamentos = [];
          this.examenes = [];
          this.cuidados = [];
          this.errorCargaIndicaciones = true;
          this.mostrarError(error, 'No se pudieron cargar las indicaciones.');
        },
      });
  }

  private agruparAplicaciones(
    aplicaciones: AplicacionMedicamentoResponse[],
  ): Map<number, AplicacionMedicamentoResponse[]> {
    const agrupadas = new Map<number, AplicacionMedicamentoResponse[]>();
    for (const aplicacion of aplicaciones) {
      const lista = agrupadas.get(aplicacion.indicacionMedicamentoId) ?? [];
      lista.push(aplicacion);
      agrupadas.set(aplicacion.indicacionMedicamentoId, lista);
    }
    return agrupadas;
  }

  private agruparEjecuciones(
    ejecuciones: EjecucionCuidadoResponse[],
  ): Map<number, EjecucionCuidadoResponse[]> {
    const agrupadas = new Map<number, EjecucionCuidadoResponse[]>();
    for (const ejecucion of ejecuciones) {
      const lista = agrupadas.get(ejecucion.cuidadoId) ?? [];
      lista.push(ejecucion);
      agrupadas.set(ejecucion.cuidadoId, lista);
    }
    return agrupadas;
  }

  // ------------------- SOLICITUD DE MEDICAMENTO -------------------
  /** Abre la solicitud de medicamento a farmacia con las dos secciones de la pantalla. */
  abrirSolicitudMedicamento(): void {
    this.solicitandoMedicamento = true;
    this.indicacionAplicacionesAbierta = null;
    this.limpiarSolicitudMedicamento();

    if (this.aplicacionEnEdicion) {
      this.limpiarFormularioAdministracion();
    }

    this.cargarTiposSolicitud();
  }

  /** Vuelve al listado de tratamientos. */
  cerrarSolicitudMedicamento(): void {
    this.solicitandoMedicamento = false;
  }

  /** Carga los tipos de procedimiento con los que se puede generar la solicitud. */
  cargarTiposSolicitud(): void {
    if (this.tiposSolicitud.length || this.cargandoTiposSolicitud) return;

    this.cargandoTiposSolicitud = true;
    this.peticionSolicitud?.unsubscribe();
    this.peticionSolicitud = this.servicioProcedimientos
      .getTiposProcedimiento()
      .pipe(finalize(() => (this.cargandoTiposSolicitud = false)))
      .subscribe({
        next: (tipos) => {
          this.tiposSolicitud = tipos.filter((tipo) => tipo.estado !== false);
        },
        error: (error) => {
          this.tiposSolicitud = [];
          this.mostrarError(error, 'No se pudieron cargar los tipos de solicitud.');
        },
      });
  }

  /** Busca medicamentos en el catálogo de farmacia. */
  buscarMedicamentos(): void {
    if (this.cargandoMedicamentos) return;

    this.busquedaMedicamentoRealizada = true;
    this.cargandoMedicamentos = true;
    this.medicamentoSeleccionado = null;
    this.cantidadMedicamento = null;
    this.medicamentosEncontrados = [];
    this.servicioProcedimientos
      .buscarRecursos('MEDICAMENTO', this.textoBusquedaMedicamento)
      .pipe(finalize(() => (this.cargandoMedicamentos = false)))
      .subscribe({
        next: (medicamentos) => {
          this.medicamentosEncontrados = medicamentos;
        },
        error: (error) => {
          this.medicamentosEncontrados = [];
          this.mostrarError(error, 'No se pudo buscar medicamentos en farmacia.');
        },
      });
  }

  /** Elige el medicamento de la tabla de resultados. */
  seleccionarMedicamento(medicamento: RecursoDisponibleResponse): void {
    this.medicamentoSeleccionado = medicamento;
    this.cantidadMedicamento = 1;
    this.busquedaMedicamentoRealizada = false;
    this.medicamentosEncontrados = [];
    this.textoBusquedaMedicamento = '';
  }

  /** Vuelve al buscador sin agregar el medicamento seleccionado. */
  cancelarSeleccionMedicamento(): void {
    this.medicamentoSeleccionado = null;
    this.cantidadMedicamento = null;
    this.busquedaMedicamentoRealizada = false;
    this.medicamentosEncontrados = [];
    this.textoBusquedaMedicamento = '';
  }

  /** Agrega el medicamento seleccionado a la solicitud. */
  agregarMedicamento(): void {
    const seleccionado = this.medicamentoSeleccionado;
    const cantidad = this.cantidadMedicamento;

    if (!seleccionado || cantidad === null || !this.puedeAgregarMedicamento) return;

    const existente = this.medicamentosSolicitados.find(
      (medicamento) => medicamento.id === seleccionado.id,
    );

    if (existente) {
      this.medicamentosSolicitados = this.medicamentosSolicitados.map((medicamento) =>
        medicamento.id === seleccionado.id
          ? { ...medicamento, cantidad: medicamento.cantidad + cantidad }
          : medicamento,
      );
    } else {
      this.medicamentosSolicitados = [
        ...this.medicamentosSolicitados,
        { id: seleccionado.id, nombre: seleccionado.nombre, cantidad },
      ];
    }

    this.cancelarSeleccionMedicamento();
  }

  /** Quita un medicamento de la solicitud. */
  quitarMedicamento(id: number): void {
    this.medicamentosSolicitados = this.medicamentosSolicitados.filter(
      (medicamento) => medicamento.id !== id,
    );
  }

  /** Deja la solicitud lista para empezar de nuevo. */
  limpiarSolicitudMedicamento(): void {
    this.medicamentosSolicitados = [];
    this.cancelarSeleccionMedicamento();
  }

  /** Envía a farmacia la solicitud con los medicamentos agregados. */
  enviarSolicitudMedicamento(): void {
    if (this.enviandoSolicitud) return;

    const tipo = this.tipoSolicitudMedicamento;
    const episodioId = this.episodioActivo.obtener();
    const usuarioId = this.authService.currentUser()?.id;

    if (!this.medicamentosSolicitados.length) {
      this.popUps.advertencia('Agregue al menos un medicamento a la solicitud.');
      return;
    }

    if (!tipo) {
      this.popUps.advertencia(
        'No hay un tipo de procedimiento configurado para generar la solicitud de medicamentos.',
      );
      return;
    }

    if (episodioId === null) {
      this.popUps.advertencia('No hay un episodio activo. Abra el episodio del paciente.');
      return;
    }

    if (!usuarioId) {
      this.popUps.error(
        'No se pudo identificar al usuario de la sesión. Inicie sesión nuevamente.',
      );
      return;
    }

    const request: ProcedimientoMedicoRequest = {
      tipoProcedimientoId: tipo.id,
      descripcion: 'Solicitud de medicamento a farmacia',
      resultado: null,
      inicio: this.fechaHoraActual(),
      fin: null,
      episodioId,
      usuarioId,
      recursos: this.medicamentosSolicitados.map((medicamento) => ({
        tipo: 'MEDICAMENTO',
        referenciaId: medicamento.id,
        cantidad: medicamento.cantidad,
      })),
    };

    this.enviandoSolicitud = true;
    this.peticionSolicitud?.unsubscribe();
    this.peticionSolicitud = this.servicioProcedimientos
      .crearProcedimiento(request)
      .pipe(finalize(() => (this.enviandoSolicitud = false)))
      .subscribe({
        next: () => {
          this.popUps.exito('Solicitud de medicamento enviada a farmacia.');
          this.limpiarSolicitudMedicamento();
          this.solicitandoMedicamento = false;
        },
        error: (error) => {
          this.mostrarError(error, 'No se pudo enviar la solicitud de medicamento.');
        },
      });
  }

  // ------------------- EXÁMENES -------------------
  /** Abre el selector de archivos para el examen indicado. */
  abrirCargaArchivosExamen(examen: ExamenIndicadoVista): void {
    this.examenCargandoArchivos = examen.id;
    this.inputArchivosExamen?.nativeElement.click();
  }

  /** Valida y sube al backend los archivos elegidos para el examen. */
  seleccionarArchivosExamen(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const examen = this.examenes.find((item) => item.id === this.examenCargandoArchivos);

    if (!examen) {
      input.value = '';
      this.examenCargandoArchivos = null;
      return;
    }

    const seleccionados = Array.from(input.files ?? []);
    const admitidos: File[] = [];
    let mensaje: string | null = null;

    for (const archivo of seleccionados) {
      if (this.esTxt(archivo)) {
        if (archivo.size > this.archivos.tamanoMaximoMb * 1024 * 1024) {
          mensaje ??= `El archivo supera el tamaño máximo de ${this.archivos.tamanoMaximoMb} MB.`;
        } else {
          admitidos.push(archivo);
        }
        continue;
      }

      const resultado = this.archivos.procesarArchivo(archivo);
      if (resultado.seleccionado) {
        admitidos.push(resultado.seleccionado.archivo);
      } else if (!mensaje) {
        mensaje = resultado.mensaje;
      }
    }

    input.value = '';
    this.examenCargandoArchivos = null;

    if (mensaje) {
      this.popUps.advertencia(mensaje);
    }
    if (!admitidos.length) return;

    this.subiendoArchivosExamen = true;
    this.cdr.markForCheck();
    this.peticionArchivos?.unsubscribe();
    this.peticionArchivos = this.servicioExamenes
      .agregarArchivos(examen.id, admitidos)
      .pipe(
        finalize(() => {
          this.subiendoArchivosExamen = false;
          if (!this.destruido) this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.popUps.exito('Archivos adjuntados al examen.');
          this.cargarIndicaciones();
        },
        error: (error) => {
          this.mostrarError(error, 'No se pudieron adjuntar los archivos del examen.');
        },
      });
  }

  /** Abre el visor con todos los archivos del examen. */
  verArchivosExamen(examen: ExamenIndicadoVista): void {
    if (!examen.archivos.length) {
      this.popUps.advertencia(`El examen "${examen.nombre}" no tiene archivos adjuntos.`);
      return;
    }

    const archivos: ArchivoVisor[] = examen.archivos.map((archivo) => ({
      id: archivo.id,
      nombreOriginal: archivo.nombreOriginal,
      tipo: this.tipoArchivo(archivo.nombreOriginal),
      tamano: archivo.tamano ?? 0,
    }));

    this.modalService.open(VisorArchivos, {
      title: `Archivos de ${examen.nombre}`,
      modalClass: 'modal-visor-documentos',
      archivos,
      indiceInicial: 0,
      cargarArchivo: (archivo: ArchivoVisor) =>
        this.servicioExamenes.obtenerArchivo(examen.id, Number(archivo.id)),
    });
  }

  /** Verdadero cuando el archivo es de texto plano. */
  private esTxt(archivo: File): boolean {
    return archivo.type === 'text/plain' || archivo.name.toLowerCase().endsWith('.txt');
  }

  /** Tipo MIME aproximado a partir del nombre del archivo del examen. */
  private tipoArchivo(nombre: string): string {
    const extension = nombre.split('.').pop()?.toLowerCase();
    if (extension === 'pdf') return 'application/pdf';
    if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
    if (extension === 'png') return 'image/png';
    if (extension === 'txt') return 'text/plain';
    return 'application/octet-stream';
  }

  // ------------------- NAVEGACIÓN Y FILTROS -------------------
  /** Muestra la sección pulsada del rail y cierra el historial desplegado. */
  seleccionarSeccion(id: SeccionTratamiento): void {
    this.seccionActiva = id;
    this.indicacionAplicacionesAbierta = null;
    this.solicitandoMedicamento = false;

    if (this.aplicacionEnEdicion) {
      this.limpiarFormularioAdministracion();
    }
  }

  /** Muestra las indicaciones del estado elegido y cierra el historial desplegado. */
  seleccionarFiltro(filtro: FiltroTratamiento): void {
    this.filtroActivo = filtro;
    this.indicacionAplicacionesAbierta = null;

    if (this.aplicacionEnEdicion) {
      this.limpiarFormularioAdministracion();
    }
  }

  // ------------------- ADMINISTRACIÓN Y EJECUCIÓN -------------------
  /** Deja el formulario de administración listo para un nuevo registro. */
  limpiarFormularioAdministracion(): void {
    this.estadoAdministracion = '';
    this.cantidadAdministrada = null;
    this.observacionAdministracion = '';
    this.aplicacionEnEdicion = null;
  }

  /** Guarda la administración o ejecución contra el backend. */
  guardarAdministracion(): void {
    if (!this.puedeGuardarAdministracion) return;

    const episodioId = this.episodioActivo.obtener();
    const usuarioId = this.authService.currentUser()?.id;

    if (episodioId === null) {
      this.popUps.advertencia('No hay un episodio activo. Abra el episodio del paciente.');
      return;
    }
    if (!usuarioId) {
      this.popUps.error(
        'No se pudo identificar al usuario de la sesión. Inicie sesión nuevamente.',
      );
      return;
    }

    const estado: EstadoAplicacion =
      this.estadoAdministracion === 'noAdministrado' ? 'noAdministrado' : 'administrado';
    const observacion = this.observacionAdministracion.trim() || null;
    const edicion = this.aplicacionEnEdicion;
    const indicacionId = edicion?.indicacionId ?? this.indicacionAplicacionesAbierta;

    if (indicacionId === null) {
      this.popUps.advertencia('Abra una indicación para registrar la administración.');
      return;
    }

    this.guardandoAdministracion = true;
    this.cdr.markForCheck();
    this.peticionAccion?.unsubscribe();

    if (this.seccionActiva === 'medicamentos') {
      const indicacion = this.medicamentos.find((item) => item.id === indicacionId);
      if (!indicacion) {
        this.guardandoAdministracion = false;
        return;
      }

      const fechaHoraProgramada = edicion
        ? edicion.fechaHoraProgramada
        : this.aIsoLocal(this.siguientePendiente(indicacion) ?? new Date());
      const request = {
        indicacionMedicamentoId: indicacion.id,
        fechaHoraProgramada,
        estado: estado === 'administrado' ? ('ADMINISTRADO' as const) : ('NO_ADMINISTRADO' as const),
        cantidad: estado === 'administrado' ? this.cantidadAdministrada : null,
        observacion,
        usuarioId,
      };

      this.peticionAccion = (edicion
        ? this.registrosEnfermeria.actualizarAplicacion(edicion.registroId, request)
        : this.registrosEnfermeria.crearAplicacion(request)
      )
        .pipe(
          finalize(() => {
            this.guardandoAdministracion = false;
            if (!this.destruido) this.cdr.markForCheck();
          }),
        )
        .subscribe({
          next: () => this.administracionGuardada(),
          error: (error) =>
            this.mostrarError(error, 'No se pudo guardar la administración del medicamento.'),
        });
      return;
    }

    if (this.seccionActiva === 'cuidados') {
      const cuidado = this.cuidados.find((item) => item.id === indicacionId);
      if (!cuidado) {
        this.guardandoAdministracion = false;
        return;
      }

      const fechaHoraProgramada = edicion
        ? edicion.fechaHoraProgramada
        : this.aIsoLocal(this.siguientePendiente(cuidado) ?? new Date());
      const request = {
        cuidadoId: cuidado.id,
        fechaHoraProgramada,
        estado: estado === 'administrado' ? ('REALIZADO' as const) : ('NO_REALIZADO' as const),
        observacion,
        usuarioId,
      };

      this.peticionAccion = (edicion
        ? this.registrosEnfermeria.actualizarEjecucion(edicion.registroId, request)
        : this.registrosEnfermeria.crearEjecucion(request)
      )
        .pipe(
          finalize(() => {
            this.guardandoAdministracion = false;
            if (!this.destruido) this.cdr.markForCheck();
          }),
        )
        .subscribe({
          next: () => this.administracionGuardada(),
          error: (error) =>
            this.mostrarError(error, 'No se pudo guardar la ejecución del cuidado.'),
        });
      return;
    }

    this.guardandoAdministracion = false;
  }

  private administracionGuardada(): void {
    this.limpiarFormularioAdministracion();
    this.popUps.exito(
      this.seccionActiva === 'cuidados'
        ? 'Cuidado registrado exitosamente.'
        : 'Administración registrada exitosamente.',
    );
    this.cargarIndicaciones();
  }

  /** Indica si el historial de aplicaciones de una indicación está desplegado. */
  aplicacionesAbierta(id: number): boolean {
    return this.indicacionAplicacionesAbierta === id;
  }

  /** Despliega u oculta el historial de aplicaciones de una indicación. */
  alternarAplicaciones(id: number): void {
    this.indicacionAplicacionesAbierta = this.indicacionAplicacionesAbierta === id ? null : id;

    if (this.aplicacionEnEdicion) {
      this.limpiarFormularioAdministracion();
    }
  }

  /** Carga en el formulario la aplicación elegida para editarla. */
  editarAplicacion(
    indicacion: IndicacionConAplicaciones,
    aplicacion: AplicacionMedicamentoVista,
  ): void {
    this.aplicacionEnEdicion = {
      seccion: this.seccionActiva,
      indicacionId: indicacion.id,
      registroId: aplicacion.id,
      fechaHoraProgramada: aplicacion.fechaHoraProgramada,
    };
    this.estadoAdministracion = aplicacion.estado;
    this.cantidadAdministrada = aplicacion.cantidad;
    this.observacionAdministracion = aplicacion.observacion;
  }

  /** Elimina la aplicación del historial contra el backend. */
  eliminarAplicacion(
    indicacion: IndicacionConAplicaciones,
    aplicacion: AplicacionMedicamentoVista,
  ): void {
    if (this.eliminandoAplicacion) return;

    this.eliminandoAplicacion = true;
    this.cdr.markForCheck();
    this.peticionAccion?.unsubscribe();

    const peticion =
      this.seccionActiva === 'cuidados'
        ? this.registrosEnfermeria.eliminarEjecucion(aplicacion.id)
        : this.registrosEnfermeria.eliminarAplicacion(aplicacion.id);

    this.peticionAccion = peticion
      .pipe(
        finalize(() => {
          this.eliminandoAplicacion = false;
          if (!this.destruido) this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          if (this.aplicacionEnEdicion?.registroId === aplicacion.id) {
            this.limpiarFormularioAdministracion();
          }
          this.indicacionAplicacionesAbierta = null;
          this.popUps.exito('Registro eliminado exitosamente.');
          this.cargarIndicaciones();
        },
        error: (error) => {
          this.mostrarError(error, 'No se pudo eliminar el registro.');
        },
      });
  }

  // ------------------- TEXTOS DE LA TARJETA -------------------
  /** Texto de la cantidad con su unidad: «1 tableta», «500 ml». */
  textoCantidad(indicacion: MedicamentoIndicadoVista): string {
    return `${indicacion.cantidad} ${indicacion.unidad}`;
  }

  /** Texto de la frecuencia: «cada 8 horas» o «cada 1 hora». */
  textoFrecuencia(indicacion: MedicamentoIndicadoVista): string {
    return `cada ${indicacion.frecuencia} ${indicacion.frecuencia === 1 ? 'hora' : 'horas'}`;
  }

  /** Texto de la duración del medicamento: «por 5 días», «dosis única»... */
  textoDuracion(indicacion: MedicamentoIndicadoVista): string {
    if (indicacion.duracionTipo === 'dias') {
      const dias = indicacion.duracionCantidad ?? 0;
      return `por ${dias} ${dias === 1 ? 'día' : 'días'}`;
    }

    if (indicacion.duracionTipo === 'unica') return 'dosis única';
    if (indicacion.duracionTipo === 'indefinida') return 'por tiempo indefinido';
    return '';
  }

  /** Texto de la última aplicación: «hoy», «mañana» o la fecha completa con su hora. */
  textoUltimaAplicacion(indicacion: IndicacionConProgramacion): string {
    return indicacion.ultimaAplicacion
      ? this.textoAplicacion(indicacion.ultimaAplicacion)
      : 'Sin registros';
  }

  /** Texto de la próxima aplicación: «hoy», «mañana» o la fecha completa con su hora. */
  textoProximaAplicacion(indicacion: IndicacionConProgramacion): string {
    return indicacion.proximaAplicacion
      ? this.textoAplicacion(indicacion.proximaAplicacion)
      : 'Sin programación';
  }

  /** Texto del estado de un registro según la sección. */
  textoEstadoRegistro(estado: EstadoAplicacion): string {
    if (this.seccionActiva === 'cuidados') {
      return estado === 'administrado' ? 'Realizado' : 'No realizado';
    }

    return estado === 'administrado' ? 'Administrado' : 'No administrado';
  }

  /** Aplicaciones programadas según la frecuencia y la duración de la indicación. */
  aplicacionesProgramadas(indicacion: IndicacionConProgramacion): AplicacionProgramadaVista[] {
    if (indicacion.duracionTipo === 'indefinida') {
      return indicacion.aplicaciones.map((registro, indice) => ({
        numero: indice + 1,
        fechaHora: registro.fechaHora,
        registro,
      }));
    }

    const programacion = this.programacionDeVista(indicacion);
    const programadas = calcularAplicaciones(programacion);
    if (!programadas.length) return [];

    return programadas.map((aplicacion) => ({
      numero: aplicacion.numero,
      fechaHora: this.formatearFechaHora(aplicacion.fechaHora),
      registro:
        indicacion.aplicaciones.find((registro) =>
          this.mismaFecha(registro.fechaHoraProgramada, aplicacion.fechaHora),
        ) ?? null,
    }));
  }

  /** Texto de la tarjeta del cuidado: cada cuántas horas se realiza y durante cuánto tiempo. */
  textoRealizacion(cuidado: CuidadoIndicadoVista): string {
    if (cuidado.duracionTipo === 'unica') {
      return 'Realizar una vez';
    }

    const cada = `Realizar cada ${cuidado.frecuencia} ${
      cuidado.frecuencia === 1 ? 'hora' : 'horas'
    }`;

    if (cuidado.duracionTipo === 'dias') {
      const dias = cuidado.duracionCantidad ?? 0;
      return `${cada} por ${dias} ${dias === 1 ? 'día' : 'días'}`;
    }

    if (cuidado.duracionTipo === 'indefinida') {
      return `${cada} por tiempo indefinido`;
    }

    return cada;
  }

  // ------------------- APOYO -------------------
  /** Traduce una indicación de medicamento a la tarjeta de Enfermería. */
  private aMedicamentoVista(
    respuesta: MedicamentoIndicacionResponse,
    aplicaciones: AplicacionMedicamentoResponse[],
  ): MedicamentoIndicadoVista {
    const programacion = this.programacionDeRespuesta(respuesta);
    const registros = aplicaciones.map((aplicacion, indice) =>
      this.aAplicacionMedicamentoVista(aplicacion, indice),
    );
    const fechaInicio = new Date(respuesta.fechaInicio || respuesta.fecha);

    return {
      id: respuesta.id,
      estado: estadoTratamiento(programacion, registros),
      observaciones: respuesta.observaciones ?? '',
      fechaInicio: respuesta.fechaInicio || respuesta.fecha,
      fecha: this.formatearFecha(fechaInicio),
      hora: this.formatearHora(fechaInicio),
      medico: respuesta.usuarioNombre,
      nombre: respuesta.medicamento,
      cantidad: respuesta.cantidad,
      unidad: respuesta.presentacion?.trim() || 'unidad',
      frecuencia: respuesta.frecuencia,
      duracionTipo: this.aDuracionVista(respuesta.tipoDuracion),
      duracionCantidad: respuesta.duracion,
      medicamentoLibre: respuesta.medicamentoLibre !== null,
      ultimaAplicacion: ultimaAplicacionRegistrada(registros),
      proximaAplicacion: proximaAplicacion(programacion),
      aplicaciones: registros,
    };
  }

  /** Traduce un cuidado a la tarjeta de Enfermería. */
  private aCuidadoVista(
    respuesta: CuidadoResponse,
    ejecuciones: EjecucionCuidadoResponse[],
  ): CuidadoIndicadoVista {
    const programacion = this.programacionDeRespuesta(respuesta);
    const registros = ejecuciones.map((ejecucion, indice) =>
      this.aEjecucionCuidadoVista(ejecucion, indice),
    );
    const fechaInicio = new Date(respuesta.fechaInicio || respuesta.fecha);

    return {
      id: respuesta.id,
      estado: estadoTratamiento(programacion, registros),
      observaciones: respuesta.observacion ?? '',
      fechaInicio: respuesta.fechaInicio || respuesta.fecha,
      fecha: this.formatearFecha(fechaInicio),
      hora: this.formatearHora(fechaInicio),
      medico: respuesta.usuarioNombre,
      nombre: respuesta.nombreCuidado,
      frecuencia: respuesta.frecuencia,
      duracionTipo: this.aDuracionVista(respuesta.tipoDuracion),
      duracionCantidad: respuesta.duracion,
      ultimaAplicacion: ultimaAplicacionRegistrada(registros),
      proximaAplicacion: proximaAplicacion(programacion),
      aplicaciones: registros,
    };
  }

  /** Traduce un examen a la tarjeta de Enfermería; se realiza cuando tiene archivos. */
  private aExamenVista(respuesta: ExamenResponse): ExamenIndicadoVista {
    const fecha = new Date(respuesta.fecha);

    return {
      id: respuesta.id,
      nombre: respuesta.nombreExamen,
      archivos: respuesta.archivos,
      estado: respuesta.archivos.length ? 'realizada' : 'pendiente',
      observaciones: respuesta.observacion ?? '',
      fechaInicio: respuesta.fecha,
      fecha: this.formatearFecha(fecha),
      hora: this.formatearHora(fecha),
      usuario: respuesta.usuarioNombre,
    };
  }

  private aAplicacionMedicamentoVista(
    respuesta: AplicacionMedicamentoResponse,
    indice: number,
  ): AplicacionMedicamentoVista {
    return {
      id: respuesta.id,
      numero: indice + 1,
      estado: respuesta.estado === 'ADMINISTRADO' ? 'administrado' : 'noAdministrado',
      fechaHoraProgramada: respuesta.fechaHoraProgramada,
      fechaHora: this.formatearFechaHora(new Date(respuesta.fechaHoraProgramada)),
      fechaRegistro: this.formatearFechaHora(new Date(respuesta.fechaRegistro)),
      usuario: respuesta.usuarioNombre,
      observacion: respuesta.observacion ?? '',
      cantidad: respuesta.cantidad,
    };
  }

  private aEjecucionCuidadoVista(
    respuesta: EjecucionCuidadoResponse,
    indice: number,
  ): AplicacionMedicamentoVista {
    return {
      id: respuesta.id,
      numero: indice + 1,
      estado: respuesta.estado === 'REALIZADO' ? 'administrado' : 'noAdministrado',
      fechaHoraProgramada: respuesta.fechaHoraProgramada,
      fechaHora: this.formatearFechaHora(new Date(respuesta.fechaHoraProgramada)),
      fechaRegistro: this.formatearFechaHora(new Date(respuesta.fechaRegistro)),
      usuario: respuesta.usuarioNombre,
      observacion: respuesta.observacion ?? '',
      cantidad: null,
    };
  }

  private programacionDeRespuesta(respuesta: {
    fechaInicio: string;
    fecha: string;
    frecuencia: number;
    tipoDuracion: TipoDuracionApi;
    duracion: number | null;
  }): ProgramacionTratamiento {
    return {
      fechaInicio: new Date(respuesta.fechaInicio || respuesta.fecha),
      frecuencia: respuesta.frecuencia,
      duracionTipo: this.aDuracionVista(respuesta.tipoDuracion),
      duracionCantidad: respuesta.duracion,
    };
  }

  private programacionDeVista(indicacion: IndicacionConProgramacion): ProgramacionTratamiento {
    return {
      fechaInicio: new Date(indicacion.fechaInicio),
      frecuencia: indicacion.frecuencia,
      duracionTipo: indicacion.duracionTipo,
      duracionCantidad: indicacion.duracionCantidad,
    };
  }

  private aDuracionVista(tipo: TipoDuracionApi): TipoDuracionTratamiento {
    if (tipo === 'DOSIS_UNICA') return 'unica';
    if (tipo === 'TIEMPO_INDEFINIDO') return 'indefinida';
    return 'dias';
  }

  /** Primera aplicación sin registro, o null si ya están todas. */
  private siguientePendiente(indicacion: IndicacionConProgramacion): Date | null {
    const programacion = this.programacionDeVista(indicacion);
    const programadas =
      indicacion.duracionTipo === 'indefinida'
        ? calcularAplicaciones(programacion, new Date())
        : calcularAplicaciones(programacion);

    return (
      programadas.find(
        (aplicacion) =>
          !indicacion.aplicaciones.some((registro) =>
            this.mismaFecha(registro.fechaHoraProgramada, aplicacion.fechaHora),
          ),
      )?.fechaHora ?? null
    );
  }

  /** Compara dos fechas por minuto para emparejar la programación con los registros. */
  private mismaFecha(fechaRegistro: string, fechaProgramada: Date): boolean {
    const registro = new Date(fechaRegistro);
    if (Number.isNaN(registro.getTime())) return false;

    return Math.floor(registro.getTime() / 60000) === Math.floor(fechaProgramada.getTime() / 60000);
  }

  /** Fecha y hora local en el formato ISO que espera el backend. */
  private aIsoLocal(fecha: Date): string {
    const dosDigitos = (valor: number): string => `${valor}`.padStart(2, '0');

    return `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(
      fecha.getDate(),
    )}T${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}:00`;
  }

  /** Fecha y hora en el formato de la tabla (dd/MM/yyyy HH:mm). */
  private formatearFechaHora(fecha: Date): string {
    return `${this.formatearFecha(fecha)} ${this.formatearHora(fecha)}`;
  }

  /** Fecha de la aplicación en el formato corto (dd/MM/yyyy). */
  private formatearFecha(fecha: Date): string {
    if (Number.isNaN(fecha.getTime())) return '';

    const dia = `${fecha.getDate()}`.padStart(2, '0');
    const mes = `${fecha.getMonth() + 1}`.padStart(2, '0');
    return `${dia}/${mes}/${fecha.getFullYear()}`;
  }

  /** Hora de la aplicación en el formato de la tarjeta (HH:mm). */
  private formatearHora(fecha: Date): string {
    if (Number.isNaN(fecha.getTime())) return '';

    const horas = `${fecha.getHours()}`.padStart(2, '0');
    const minutos = `${fecha.getMinutes()}`.padStart(2, '0');
    return `${horas}:${minutos}`;
  }

  /** Texto relativo de una aplicación: «hoy», «mañana» o la fecha completa con su hora. */
  private textoAplicacion(fecha: Date): string {
    const hoy = new Date();
    const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    const inicioManana = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1);
    const inicioFecha = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());

    const hora = `${fecha.getHours()}`.padStart(2, '0');
    const minuto = `${fecha.getMinutes()}`.padStart(2, '0');
    const horaTexto = `${hora}:${minuto}`;

    if (inicioFecha.getTime() === inicioHoy.getTime()) return `hoy ${horaTexto}`;
    if (inicioFecha.getTime() === inicioManana.getTime()) return `mañana ${horaTexto}`;

    const dia = `${fecha.getDate()}`.padStart(2, '0');
    const mes = `${fecha.getMonth() + 1}`.padStart(2, '0');
    return `${dia}/${mes}/${fecha.getFullYear()} ${horaTexto}`;
  }

  /** Fecha y hora actual en el formato que espera el backend. */
  private fechaHoraActual(): string {
    return this.aIsoLocal(new Date());
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
