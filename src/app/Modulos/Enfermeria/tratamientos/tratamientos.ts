import { Location } from '@angular/common';
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
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, forkJoin, Observable, Subscription, TimeoutError } from 'rxjs';
import { ArchivoService } from '../../../shared/archivos/archivoService';
import { PopUps } from '../../../shared/popUps/popUpsService';
import { VisorArchivos } from '../../../shared/visor-archivos/visor-archivos';
import { ArchivoVisor } from '../../../shared/visor-archivos/visor-archivos.interfaz';
import { ModalService } from '../../../modal-principal/modal-service';
import { TabSwitch } from '../../../shared/tab-switch/tab-switch';
import { AuthService } from '../../Auth/data/auth-service';
import { PropiedadRegistroService } from '../../Auth/data/propiedad-registro-service';
import { DatosPaciente } from '../../Medica/datos-paciente/datos-paciente';
import { EpisodioActivoService } from '../../Medica/data/episodio-activo-service';
import { IndicacionCuidadoService } from '../../Medica/indicaciones/cuidados/data/cuidado-service';
import { CuidadoResponse } from '../../Medica/indicaciones/cuidados/data/cuidadoInterfaz';
import {
  controlDeNombre,
  SeccionMonitoreoControl,
} from '../../Medica/indicaciones/cuidados/data/monitoreo';
import { IndicacionExamenService } from '../../Medica/indicaciones/examenes/data/examen-service';
import {
  ExamenArchivoResponse,
  ExamenResponse,
} from '../../Medica/indicaciones/examenes/data/examenInterfaz';
import { MedicamentoIndicacionService } from '../../Medica/indicaciones/medicamentos/data/medicamento-service';
import {
  descripcionMedicamentoCompleta,
  MedicamentoIndicacionResponse,
} from '../../Medica/indicaciones/medicamentos/data/medicamentoInterfaz';
import { ProcedimientoMedicoService } from '../../Medica/procedimiento-medico/data/procedimiento-medico-service';
import {
  RecursoDisponibleResponse,
  TipoRecursoProcedimientoApi,
} from '../../Medica/procedimiento-medico/data/procedimientoMedicoInterfaz';
import { SalidasService } from '../../Farmacia/salidas/data/salidas-service';
import { SolicitudSalidaCrearRequest } from '../../Farmacia/salidas/data/salidasInterfaz';
import {
  AplicacionMedicamentoResponse,
  DisponibilidadMedicamentoResponse,
  EjecucionCuidadoResponse,
} from '../data/registrosEnfermeriaInterfaz';
import { RegistrosEnfermeriaService } from '../data/registrosEnfermeriaService';
import { ControlHidricoService } from '../monitoreo/data/control-hidrico-service';
import { ControlHidricoResponse } from '../monitoreo/data/controlHidricoInterfaz';
import { GlucosaService } from '../monitoreo/data/glucosa-service';
import { GlucosaResponse } from '../monitoreo/data/glucosaInterfaz';
import { SignosVitalesService } from '../monitoreo/data/signos-vitales-service';
import { SignosVitalesResponse } from '../monitoreo/data/signosVitalesInterfaz';
import {
  AplicacionProgramada,
  calcularAplicaciones,
  estadoTratamiento,
  ProgramacionTratamiento,
  proximaAplicacion,
  ultimaAplicacionRegistrada,
} from './data/programacionTratamiento';
import { fueraDeRango } from '../../../shared/signos-vitales/rangos-signos-vitales';

/** Margen con el que se puede registrar una administración antes de la hora programada. */
const MARGEN_ADMINISTRACION_MS = 20 * 60 * 1000;

/** Secciones del submenú de indicaciones médicas de enfermería. */
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

/** Aplicación registrada de un medicamento o atención en el historial de la tarjeta. */
interface AplicacionMedicamentoVista {
  id: number;
  usuarioId: number;
  numero: number;
  estado: EstadoAplicacion;
  fechaHoraProgramada: string;
  fechaHora: string;
  fechaRegistro: string;
  usuario: string;
  observacion: string;
  cantidad: number | null;
  /** Registro de monitoreo vinculado cuando la ejecución proviene de un control. */
  monitoreoId: number | null;
  /** Sección de Monitoreo del registro vinculado. */
  monitoreoTipo: SeccionMonitoreoControl | null;
}

/** Resultados del control listos para la fila expandible del historial. */
interface ResultadoControlVista {
  filas: { etiqueta: string; valor: string; fueraRango?: boolean }[];
}

/** Aplicación programada de una indicación, con su registro si ya se capturó. */
interface AplicacionProgramadaVista {
  numero: number;
  fechaHora: string;
  registro: AplicacionMedicamentoVista | null;
}

/** Hora programada pendiente de la indicación, usada para fijar la próxima administración. */
interface HoraAdministracionVista {
  numero: number;
  valor: string;
  etiqueta: string;
}

/** Indicación cuyas aplicaciones registradas se muestran en la tabla de la tarjeta. */
interface IndicacionConAplicaciones {
  id: number;
  aplicaciones: AplicacionMedicamentoVista[];
}

/** Indicación cuya programación se calcula con la fecha de inicio y la frecuencia. */
interface IndicacionConProgramacion extends IndicacionConAplicaciones {
  fechaInicio: string;
  frecuencia: number | null;
  duracionTipo: TipoDuracionTratamiento | '';
  duracionCantidad: number | null;
  ultimaAplicacion: Date | null;
  proximaAplicacion: Date | null;
}

/** Medicamento indicado que muestra la tarjeta de tratamientos. */
interface MedicamentoIndicadoVista
  extends IndicacionConMetaVista,
    IndicacionConProgramacion {
  nombre: string;
  /** Nombre con marca, presentación y vía de administración. */
  descripcion: string;
  cantidad: number;
  unidad: string;
  frecuencia: number;
  duracionTipo: TipoDuracionTratamiento;
  duracionCantidad: number | null;
  medicamentoLibre: boolean;
  medicamentoLogId: number | null;
  disponiblePiso: number;
}

/** Examen indicado que muestra la tarjeta de tratamientos. */
interface ExamenIndicadoVista extends IndicacionTratamientoVista {
  nombre: string;
  archivos: ExamenArchivoResponse[];
  fecha: string;
  hora: string;
  usuario: string;
}

/** Monitoreo tomado desde una atención y pendiente de guardar como ejecución. */
interface ControlTomadoPendiente {
  cuidadoId: number;
  fechaHoraProgramada: string;
  monitoreoId: number;
  tipo: SeccionMonitoreoControl;
}

/** Atención indicada que muestra la tarjeta de indicaciones médicas. */
interface CuidadoIndicadoVista extends IndicacionConMetaVista, IndicacionConProgramacion {
  nombre: string;
  frecuencia: number | null;
  duracionTipo: TipoDuracionTratamiento | '';
  duracionCantidad: number | null;
  /** La atención es un control de Monitoreo y no debe solicitar medicamentos. */
  esControl: boolean;
  /** Sección de Monitoreo a la que se dirige el control. */
  seccionMonitoreo: SeccionMonitoreoControl | null;
}

/** Recurso (medicamento o insumo) agregado a la solicitud de farmacia. */
interface MedicamentoSolicitadoVista {
  id: number;
  nombre: string;
  cantidad: number;
  tipo: TipoRecursoProcedimientoApi;
}

/**
 * Indicaciones médicas de enfermería: medicamentos, exámenes y atenciones, con el registro de las
 * aplicaciones y ejecuciones realizadas por Enfermería.
 */
@Component({
  selector: 'app-tratamientos',
  imports: [FormsModule, DatosPaciente, TabSwitch],
  templateUrl: './tratamientos.html',
  styleUrl: './tratamientos.scss',
})
export class Tratamientos implements OnInit, OnDestroy {
  private readonly popUps = inject(PopUps);
  private readonly authService = inject(AuthService);
  private readonly propiedadRegistro = inject(PropiedadRegistroService);
  private readonly episodioActivo = inject(EpisodioActivoService);
  private readonly servicioProcedimientos = inject(ProcedimientoMedicoService);
  private readonly salidas = inject(SalidasService);
  private readonly servicioMedicamentos = inject(MedicamentoIndicacionService);
  private readonly servicioCuidados = inject(IndicacionCuidadoService);
  private readonly servicioExamenes = inject(IndicacionExamenService);
  private readonly registrosEnfermeria = inject(RegistrosEnfermeriaService);
  private readonly servicioSignos = inject(SignosVitalesService);
  private readonly servicioGlucosa = inject(GlucosaService);
  private readonly servicioHidrico = inject(ControlHidricoService);
  private readonly archivos = inject(ArchivoService);
  private readonly modalService = inject(ModalService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly cdr = inject(ChangeDetectorRef);

  /** Archivos que admite el gestor de exámenes, incluido TXT. */
  readonly aceptadosExamen = `${this.archivos.aceptados},.txt`;

  /** Input oculto con el que se cargan los archivos del examen. */
  @ViewChild('inputArchivosExamen') private inputArchivosExamen?: ElementRef<HTMLInputElement>;

  /** La ficha con los datos del paciente está desplegada; la abre su pestaña lateral. */
  pacienteAbierto = false;


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
  /** Hora programada elegida para la nueva administración. */
  horaAdministracion = '';

  /** Opciones del desplegable del estado de la administración. */
  readonly estadosAdministracion: EstadoAdministracionVista[] = [
    { id: 'administrado', nombre: 'Administrado' },
    { id: 'noAdministrado', nombre: 'No administrado' },
  ];

  /** Búsqueda y selección de recursos (medicamentos o insumos) para la solicitud a farmacia. */
  tipoBusqueda: TipoRecursoProcedimientoApi = 'MEDICAMENTO';
  textoBusquedaMedicamento = '';
  busquedaMedicamentoRealizada = false;
  cargandoMedicamentos = false;
  medicamentosEncontrados: RecursoDisponibleResponse[] = [];
  medicamentoSeleccionado: RecursoDisponibleResponse | null = null;
  cantidadMedicamento: number | null = null;
  medicamentosSolicitados: MedicamentoSolicitadoVista[] = [];

  /** Estado del envío de la solicitud. */
  enviandoSolicitud = false;

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
  confirmandoAccion = false;
  subiendoArchivosExamen = false;

  /** Indicación seleccionada en el listado; recibe la próxima administración o ejecución. */
  private indicacionSeleccionadaId: number | null = null;

  /** Atención que debe quedar seleccionada al volver desde el registro de un control. */
  private indicacionPendiente: number | null = null;

  /** Hora programada que se registró en Monitoreo y debe mostrarse al volver. */
  private horaControlPendiente: string | null = null;

  /** Monitoreo tomado que todavía no se guarda como ejecución de la atención. */
  private controlTomadoPendiente: ControlTomadoPendiente | null = null;

  /** Medicamento cuyo historial de aplicaciones está desplegado; null si ninguno. */
  private indicacionAplicacionesAbierta: number | null = null;

  /** Examen que recibirá los archivos elegidos. */
  private examenCargandoArchivos: number | null = null;

  /** Aplicación del historial que se está editando; null si no hay ninguna. */
  private aplicacionEnEdicion: {
    seccion: SeccionTratamiento;
    indicacionId: number;
    registroId: number;
    numero: number;
    estadoOriginal: EstadoAplicacion;
    cantidadOriginal: number | null;
    observacionOriginal: string;
    fechaOriginal: string;
  } | null = null;

  private peticionIndicaciones?: Subscription;
  private peticionAccion?: Subscription;
  private peticionArchivos?: Subscription;
  private peticionSolicitud?: Subscription;
  private peticionResultado?: Subscription;
  private destruido = false;

  /** Ejecución cuyos resultados están desplegados en el historial; null si ninguna. */
  resultadoAbierto: number | null = null;

  /** Resultados del control desplegado. */
  resultadoActual: ResultadoControlVista | null = null;

  /** Estados de carga y error de los resultados del control. */
  cargandoResultado = false;
  errorResultado = false;

  /** Resultados ya consultados por ejecución, para no repetir la petición. */
  private readonly resultadosPorEjecucion = new Map<number, ResultadoControlVista>();

  /** Secciones del rail de indicaciones médicas. */
  readonly secciones: SeccionTratamientoVista[] = [
    { id: 'medicamentos', titulo: 'Medicamentos', icono: 'bi-capsule' },
    { id: 'examenes', titulo: 'Exámenes', icono: 'bi-clipboard2-pulse' },
    { id: 'cuidados', titulo: 'Atenciones', icono: 'bi-heart-pulse' },
  ];

  /** Opciones del filtro del listado de indicaciones. */
  readonly filtros: FiltroTratamientoVista[] = [
    { id: 'pendientes', etiqueta: 'Pendientes' },
    { id: 'realizadas', etiqueta: 'Realizadas' },
  ];

  ngOnInit(): void {
    this.leerRetornoControl();
    this.cargarIndicaciones();
  }

  /** Abre Atenciones y recuerda la atención que vuelve desde el registro de un control. */
  private leerRetornoControl(): void {
    const params = this.route.snapshot.queryParamMap;
    const seccion = params.get('seccion');
    const indicacionId = Number(params.get('indicacionId'));

    if (seccion !== 'cuidados' || !Number.isInteger(indicacionId) || indicacionId <= 0) {
      return;
    }

    this.seccionActiva = 'cuidados';
    this.indicacionPendiente = indicacionId;

    const fechaHoraProgramada = params.get('fechaHoraProgramada');
    const monitoreoId = Number(params.get('monitoreoId'));
    const tipo = params.get('tipoMonitoreo');

    if (
      fechaHoraProgramada &&
      Number.isInteger(monitoreoId) &&
      monitoreoId > 0 &&
      tipo &&
      ['signos', 'hidrico', 'glucosa'].includes(tipo)
    ) {
      this.horaControlPendiente = fechaHoraProgramada;
      this.controlTomadoPendiente = {
        cuidadoId: indicacionId,
        fechaHoraProgramada,
        monitoreoId,
        tipo: tipo as SeccionMonitoreoControl,
      };
    }

    // Los parámetros son de un solo uso; evita repetir el mensaje al recargar
    this.location.replaceState('/enfermeria/tratamientos');
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.peticionIndicaciones?.unsubscribe();
    this.peticionAccion?.unsubscribe();
    this.peticionArchivos?.unsubscribe();
    this.peticionSolicitud?.unsubscribe();
    this.peticionResultado?.unsubscribe();
  }

  /** El episodio es un historial cerrado: se consulta, pero no se registran cambios. */
  get soloLectura(): boolean {
    return this.episodioActivo.esSoloLectura();
  }

  /** Solo el autor del registro (o un rol global) puede editarlo o eliminarlo. */
  puedeGestionar(usuarioId: number): boolean {
    return !this.soloLectura && this.propiedadRegistro.puedeGestionar(usuarioId);
  }

  /** Datos de la sección activa que se muestran en el listado. */
  get seccionActual(): SeccionTratamientoVista {
    return this.secciones.find((seccion) => seccion.id === this.seccionActiva) ?? this.secciones[0];
  }

  /** Título del listado de la sección activa, con la concordancia de género. */
  get tituloListado(): string {
    return this.seccionActiva === 'cuidados'
      ? `${this.seccionActual.titulo} indicadas`
      : `${this.seccionActual.titulo} indicados`;
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

  /** Al marcar la administración como no realizada se descarta la cantidad. */
  alCambiarEstadoAdministracion(estado: EstadoAdministracion): void {
    if (estado === 'noAdministrado') this.cantidadAdministrada = null;
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
    if (
      this.soloLectura ||
      this.guardandoAdministracion ||
      this.confirmandoAccion ||
      this.estadoAdministracion === ''
    ) {
      return false;
    }
    if (!this.horaAdministracion && !this.permiteHoraManual) return false;
    if (this.administracionDemasiadoTemprana) return false;
    if (this.aplicacionEnEdicion && !this.hayCambiosEnEdicion) return false;

    if (this.controlSeleccionado) {
      if (this.estadoAdministracion === 'noAdministrado') {
        return this.observacionAdministracion.trim().length > 0;
      }
      return this.controlTomado || this.controlRegistrado;
    }

    if (this.seccionActiva !== 'medicamentos') return true;
    if (this.estadoAdministracion === 'noAdministrado') return true;

    const cantidad = this.cantidadAdministrada;
    if (cantidad === null || cantidad <= 0) return false;

    return cantidad <= this.disponibleParaAdministrar;
  }

  /** Medicamento seleccionado para registrar su administración. */
  private get medicamentoSeleccionadoParaAdministrar(): MedicamentoIndicadoVista | null {
    if (this.seccionActiva !== 'medicamentos' || this.indicacionSeleccionadaId === null) {
      return null;
    }
    return this.medicamentos.find((item) => item.id === this.indicacionSeleccionadaId) ?? null;
  }

  /** Stock en piso disponible para la administración, sumando lo de la aplicación en edición. */
  get disponibleParaAdministrar(): number {
    const medicamento = this.medicamentoSeleccionadoParaAdministrar;
    if (!medicamento) return 0;

    let disponible = medicamento.disponiblePiso;
    if (this.aplicacionEnEdicion && this.aplicacionEnEdicion.seccion === 'medicamentos') {
      const registro = medicamento.aplicaciones.find(
        (aplicacion) => aplicacion.id === this.aplicacionEnEdicion?.registroId,
      );
      if (registro && registro.estado === 'administrado' && registro.cantidad !== null) {
        disponible += registro.cantidad;
      }
    }

    return disponible;
  }

  /** Indica si la cantidad a administrar supera el stock en piso del medicamento. */
  get sinStockParaAdministrar(): boolean {
    if (this.seccionActiva !== 'medicamentos' || this.estadoAdministracion !== 'administrado') {
      return false;
    }
    const medicamento = this.medicamentoSeleccionadoParaAdministrar;
    if (!medicamento || medicamento.medicamentoLibre) return false;

    const cantidad = this.cantidadAdministrada;
    if (cantidad === null || cantidad <= 0) return false;

    return cantidad > this.disponibleParaAdministrar;
  }

  /** Indica si el formulario está editando una aplicación del historial. */
  get editandoAplicacion(): boolean {
    return this.aplicacionEnEdicion !== null;
  }

  /** Verdadero si el registro en edición tiene al menos un campo modificado. */
  private get hayCambiosEnEdicion(): boolean {
    const edicion = this.aplicacionEnEdicion;
    if (!edicion) return true;

    return (
      this.estadoAdministracion !== edicion.estadoOriginal ||
      this.cantidadAdministrada !== edicion.cantidadOriginal ||
      this.observacionAdministracion !== edicion.observacionOriginal ||
      this.horaAdministracion !== edicion.fechaOriginal
    );
  }

  /** Título del panel lateral según la sección y el modo del formulario. */
  get tituloPanelLateral(): string {
    if (this.editandoAplicacion) {
      return this.seccionActiva === 'cuidados' ? 'Editar atención' : 'Editar aplicación';
    }

    if (this.seccionActiva === 'medicamentos') return 'Registrar administración';
    if (this.seccionActiva === 'cuidados') return 'Registrar atención';
    return 'Historial';
  }

  /** Indica si la indicación está seleccionada en el listado. */
  estaSeleccionada(id: number): boolean {
    return this.indicacionSeleccionadaId === id;
  }

  /** Control de Monitoreo seleccionado en la sección de atenciones. */
  get controlSeleccionado(): CuidadoIndicadoVista | null {
    if (this.seccionActiva !== 'cuidados' || this.indicacionSeleccionadaId === null) {
      return null;
    }

    const cuidado = this.cuidados.find((item) => item.id === this.indicacionSeleccionadaId);
    return cuidado?.esControl ? cuidado : null;
  }

  /** El control de la hora elegida ya tiene un registro de monitoreo vinculado. */
  get controlRegistrado(): boolean {
    const control = this.controlSeleccionado;
    if (!control || !this.horaAdministracion) return false;

    return control.aplicaciones.some(
      (aplicacion) =>
        aplicacion.monitoreoId !== null &&
        this.aIsoLocal(new Date(aplicacion.fechaHoraProgramada)) === this.horaAdministracion,
    );
  }

  /** Hay un monitoreo tomado desde esta atención pendiente de guardarse. */
  get controlTomado(): boolean {
    const pendiente = this.controlTomadoPendiente;
    return (
      pendiente !== null &&
      this.controlSeleccionado?.id === pendiente.cuidadoId &&
      this.horaAdministracion === pendiente.fechaHoraProgramada
    );
  }

  /** El control seleccionado está marcado como no realizado y exige un motivo. */
  get esControlNoRealizado(): boolean {
    return this.controlSeleccionado !== null && this.estadoAdministracion === 'noAdministrado';
  }

  /** El control puede registrarse cuando está realizado y aún no tiene monitoreo vinculado. */
  get puedeRegistrarControl(): boolean {
    return (
      !this.soloLectura &&
      !this.guardandoAdministracion &&
      this.estadoAdministracion === 'administrado' &&
      this.controlSeleccionado !== null &&
      !this.controlRegistrado &&
      !this.controlTomado &&
      !this.administracionDemasiadoTemprana &&
      this.horaAdministracion.trim().length > 0
    );
  }

  /** Horas programadas pendientes de la indicación seleccionada, más la del registro en edición. */
  get horasAdministracion(): HoraAdministracionVista[] {
    const indicacion = this.indicacionSeleccionada;
    if (!indicacion) return [];

    const opciones = this.programadasParaAdministrar(indicacion)
      .filter((aplicacion) => !this.aplicacionRegistrada(indicacion, aplicacion.fechaHora))
      .map((aplicacion) => ({
        numero: aplicacion.numero,
        valor: this.aIsoLocal(aplicacion.fechaHora),
        etiqueta: this.formatearFechaHora(aplicacion.fechaHora),
      }));

    if (this.aplicacionEnEdicion && this.aplicacionEnEdicion.indicacionId === indicacion.id) {
      const registro = indicacion.aplicaciones.find(
        (aplicacion) => aplicacion.id === this.aplicacionEnEdicion?.registroId,
      );
      if (registro) {
        const fecha = new Date(registro.fechaHoraProgramada);
        const valor = this.aIsoLocal(fecha);
        if (!opciones.some((opcion) => opcion.valor === valor)) {
          opciones.unshift({
            numero: registro.numero,
            valor,
            etiqueta: this.formatearFechaHora(fecha),
          });
        }
      }
    }

    return opciones;
  }

  /** Fecha y hora que se registrará: la próxima pendiente o el registro en edición. */
  get etiquetaHoraAdministracion(): string {
    const fecha = this.fechaAdministracion;
    return fecha ? this.formatearFechaHora(fecha) : '';
  }

  /** La administración nueva solo se habilita 20 minutos antes de la hora programada. */
  get administracionDemasiadoTemprana(): boolean {
    if (this.editandoAplicacion || this.permiteHoraManual || this.controlTomado) return false;

    const programada = this.fechaAdministracion;
    return programada !== null && Date.now() < programada.getTime() - MARGEN_ADMINISTRACION_MS;
  }

  /** La administración se registra después de la hora programada. */
  get administracionFueraDeHorario(): boolean {
    if (this.editandoAplicacion || this.permiteHoraManual || this.controlTomado) return false;

    const programada = this.fechaAdministracion;
    return programada !== null && Date.now() > programada.getTime();
  }

  /** Hora desde la que se habilita el registro: la programada menos 20 minutos. */
  get horaDesdeAdministracion(): string {
    const programada = this.fechaAdministracion;
    return programada
      ? this.formatearHora(new Date(programada.getTime() - MARGEN_ADMINISTRACION_MS))
      : '';
  }

  private get fechaAdministracion(): Date | null {
    if (!this.horaAdministracion) return null;

    const fecha = new Date(this.horaAdministracion);
    return Number.isNaN(fecha.getTime()) ? null : fecha;
  }

  /** Próxima aplicación pendiente de la indicación; incluye la siguiente dosis de series indefinidas. */
  private get proximaAdministracion(): Date | null {
    const indicacion = this.indicacionSeleccionada;
    if (!indicacion) return null;

    return proximaAplicacion(
      this.programacionDeVista(indicacion),
      indicacion.aplicaciones,
      new Date(),
    );
  }

  /**
   * La atención no genera horas programadas (sin frecuencia, duración o inicio), así que la
   * fecha y hora de realización se captura manualmente para poder registrar la ejecución.
   */
  get permiteHoraManual(): boolean {
    if (this.seccionActiva !== 'cuidados') return false;

    const indicacion = this.indicacionSeleccionada;
    return indicacion !== null && this.programadasParaAdministrar(indicacion).length === 0;
  }

  private get indicacionSeleccionada(): IndicacionConProgramacion | null {
    const id = this.indicacionSeleccionadaId;
    if (id === null) return null;

    const lista: IndicacionConProgramacion[] =
      this.seccionActiva === 'medicamentos'
        ? this.medicamentos
        : this.seccionActiva === 'cuidados'
          ? this.cuidados
          : [];

    return lista.find((indicacion) => indicacion.id === id) ?? null;
  }

  /** Máximo que se puede agregar del recurso seleccionado. */
  get cantidadMaximaMedicamento(): number {
    const seleccionado = this.medicamentoSeleccionado;
    if (!seleccionado) return 0;

    const existente = this.medicamentosSolicitados.find(
      (medicamento) =>
        medicamento.id === seleccionado.id && medicamento.tipo === this.tipoBusqueda,
    );

    return Math.max(0, seleccionado.disponible - (existente?.cantidad ?? 0));
  }

  /** Se puede agregar el medicamento seleccionado con la cantidad indicada. */
  get puedeAgregarMedicamento(): boolean {
    return (
      !this.soloLectura &&
      !this.cargandoMedicamentos &&
      !this.enviandoSolicitud &&
      this.medicamentoSeleccionado !== null &&
      this.cantidadMedicamento !== null &&
      Number.isInteger(this.cantidadMedicamento) &&
      this.cantidadMedicamento > 0 &&
      this.cantidadMedicamento <= this.cantidadMaximaMedicamento
    );
  }

  /** La solicitud se puede enviar con al menos un recurso agregado. */
  get puedeEnviarSolicitud(): boolean {
    return (
      !this.soloLectura && !this.enviandoSolicitud && this.medicamentosSolicitados.length > 0
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
      this.asegurarIndicacionSeleccionada();
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
      disponibilidad: this.registrosEnfermeria.buscarDisponibilidadPorEpisodio(episodioId),
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
          const disponibilidad = new Map(
            datos.disponibilidad.map((item) => [item.medicamentoLogId, item.disponible]),
          );

          this.medicamentos = datos.medicamentos.map((indicacion) =>
            this.aMedicamentoVista(
              indicacion,
              aplicaciones.get(indicacion.id) ?? [],
              disponibilidad,
            ),
          );
          this.cuidados = datos.cuidados.map((indicacion) =>
            this.aCuidadoVista(indicacion, ejecuciones.get(indicacion.id) ?? []),
          );
          this.examenes = datos.examenes.map((examen) => this.aExamenVista(examen));
          this.asegurarIndicacionSeleccionada();
        },
        error: (error) => {
          if (this.destruido) return;

          this.medicamentos = [];
          this.examenes = [];
          this.cuidados = [];
          this.errorCargaIndicaciones = true;
          this.asegurarIndicacionSeleccionada();
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
  /** Abre la solicitud a farmacia con las dos secciones de la pantalla. */
  abrirSolicitudMedicamento(): void {
    if (this.soloLectura) return;

    this.solicitandoMedicamento = true;
    this.indicacionAplicacionesAbierta = null;
    this.limpiarSolicitudMedicamento();

    if (this.aplicacionEnEdicion) {
      this.limpiarFormularioAdministracion();
    }
  }

  /** Vuelve al listado de indicaciones médicas. */
  cerrarSolicitudMedicamento(): void {
    this.solicitandoMedicamento = false;
  }

  /** Abre la solicitud prellenada con el medicamento de la tarjeta y su cantidad calculada. */
  solicitarParaMedicamento(indicacion: MedicamentoIndicadoVista): void {
    if (this.soloLectura) return;

    this.abrirSolicitudMedicamento();

    if (indicacion.medicamentoLibre || indicacion.medicamentoLogId === null) return;

    const cantidad = this.cantidadSolicitadaPara(indicacion);
    if (cantidad <= 0) return;

    this.medicamentosSolicitados = [
      {
        id: indicacion.medicamentoLogId,
        nombre: indicacion.nombre,
        cantidad,
        tipo: 'MEDICAMENTO',
      },
    ];
  }

  /** Cantidad a solicitar: aplicaciones pendientes multiplicadas por la dosis. */
  private cantidadSolicitadaPara(indicacion: MedicamentoIndicadoVista): number {
    if (indicacion.medicamentoLibre) return 0;

    if (indicacion.duracionTipo === 'indefinida') {
      return indicacion.cantidad;
    }

    const pendientes = this.aplicacionesProgramadas(indicacion).filter(
      (aplicacion) => !aplicacion.registro || aplicacion.registro.estado !== 'administrado',
    ).length;

    return pendientes * indicacion.cantidad;
  }

  /** Corrige la cantidad editada en la lista para mantenerla válida (entero mayor a 0). */
  ajustarCantidadSolicitada(item: MedicamentoSolicitadoVista): void {
    if (!Number.isInteger(item.cantidad) || item.cantidad < 1) {
      item.cantidad = 1;
    }
  }

  /** Cambia entre medicamentos e insumos y reinicia la búsqueda. */
  cambiarTipoBusqueda(esMedicamento: boolean): void {
    this.tipoBusqueda = esMedicamento ? 'MEDICAMENTO' : 'INSUMO';
    this.cancelarSeleccionMedicamento();
  }

  /** Etiqueta del tipo de recurso activo en la búsqueda. */
  get etiquetaRecursoBusqueda(): string {
    return this.tipoBusqueda === 'MEDICAMENTO' ? 'medicamento' : 'insumo';
  }

  /** Busca recursos del tipo activo en el catálogo de farmacia. */
  buscarMedicamentos(): void {
    if (this.cargandoMedicamentos) return;

    this.busquedaMedicamentoRealizada = true;
    this.cargandoMedicamentos = true;
    this.medicamentoSeleccionado = null;
    this.cantidadMedicamento = null;
    this.medicamentosEncontrados = [];
    this.servicioProcedimientos
      .buscarRecursos(this.tipoBusqueda, this.textoBusquedaMedicamento)
      .pipe(
        finalize(() => {
          this.cargandoMedicamentos = false;
          if (!this.destruido) this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (medicamentos) => {
          this.medicamentosEncontrados = medicamentos;
          if (!this.destruido) this.cdr.markForCheck();
        },
        error: (error) => {
          this.medicamentosEncontrados = [];
          if (!this.destruido) this.cdr.markForCheck();
          this.mostrarError(error, 'No se pudo buscar en farmacia.');
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

  /** Agrega el recurso seleccionado a la solicitud. */
  agregarMedicamento(): void {
    const seleccionado = this.medicamentoSeleccionado;
    const cantidad = this.cantidadMedicamento;

    if (!seleccionado || cantidad === null || !this.puedeAgregarMedicamento) return;

    const tipo = this.tipoBusqueda;
    const existente = this.medicamentosSolicitados.find(
      (medicamento) => medicamento.id === seleccionado.id && medicamento.tipo === tipo,
    );

    if (existente) {
      this.medicamentosSolicitados = this.medicamentosSolicitados.map((medicamento) =>
        medicamento.id === seleccionado.id && medicamento.tipo === tipo
          ? { ...medicamento, cantidad: medicamento.cantidad + cantidad }
          : medicamento,
      );
    } else {
      this.medicamentosSolicitados = [
        ...this.medicamentosSolicitados,
        { id: seleccionado.id, nombre: seleccionado.nombre, cantidad, tipo },
      ];
    }

    this.cancelarSeleccionMedicamento();
  }

  /** Quita un recurso de la solicitud. */
  quitarMedicamento(tipo: TipoRecursoProcedimientoApi, id: number): void {
    this.medicamentosSolicitados = this.medicamentosSolicitados.filter(
      (medicamento) => medicamento.id !== id || medicamento.tipo !== tipo,
    );
  }

  /** Deja la solicitud lista para empezar de nuevo. */
  limpiarSolicitudMedicamento(): void {
    this.medicamentosSolicitados = [];
    this.cancelarSeleccionMedicamento();
  }

  /** Envía a farmacia la solicitud con los recursos agregados. */
  enviarSolicitudMedicamento(): void {
    if (this.soloLectura || this.enviandoSolicitud) return;

    const episodioId = this.episodioActivo.obtener();
    const usuarioId = this.authService.currentUser()?.id;

    if (!this.medicamentosSolicitados.length) {
      this.popUps.advertencia('Agregue al menos un recurso a la solicitud.');
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

    const request: SolicitudSalidaCrearRequest = {
      episodioId,
      usuarioId,
      recursos: this.medicamentosSolicitados.map((medicamento) => ({
        tipo: medicamento.tipo,
        referenciaId: medicamento.id,
        cantidad: medicamento.cantidad,
      })),
    };

    this.enviandoSolicitud = true;
    this.peticionSolicitud?.unsubscribe();
    this.peticionSolicitud = this.salidas
      .crearSolicitud(request)
      .pipe(
        finalize(() => {
          this.enviandoSolicitud = false;
          if (!this.destruido) this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.popUps.exito('Solicitud enviada a farmacia.');
          this.limpiarSolicitudMedicamento();
          this.solicitandoMedicamento = false;
          if (!this.destruido) this.cdr.markForCheck();
        },
        error: (error) => {
          if (!this.destruido) this.cdr.markForCheck();
          this.mostrarError(error, 'No se pudo enviar la solicitud a farmacia.');
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
      onEliminar: (archivo: ArchivoVisor) =>
        this.servicioExamenes.eliminarArchivo(examen.id, Number(archivo.id)),
      onCambio: () => this.cargarIndicaciones(),
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

  // ------------------- FICHA DEL PACIENTE -------------------
  /**
   * Abre o cierra la ficha del paciente. Al desplegarla se muestra también su cuerpo para que el
   * usuario vea los datos completos de contexto.
   */
  cambiarFichaPaciente(abierto: boolean): void {
    this.pacienteAbierto = abierto;
  }

  // ------------------- NAVEGACIÓN Y FILTROS -------------------
  /** Selecciona la indicación que recibirá la administración o ejecución. */
  seleccionarIndicacion(id: number): void {
    this.indicacionSeleccionadaId = id;
    this.actualizarHoraAdministracion(true);
    this.cerrarResultado();

    if (this.aplicacionEnEdicion) {
      this.limpiarFormularioAdministracion();
    }
  }

  /** Muestra la sección pulsada del rail y cierra el historial desplegado. */
  seleccionarSeccion(id: SeccionTratamiento): void {
    this.seccionActiva = id;
    this.indicacionAplicacionesAbierta = null;
    this.indicacionSeleccionadaId = null;
    this.solicitandoMedicamento = false;
    this.cerrarResultado();

    if (this.aplicacionEnEdicion) {
      this.limpiarFormularioAdministracion();
    }

    this.asegurarIndicacionSeleccionada();
  }

  /** Muestra las indicaciones del estado elegido y cierra el historial desplegado. */
  seleccionarFiltro(filtro: FiltroTratamiento): void {
    this.filtroActivo = filtro;
    this.indicacionAplicacionesAbierta = null;
    this.cerrarResultado();

    if (this.aplicacionEnEdicion) {
      this.limpiarFormularioAdministracion();
    }

    this.asegurarIndicacionSeleccionada();
  }

  /** Abre Monitoreo en la sección del control seleccionado para registrar sus datos. */
  registrarControl(): void {
    const control = this.controlSeleccionado;
    if (!this.puedeRegistrarControl || !control || !control.seccionMonitoreo) return;

    this.router.navigate(['/enfermeria', 'monitoreo'], {
      queryParams: {
        seccion: control.seccionMonitoreo,
        cuidadoId: control.id,
        fechaHoraProgramada: this.horaAdministracion,
      },
    });
  }

  // ------------------- ADMINISTRACIÓN Y EJECUCIÓN -------------------
  /** Deja el formulario de administración listo para un nuevo registro. */
  limpiarFormularioAdministracion(): void {
    this.estadoAdministracion = '';
    this.cantidadAdministrada = null;
    this.observacionAdministracion = '';
    this.horaAdministracion = '';
    this.aplicacionEnEdicion = null;
    this.controlTomadoPendiente = null;
    this.actualizarHoraAdministracion();
  }

  /** Guarda la administración o ejecución contra el backend; confirma antes de actualizar. */
  async guardarAdministracion(): Promise<void> {
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
    const indicacionId = edicion?.indicacionId ?? this.indicacionSeleccionadaId;

    if (indicacionId === null) {
      this.popUps.advertencia('Seleccione una indicación para registrar la administración.');
      return;
    }

    if (!this.horaAdministracion) {
      if (this.permiteHoraManual) {
        // Sin programación no se elige hora: se registra el momento en que se guarda
        this.horaAdministracion = this.aIsoLocal(new Date());
      } else {
        this.popUps.advertencia('Seleccione la fecha y hora de la administración.');
        return;
      }
    }

    if (edicion) {
      this.confirmandoAccion = true;
      this.cdr.markForCheck();
      const confirmado = await this.popUps
        .confirmarToast(`¿Está seguro de guardar los cambios del registro No. ${edicion.numero}?`)
        .catch(() => false);
      this.confirmandoAccion = false;
      this.cdr.markForCheck();

      if (!confirmado || this.destruido) return;
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

      const request = {
        indicacionMedicamentoId: indicacion.id,
        fechaHoraProgramada: this.horaAdministracion,
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

      const controlPendiente =
        edicion === null && this.controlTomado ? this.controlTomadoPendiente : null;
      const request = {
        cuidadoId: cuidado.id,
        fechaHoraProgramada: this.horaAdministracion,
        estado: estado === 'administrado' ? ('REALIZADO' as const) : ('NO_REALIZADO' as const),
        observacion,
        usuarioId,
        signosVitalesId:
          estado === 'administrado' && controlPendiente?.tipo === 'signos'
            ? controlPendiente.monitoreoId
            : null,
        glucosaId:
          estado === 'administrado' && controlPendiente?.tipo === 'glucosa'
            ? controlPendiente.monitoreoId
            : null,
        controlHidricoId:
          estado === 'administrado' && controlPendiente?.tipo === 'hidrico'
            ? controlPendiente.monitoreoId
            : null,
      };

      const ejecucionRegistrada =
        edicion === null && this.controlSeleccionado
          ? this.controlSeleccionado.aplicaciones.find(
              (aplicacion) =>
                this.aIsoLocal(new Date(aplicacion.fechaHoraProgramada)) ===
                this.horaAdministracion,
            )
          : undefined;
      const registroId = edicion?.registroId ?? ejecucionRegistrada?.id ?? null;

      this.peticionAccion = (registroId !== null
        ? this.registrosEnfermeria.actualizarEjecucion(registroId, request)
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
            this.mostrarError(error, 'No se pudo guardar la ejecución de la atención.'),
        });
      return;
    }

    this.guardandoAdministracion = false;
  }

  private administracionGuardada(): void {
    const eraControl = this.controlSeleccionado !== null;
    const indicacionId = this.indicacionSeleccionadaId;

    this.limpiarFormularioAdministracion();

    if (eraControl && indicacionId !== null) {
      this.indicacionPendiente = indicacionId;
    }

    this.popUps.exito(
      this.seccionActiva === 'cuidados'
        ? 'Atención registrada exitosamente.'
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
    const abriendo = this.indicacionAplicacionesAbierta !== id;
    this.indicacionAplicacionesAbierta = abriendo ? id : null;

    if (!abriendo) {
      this.cerrarResultado();
    }

    if (this.aplicacionEnEdicion) {
      this.limpiarFormularioAdministracion();
    }
  }

  /** Indica si la ejecución tiene resultados de monitoreo u observación que mostrar. */
  tieneDetalle(registro: AplicacionMedicamentoVista): boolean {
    // En medicamentos siempre se puede consultar el detalle; en atenciones hace falta contenido
    if (this.seccionActiva === 'medicamentos') return true;
    return registro.monitoreoId !== null || registro.observacion.trim().length > 0;
  }

  /** Despliega los resultados del control o la observación de la ejecución. */
  verResultados(registro: AplicacionMedicamentoVista): void {
    if (!this.tieneDetalle(registro)) return;

    if (this.resultadoAbierto === registro.id) {
      this.cerrarResultado();
      return;
    }

    this.resultadoAbierto = registro.id;
    this.peticionResultado?.unsubscribe();
    this.resultadoActual = null;
    this.cargandoResultado = false;
    this.errorResultado = false;

    if (registro.monitoreoId === null || registro.monitoreoTipo === null) {
      return;
    }

    const cache = this.resultadosPorEjecucion.get(registro.id);
    if (cache) {
      this.resultadoActual = cache;
      return;
    }

    this.cargandoResultado = true;
    this.cargarResultado(registro);
  }

  /** Oculta los resultados y vuelve a la tabla del historial. */
  cerrarResultado(): void {
    this.peticionResultado?.unsubscribe();
    this.resultadoAbierto = null;
    this.resultadoActual = null;
    this.cargandoResultado = false;
    this.errorResultado = false;
  }

  private cargarResultado(registro: AplicacionMedicamentoVista): void {
    const id = registro.monitoreoId;
    if (id === null || registro.monitoreoTipo === null) return;

    if (registro.monitoreoTipo === 'signos') {
      this.suscribirResultado(this.servicioSignos.obtenerPorId(id), registro.id, (respuesta) =>
        this.resultadoSignos(respuesta),
      );
      return;
    }

    if (registro.monitoreoTipo === 'glucosa') {
      this.suscribirResultado(this.servicioGlucosa.obtenerPorId(id), registro.id, (respuesta) =>
        this.resultadoGlucosa(respuesta),
      );
      return;
    }

    this.suscribirResultado(this.servicioHidrico.obtenerPorId(id), registro.id, (respuesta) =>
      this.resultadoHidrico(respuesta),
    );
  }

  private suscribirResultado<T>(
    peticion: Observable<T>,
    ejecucionId: number,
    mapear: (respuesta: T) => ResultadoControlVista,
  ): void {
    this.peticionResultado?.unsubscribe();
    this.peticionResultado = peticion
      .pipe(
        finalize(() => {
          this.cargandoResultado = false;
          if (!this.destruido) this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (respuesta) => {
          if (this.destruido || this.resultadoAbierto !== ejecucionId) return;

          const vista = mapear(respuesta);
          this.resultadoActual = vista;
          this.resultadosPorEjecucion.set(ejecucionId, vista);
        },
        error: (error) => {
          if (this.destruido) return;

          this.errorResultado = true;
          this.mostrarError(error, 'No se pudieron cargar los resultados del control.');
        },
      });
  }

  private resultadoSignos(respuesta: SignosVitalesResponse): ResultadoControlVista {
    return {
      filas: [
        {
          etiqueta: 'Presión arterial',
          valor: `${respuesta.sistolica}/${respuesta.diastolica} mmHg`,
          fueraRango:
            fueraDeRango('sistolica', respuesta.sistolica) ||
            fueraDeRango('diastolica', respuesta.diastolica),
        },
        {
          etiqueta: 'Fr. cardíaca',
          valor: `${respuesta.frecuenciaCardiaca} lpm`,
          fueraRango: fueraDeRango('frecuenciaCardiaca', respuesta.frecuenciaCardiaca),
        },
        {
          etiqueta: 'Fr. respiratoria',
          valor: `${respuesta.frecuenciaRespiratoria} rpm`,
          fueraRango: fueraDeRango('frecuenciaRespiratoria', respuesta.frecuenciaRespiratoria),
        },
        {
          etiqueta: 'Temperatura',
          valor: `${respuesta.temperatura} °C`,
          fueraRango: fueraDeRango('temperatura', respuesta.temperatura),
        },
        {
          etiqueta: 'Saturación',
          valor: `${respuesta.saturacion} %`,
          fueraRango: fueraDeRango('saturacion', respuesta.saturacion),
        },
        { etiqueta: 'Observación', valor: respuesta.observacion?.trim() || 'Sin observación' },
      ],
    };
  }

  private resultadoGlucosa(respuesta: GlucosaResponse): ResultadoControlVista {
    return {
      filas: [
        { etiqueta: 'Glucosa', valor: `${respuesta.glucosa} mg/dL` },
        { etiqueta: 'Tipo de medición', valor: this.tipoGlucosaVista(respuesta.tipo) },
        { etiqueta: 'Observación', valor: respuesta.observacion?.trim() || 'Sin observación' },
      ],
    };
  }

  private resultadoHidrico(respuesta: ControlHidricoResponse): ResultadoControlVista {
    return {
      filas: [
        { etiqueta: 'Tipo', valor: respuesta.tipo === 'INGRESO' ? 'Ingreso' : 'Egreso' },
        { etiqueta: 'Vía', valor: respuesta.via },
        { etiqueta: 'Cantidad', valor: `${respuesta.cantidad} ml` },
        { etiqueta: 'Descripción', valor: respuesta.descripcion },
      ],
    };
  }

  private tipoGlucosaVista(tipo: GlucosaResponse['tipo']): string {
    if (tipo === 'PREPRANDIAL') return 'Preprandial';
    if (tipo === 'POSTPRANDIAL') return 'Postprandial';
    if (tipo === 'ALEATORIA') return 'Aleatoria';
    return 'Ayunas';
  }

  /** Genera las horas que puede elegir el usuario para la indicación seleccionada. */
  private programadasParaAdministrar(indicacion: IndicacionConProgramacion): AplicacionProgramada[] {
    const programacion = this.programacionDeVista(indicacion);

    return indicacion.duracionTipo === 'indefinida'
      ? calcularAplicaciones(programacion, new Date())
      : calcularAplicaciones(programacion);
  }

  /** Indica si una hora programada ya tiene un registro de Enfermería. */
  private aplicacionRegistrada(indicacion: IndicacionConProgramacion, fecha: Date): boolean {
    return indicacion.aplicaciones.some((registro) =>
      this.mismaFecha(registro.fechaHoraProgramada, fecha),
    );
  }

  /** Elige la primera hora pendiente de la indicación seleccionada. */
  private actualizarHoraAdministracion(forzar = false): void {
    const horas = this.horasAdministracion;
    if (!forzar && horas.some((hora) => hora.valor === this.horaAdministracion)) return;

    // Sin programación no se elige hora; se registra el momento en que se guarda
    if (!horas.length && this.permiteHoraManual) {
      this.horaAdministracion = '';
      return;
    }

    // Nueva administración: siempre la próxima aplicación pendiente, sin poder saltar
    if (!this.editandoAplicacion && !this.controlTomado) {
      const proxima = this.proximaAdministracion;
      if (proxima) {
        this.horaAdministracion = this.aIsoLocal(proxima);
        return;
      }
    }

    this.horaAdministracion = horas[0]?.valor ?? '';
  }

  /** Selecciona la primera indicación del listado cuando la actual deja de estar visible. */
  private asegurarIndicacionSeleccionada(): void {
    if (this.indicacionPendiente !== null) {
      const pendiente = this.indicacionPendiente;
      this.indicacionPendiente = null;
      const cuidado = this.cuidados.find((item) => item.id === pendiente);

      if (cuidado) {
        this.filtroActivo = cuidado.estado === 'realizada' ? 'realizadas' : 'pendientes';
        this.indicacionSeleccionadaId = pendiente;

        if (this.horaControlPendiente) {
          this.estadoAdministracion = 'administrado';
          this.horaAdministracion = this.horaControlPendiente;
          this.horaControlPendiente = null;
        } else {
          this.actualizarHoraAdministracion(true);
        }

        return;
      }
    }

    const lista: { id: number }[] =
      this.seccionActiva === 'medicamentos'
        ? this.medicamentosFiltrados
        : this.seccionActiva === 'cuidados'
          ? this.cuidadosFiltrados
          : [];

    if (!lista.some((indicacion) => indicacion.id === this.indicacionSeleccionadaId)) {
      this.indicacionSeleccionadaId = lista[0]?.id ?? null;
      this.actualizarHoraAdministracion(true);
      return;
    }

    this.actualizarHoraAdministracion();
  }

  /** Carga en el formulario la aplicación elegida para editarla. */
  editarAplicacion(
    indicacion: IndicacionConAplicaciones,
    aplicacion: AplicacionMedicamentoVista,
  ): void {
    if (
      this.soloLectura ||
      this.eliminandoAplicacion ||
      this.guardandoAdministracion ||
      this.confirmandoAccion
    ) {
      return;
    }

    this.indicacionSeleccionadaId = indicacion.id;
    const fechaHora = this.aIsoLocal(new Date(aplicacion.fechaHoraProgramada));
    this.aplicacionEnEdicion = {
      seccion: this.seccionActiva,
      indicacionId: indicacion.id,
      registroId: aplicacion.id,
      numero: aplicacion.numero,
      estadoOriginal: aplicacion.estado,
      cantidadOriginal: aplicacion.cantidad,
      observacionOriginal: aplicacion.observacion,
      fechaOriginal: fechaHora,
    };
    this.estadoAdministracion = aplicacion.estado;
    this.cantidadAdministrada = aplicacion.cantidad;
    this.observacionAdministracion = aplicacion.observacion;
    this.horaAdministracion = fechaHora;
    this.cdr.markForCheck();
  }

  /** Confirma y elimina la aplicación del historial contra el backend. */
  async eliminarAplicacion(
    indicacion: IndicacionConAplicaciones,
    aplicacion: AplicacionMedicamentoVista,
  ): Promise<void> {
    if (
      this.soloLectura ||
      this.eliminandoAplicacion ||
      this.guardandoAdministracion ||
      this.confirmandoAccion
    ) {
      return;
    }

    this.confirmandoAccion = true;
    this.cdr.markForCheck();
    const confirmado = await this.popUps
      .confirmarToast(`¿Está seguro de eliminar el registro No. ${aplicacion.numero}?`)
      .catch(() => false);
    this.confirmandoAccion = false;
    this.cdr.markForCheck();

    if (!confirmado || this.destruido) return;

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
    const filas = programadas.map((aplicacion) => ({
      numero: aplicacion.numero,
      fechaHora: this.formatearFechaHora(aplicacion.fechaHora),
      registro:
        indicacion.aplicaciones.find((registro) =>
          this.mismaFecha(registro.fechaHoraProgramada, aplicacion.fechaHora),
        ) ?? null,
    }));

    // Si un registro no coincide con la programación, se muestra igualmente para no perderlo
    const minutosProgramados = new Set(
      programadas.map((aplicacion) => Math.floor(aplicacion.fechaHora.getTime() / 60000)),
    );
    const sinProgramacion = indicacion.aplicaciones
      .filter((registro) => {
        const fecha = new Date(registro.fechaHoraProgramada);
        return (
          !Number.isNaN(fecha.getTime()) &&
          !minutosProgramados.has(Math.floor(fecha.getTime() / 60000))
        );
      })
      .map((registro, indice) => ({
        numero: programadas.length + indice + 1,
        fechaHora: this.formatearFechaHora(new Date(registro.fechaHoraProgramada)),
        registro,
      }));

    return [...filas, ...sinProgramacion];
  }

  /** Texto de la tarjeta del cuidado: cada cuántas horas se realiza y durante cuánto tiempo. */
  textoRealizacion(cuidado: CuidadoIndicadoVista): string {
    if (cuidado.frecuencia === null && cuidado.duracionTipo === '') {
      return 'Sin programación';
    }

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
    disponibilidad: Map<number, number>,
  ): MedicamentoIndicadoVista {
    const programacion = this.programacionDeRespuesta(respuesta);
    const registros = aplicaciones.map((aplicacion, indice) =>
      this.aAplicacionMedicamentoVista(aplicacion, indice),
    );
    const fechaRegistro = new Date(respuesta.fecha);

    return {
      id: respuesta.id,
      estado: estadoTratamiento(programacion, registros),
      observaciones: respuesta.observaciones ?? '',
      fechaInicio: respuesta.fechaInicio || respuesta.fecha,
      fecha: this.formatearFecha(fechaRegistro),
      hora: this.formatearHora(fechaRegistro),
      medico: respuesta.usuarioNombreCorto,
      nombre: respuesta.medicamento,
      descripcion:
        descripcionMedicamentoCompleta({
          nombre: respuesta.medicamento,
          marca: respuesta.medicamentoMarca,
          presentacion: respuesta.medicamentoPresentacion,
          dosis: respuesta.medicamentoDosis,
          unidadMedida: respuesta.medicamentoUnidad,
          viaAdministracion: respuesta.medicamentoViaAdministracion,
        }) || respuesta.medicamento,
      cantidad: respuesta.cantidad,
      unidad: respuesta.presentacion?.trim() || 'unidad',
      frecuencia: respuesta.frecuencia,
      duracionTipo: this.aDuracionVista(respuesta.tipoDuracion),
      duracionCantidad: respuesta.duracion,
      medicamentoLibre: respuesta.medicamentoLibre !== null,
      medicamentoLogId: respuesta.medicamentoLogId,
      disponiblePiso:
        respuesta.medicamentoLogId === null
          ? 0
          : (disponibilidad.get(respuesta.medicamentoLogId) ?? 0),
      ultimaAplicacion: ultimaAplicacionRegistrada(
        aplicaciones.map((aplicacion) => ({
          fechaHoraProgramada: aplicacion.fechaHoraProgramada,
          fechaRegistro: aplicacion.fechaRegistro,
        })),
      ),
      proximaAplicacion: proximaAplicacion(programacion, registros),
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
    const fechaRegistro = new Date(respuesta.fecha);
    const control = controlDeNombre(respuesta.nombreCuidado);

    return {
      id: respuesta.id,
      estado: estadoTratamiento(programacion, registros),
      observaciones: respuesta.observacion ?? '',
      fechaInicio: respuesta.fechaInicio ?? '',
      fecha: this.formatearFecha(fechaRegistro),
      hora: this.formatearHora(fechaRegistro),
      medico: respuesta.usuarioNombreCorto,
      nombre: respuesta.nombreCuidado,
      frecuencia: respuesta.frecuencia,
      duracionTipo:
        respuesta.tipoDuracion === null ? '' : this.aDuracionVista(respuesta.tipoDuracion),
      duracionCantidad: respuesta.duracion,
      esControl: control !== null,
      seccionMonitoreo: control?.seccion ?? null,
      ultimaAplicacion: ultimaAplicacionRegistrada(
        ejecuciones.map((ejecucion) => ({
          fechaHoraProgramada: ejecucion.fechaHoraProgramada,
          fechaRegistro: ejecucion.fechaRegistro,
        })),
      ),
      proximaAplicacion: proximaAplicacion(programacion, registros),
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
      usuario: respuesta.usuarioNombreCorto,
    };
  }

  private aAplicacionMedicamentoVista(
    respuesta: AplicacionMedicamentoResponse,
    indice: number,
  ): AplicacionMedicamentoVista {
    return {
      id: respuesta.id,
      usuarioId: respuesta.usuarioId,
      numero: indice + 1,
      estado: respuesta.estado === 'ADMINISTRADO' ? 'administrado' : 'noAdministrado',
      fechaHoraProgramada: respuesta.fechaHoraProgramada,
      fechaHora: this.formatearFechaHora(new Date(respuesta.fechaHoraProgramada)),
      fechaRegistro: this.formatearFechaHora(new Date(respuesta.fechaRegistro)),
      usuario: respuesta.usuarioNombre,
      observacion: respuesta.observacion ?? '',
      cantidad: respuesta.cantidad,
      monitoreoId: null,
      monitoreoTipo: null,
    };
  }

  private aEjecucionCuidadoVista(
    respuesta: EjecucionCuidadoResponse,
    indice: number,
  ): AplicacionMedicamentoVista {
    const monitoreoTipo: SeccionMonitoreoControl | null =
      respuesta.signosVitalesId != null
        ? 'signos'
        : respuesta.glucosaId != null
          ? 'glucosa'
          : respuesta.controlHidricoId != null
            ? 'hidrico'
            : null;

    return {
      id: respuesta.id,
      usuarioId: respuesta.usuarioId,
      numero: indice + 1,
      estado: respuesta.estado === 'REALIZADO' ? 'administrado' : 'noAdministrado',
      fechaHoraProgramada: respuesta.fechaHoraProgramada,
      fechaHora: this.formatearFechaHora(new Date(respuesta.fechaHoraProgramada)),
      fechaRegistro: this.formatearFechaHora(new Date(respuesta.fechaRegistro)),
      usuario: respuesta.usuarioNombre,
      observacion: respuesta.observacion ?? '',
      cantidad: null,
      monitoreoId:
        respuesta.signosVitalesId ?? respuesta.glucosaId ?? respuesta.controlHidricoId ?? null,
      monitoreoTipo,
    };
  }

  private programacionDeRespuesta(respuesta: {
    fechaInicio: string | null;
    fecha: string;
    frecuencia: number | null;
    tipoDuracion: TipoDuracionApi | null;
    duracion: number | null;
  }): ProgramacionTratamiento {
    return {
      fechaInicio: new Date(respuesta.fechaInicio ?? ''),
      frecuencia: respuesta.frecuencia,
      duracionTipo:
        respuesta.tipoDuracion === null ? '' : this.aDuracionVista(respuesta.tipoDuracion),
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

  /** Fecha y hora en el formato de la tabla (dd/MM/yyyy - HH:mm). */
  private formatearFechaHora(fecha: Date): string {
    return `${this.formatearFecha(fecha)} - ${this.formatearHora(fecha)}`;
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
