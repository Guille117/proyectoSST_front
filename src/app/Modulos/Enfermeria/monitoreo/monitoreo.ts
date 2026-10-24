import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, forkJoin, Subscription, TimeoutError } from 'rxjs';
import { PopUps } from '../../../shared/popUps/popUpsService';
import { TabSwitch } from '../../../shared/tab-switch/tab-switch';
import { AuthService } from '../../Auth/data/auth-service';
import { DatosPaciente } from '../../Medica/datos-paciente/datos-paciente';
import { EpisodioActivoService } from '../../Medica/data/episodio-activo-service';
import {
  ControlHidricoRequest,
  ControlHidricoResponse,
  TipoRegistroHidricoApi,
} from './data/controlHidricoInterfaz';
import { ControlHidricoService } from './data/control-hidrico-service';
import {
  GlucosaRequest,
  GlucosaResponse,
  TipoMedicionGlucosaApi,
} from './data/glucosaInterfaz';
import { GlucosaService } from './data/glucosa-service';
import {
  SignosVitalesRequest,
  SignosVitalesResponse,
} from './data/signosVitalesInterfaz';
import { SignosVitalesService } from './data/signos-vitales-service';

/** Secciones del monitoreo de enfermería. */
type SeccionMonitoreo = 'signos' | 'hidrico' | 'glucosa';

/** Tipo de registro del control hídrico. */
type TipoBalance = 'ingreso' | 'egreso';

/** Filtros del historial de control hídrico. */
type FiltroHidrico = 'todos' | 'ingresos' | 'egresos' | 'eliminados';

/** Registro de control hídrico listo para pintar su tarjeta del historial. */
interface RegistroHidricoVista {
  id: number;
  tipo: TipoBalance;
  via: string;
  cantidad: number;
  descripcion: string;
  fecha: string;
  hora: string;
  usuario: string;
  eliminado: boolean;
}

/** Opción del filtro del historial de control hídrico. */
interface FiltroHidricoVista {
  id: FiltroHidrico;
  etiqueta: string;
}

/** Registro de glucosa listo para pintar su tarjeta del historial. */
interface RegistroGlucosaVista {
  id: number;
  glucosa: number;
  tipo: string;
  observacion: string;
  fecha: string;
  hora: string;
  usuario: string;
}

interface SeccionVista {
  id: SeccionMonitoreo;
  titulo: string;
  icono: string;
}

/** Registro de signos vitales listo para pintar su tarjeta del historial. */
interface RegistroSignosVista {
  id: number;
  sistolica: number;
  diastolica: number;
  frecuenciaCardiaca: number;
  frecuenciaRespiratoria: number;
  temperatura: number;
  saturacion: number;
  observacion: string;
  fecha: string;
  hora: string;
  usuario: string;
}

/**
 * Monitoreo de enfermería: registro e historial de signos vitales, control hídrico y glucosa
 * contra el backend del episodio activo.
 */
@Component({
  selector: 'app-monitoreo',
  imports: [FormsModule, DatosPaciente, TabSwitch],
  templateUrl: './monitoreo.html',
  styleUrl: './monitoreo.scss',
  host: {
    '(document:click)': 'cerrarMenuAlClicFuera($event)',
  },
})
export class Monitoreo implements OnInit, OnDestroy {
  private readonly popUps = inject(PopUps);
  private readonly authService = inject(AuthService);
  private readonly episodioActivo = inject(EpisodioActivoService);
  private readonly signosService = inject(SignosVitalesService);
  private readonly hidricoService = inject(ControlHidricoService);
  private readonly glucosaService = inject(GlucosaService);
  private readonly cdr = inject(ChangeDetectorRef);

  private peticionSignos?: Subscription;
  private peticionHidrico?: Subscription;
  private peticionGlucosa?: Subscription;
  private peticionAccion?: Subscription;
  private destruido = false;

  // ------------------- ESTADO DE LA VISTA -------------------
  /** Sección del rail que se muestra en el área central. */
  seccionActiva: SeccionMonitoreo = 'signos';

  /** La ficha con los datos del paciente está desplegada; la abre su pestaña lateral. */
  pacienteAbierto = false;

  /** El cuerpo de la ficha del paciente está desplegado; el chevron de su encabezado lo pliega. */
  datosPacienteVisibles = true;

  /** Campos del formulario de signos vitales. */
  sistolica: number | null = null;
  diastolica: number | null = null;
  frecuenciaCardiaca: number | null = null;
  frecuenciaRespiratoria: number | null = null;
  temperatura: number | null = null;
  saturacion: number | null = null;
  observacion = '';

  /** Tarjeta del historial con su menú desplegado; null si no hay ninguna. */
  menuRegistroAbierto: number | null = null;

  /** Registro cuyos datos están cargados en el formulario; null al capturar una toma nueva. */
  registroEnEdicion: number | null = null;

  /** Tipo de registro del control hídrico que se está capturando. */
  tipoHidrico: TipoBalance = 'ingreso';

  /** Campos del formulario de control hídrico. */
  viaHidrica = '';
  cantidadHidrica: number | null = null;
  descripcionHidrica = '';

  /** Filtro elegido en el historial de control hídrico. */
  filtroHidrico: FiltroHidrico = 'todos';

  /** Tarjeta de control hídrico con su menú desplegado; null si no hay ninguna. */
  menuHidricoAbierto: number | null = null;

  /** Registro de control hídrico cargado en el formulario; null al capturar uno nuevo. */
  registroHidricoEnEdicion: number | null = null;

  /** Campos del formulario de glucosa. */
  glucosa: number | null = null;
  tipoGlucosa = '';
  observacionGlucosa = '';

  /** Tarjeta de glucosa con su menú desplegado; null si no hay ninguna. */
  menuGlucosaAbierto: number | null = null;

  /** Registro de glucosa cargado en el formulario; null al capturar uno nuevo. */
  registroGlucosaEnEdicion: number | null = null;

  /** Estados de carga y error de los tres historiales. */
  cargandoSignos = false;
  cargandoHidrico = false;
  cargandoGlucosa = false;
  errorSignos = false;
  errorHidrico = false;
  errorGlucosa = false;
  sinEpisodioActivo = false;
  guardando = false;
  eliminando = false;

  /** Secciones del rail de monitoreo de enfermería. */
  readonly secciones: SeccionVista[] = [
    { id: 'signos', titulo: 'Signos vitales', icono: 'bi-heart-pulse' },
    { id: 'hidrico', titulo: 'Control hídrico', icono: 'bi-droplet-half' },
    { id: 'glucosa', titulo: 'Glucosa', icono: 'bi-activity' },
  ];

  /** Tomas de signos vitales del episodio. */
  registros: RegistroSignosVista[] = [];

  /** Vías disponibles para el registro de control hídrico. */
  readonly viasHidricas: string[] = [
    'Oral',
    'Intravenosa',
    'Sonda nasogástrica',
    'Sonda vesical',
    'Drenaje',
  ];

  /** Registros de control hídrico del episodio. */
  registrosHidricos: RegistroHidricoVista[] = [];

  /** Opciones del filtro del historial de control hídrico. */
  readonly filtrosHidricos: FiltroHidricoVista[] = [
    { id: 'todos', etiqueta: 'Todos' },
    { id: 'ingresos', etiqueta: 'Ingresos' },
    { id: 'egresos', etiqueta: 'Egresos' },
    { id: 'eliminados', etiqueta: 'Eliminados' },
  ];

  /** Tipos de medición de glucosa disponibles. */
  readonly tiposGlucosa: string[] = ['Ayunas', 'Preprandial', 'Postprandial', 'Aleatoria'];

  /** Registros de glucosa del episodio. */
  registrosGlucosa: RegistroGlucosaVista[] = [];

  ngOnInit(): void {
    this.cargarTodo();
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.peticionSignos?.unsubscribe();
    this.peticionHidrico?.unsubscribe();
    this.peticionGlucosa?.unsubscribe();
    this.peticionAccion?.unsubscribe();
  }

  /** El episodio es un historial cerrado: se consulta, pero no se registran cambios. */
  get soloLectura(): boolean {
    return this.episodioActivo.esSoloLectura();
  }

  // ------------------- CARGA DEL EPISODIO -------------------
  /** Carga los tres historiales del episodio activo. */
  cargarTodo(): void {
    if (this.destruido) return;

    const episodioId = this.episodioActivo.obtener();
    this.sinEpisodioActivo = episodioId === null;

    if (episodioId === null) {
      this.registros = [];
      this.registrosHidricos = [];
      this.registrosGlucosa = [];
      this.cargandoSignos = false;
      this.cargandoHidrico = false;
      this.cargandoGlucosa = false;
      this.cdr.markForCheck();
      return;
    }

    this.cargandoSignos = true;
    this.cargandoHidrico = true;
    this.cargandoGlucosa = true;
    this.errorSignos = false;
    this.errorHidrico = false;
    this.errorGlucosa = false;
    this.cdr.markForCheck();

    this.peticionSignos?.unsubscribe();
    this.peticionHidrico?.unsubscribe();
    this.peticionGlucosa?.unsubscribe();

    forkJoin({
      signos: this.signosService.buscarPorEpisodio(episodioId),
      hidrico: this.hidricoService.buscarPorEpisodio(episodioId),
      glucosa: this.glucosaService.buscarPorEpisodio(episodioId),
    })
      .pipe(
        finalize(() => {
          this.cargandoSignos = false;
          this.cargandoHidrico = false;
          this.cargandoGlucosa = false;
          if (!this.destruido) this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (datos) => {
          if (this.destruido) return;

          this.registros = datos.signos.map((registro) => this.aRegistroSignos(registro));
          this.registrosHidricos = datos.hidrico.map((registro) =>
            this.aRegistroHidrico(registro),
          );
          this.registrosGlucosa = datos.glucosa.map((registro) => this.aRegistroGlucosa(registro));
        },
        error: (error) => {
          if (this.destruido) return;

          this.errorSignos = true;
          this.errorHidrico = true;
          this.errorGlucosa = true;
          this.mostrarError(error, 'No se pudo cargar el monitoreo del paciente.');
        },
      });
  }

  // ------------------- CONSULTAS PARA LA VISTA -------------------
  /** El formulario se puede guardar cuando todas las constantes tienen valor. */
  get puedeGuardar(): boolean {
    return (
      !this.soloLectura &&
      !this.guardando &&
      this.sistolica !== null &&
      this.diastolica !== null &&
      this.frecuenciaCardiaca !== null &&
      this.frecuenciaRespiratoria !== null &&
      this.temperatura !== null &&
      this.saturacion !== null
    );
  }

  /** El registro hídrico se puede guardar con la vía, la cantidad y la descripción. */
  get puedeGuardarHidrico(): boolean {
    return (
      !this.soloLectura &&
      !this.guardando &&
      this.viaHidrica !== '' &&
      this.cantidadHidrica !== null &&
      this.cantidadHidrica > 0 &&
      this.descripcionHidrica.trim().length > 0
    );
  }

  /** El registro de glucosa se puede guardar con la medición y el tipo. */
  get puedeGuardarGlucosa(): boolean {
    return (
      !this.soloLectura &&
      !this.guardando &&
      this.glucosa !== null &&
      this.glucosa > 0 &&
      this.tipoGlucosa !== ''
    );
  }

  /** Total de ingresos activos del control hídrico, en ml. */
  get totalIngresosHidricos(): number {
    return this.registrosHidricos
      .filter((registro) => !registro.eliminado && registro.tipo === 'ingreso')
      .reduce((total, registro) => total + registro.cantidad, 0);
  }

  /** Total de egresos activos del control hídrico, en ml. */
  get totalEgresosHidricos(): number {
    return this.registrosHidricos
      .filter((registro) => !registro.eliminado && registro.tipo === 'egreso')
      .reduce((total, registro) => total + registro.cantidad, 0);
  }

  /** Balance hídrico: ingresos menos egresos, en ml. */
  get balanceHidrico(): number {
    return this.totalIngresosHidricos - this.totalEgresosHidricos;
  }

  /** Registros que muestra el historial con el filtro elegido. */
  get registrosHidricosFiltrados(): RegistroHidricoVista[] {
    if (this.filtroHidrico === 'eliminados') {
      return this.registrosHidricos.filter((registro) => registro.eliminado);
    }

    const activos = this.registrosHidricos.filter((registro) => !registro.eliminado);

    if (this.filtroHidrico === 'ingresos') {
      return activos.filter((registro) => registro.tipo === 'ingreso');
    }

    if (this.filtroHidrico === 'egresos') {
      return activos.filter((registro) => registro.tipo === 'egreso');
    }

    return activos;
  }

  // ------------------- SECCIONES Y FICHA DEL PACIENTE -------------------
  /** Muestra la sección pulsada y cierra el menú que hubiera abierto. */
  seleccionarSeccion(id: SeccionMonitoreo): void {
    this.seccionActiva = id;
    this.cerrarMenuRegistro();
    this.cerrarMenuHidrico();
    this.cerrarMenuGlucosa();
  }

  /**
   * Abre o cierra la ficha con los datos del paciente desde su pestaña lateral. Al abrirla se
   * muestran los datos completos para que el usuario vea la información de contexto.
   */
  cambiarFichaPaciente(abierto: boolean): void {
    this.pacienteAbierto = abierto;

    if (abierto) {
      this.datosPacienteVisibles = true;
    }
  }

  // ------------------- CAPTURA Y EDICIÓN DE SIGNOS VITALES -------------------
  /** Carga en el formulario la toma elegida para corregirla. */
  editarRegistro(registro: RegistroSignosVista): void {
    if (this.soloLectura) return;

    this.registroEnEdicion = registro.id;
    this.sistolica = registro.sistolica;
    this.diastolica = registro.diastolica;
    this.frecuenciaCardiaca = registro.frecuenciaCardiaca;
    this.frecuenciaRespiratoria = registro.frecuenciaRespiratoria;
    this.temperatura = registro.temperatura;
    this.saturacion = registro.saturacion;
    this.observacion = registro.observacion;
    this.cerrarMenuRegistro();
  }

  /** Agrega una toma nueva o actualiza la que está en edición. */
  guardarRegistro(): void {
    if (!this.puedeGuardar) return;

    const contexto = this.contexto();
    if (!contexto) return;

    const request: SignosVitalesRequest = {
      sistolica: this.sistolica!,
      diastolica: this.diastolica!,
      frecuenciaCardiaca: this.frecuenciaCardiaca!,
      frecuenciaRespiratoria: this.frecuenciaRespiratoria!,
      temperatura: this.temperatura!,
      saturacion: this.saturacion!,
      observacion: this.observacion.trim() || null,
      episodioId: contexto.episodioId,
      usuarioId: contexto.usuarioId,
    };

    this.guardando = true;
    this.cdr.markForCheck();
    this.peticionAccion?.unsubscribe();
    const peticion =
      this.registroEnEdicion === null
        ? this.signosService.crear(request)
        : this.signosService.actualizar(this.registroEnEdicion, request);

    this.peticionAccion = peticion
      .pipe(
        finalize(() => {
          this.guardando = false;
          if (!this.destruido) this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.limpiarFormulario();
          this.popUps.exito('Signos vitales registrados exitosamente.');
          this.recargarSignos();
        },
        error: (error) => this.mostrarError(error, 'No se pudieron guardar los signos vitales.'),
      });
  }

  /** Elimina la toma del backend. */
  eliminarRegistro(registro: RegistroSignosVista): void {
    if (this.soloLectura || this.eliminando) return;

    this.eliminando = true;
    this.cdr.markForCheck();
    this.peticionAccion?.unsubscribe();
    this.peticionAccion = this.signosService
      .eliminar(registro.id)
      .pipe(
        finalize(() => {
          this.eliminando = false;
          if (!this.destruido) this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          if (this.registroEnEdicion === registro.id) this.limpiarFormulario();
          this.cerrarMenuRegistro();
          this.popUps.exito('Registro eliminado exitosamente.');
          this.recargarSignos();
        },
        error: (error) => this.mostrarError(error, 'No se pudo eliminar el registro.'),
      });
  }

  /** Deja el formulario listo para capturar una toma nueva. */
  limpiarFormulario(): void {
    this.sistolica = null;
    this.diastolica = null;
    this.frecuenciaCardiaca = null;
    this.frecuenciaRespiratoria = null;
    this.temperatura = null;
    this.saturacion = null;
    this.observacion = '';
    this.registroEnEdicion = null;
    this.cerrarMenuRegistro();
  }

  // ------------------- CAPTURA Y EDICIÓN DE CONTROL HÍDRICO -------------------
  /** Cambia el tipo de registro con el switch Ingreso/Egreso. */
  cambiarTipoHidrico(esIngreso: boolean): void {
    this.tipoHidrico = esIngreso ? 'ingreso' : 'egreso';
  }

  /** Muestra el filtro elegido en el historial de control hídrico. */
  seleccionarFiltroHidrico(filtro: FiltroHidrico): void {
    this.filtroHidrico = filtro;
    this.cerrarMenuHidrico();
  }

  /** Carga en el formulario el registro hídrico elegido para corregirlo. */
  editarRegistroHidrico(registro: RegistroHidricoVista): void {
    if (this.soloLectura) return;

    this.registroHidricoEnEdicion = registro.id;
    this.tipoHidrico = registro.tipo;
    this.viaHidrica = registro.via;
    this.cantidadHidrica = registro.cantidad;
    this.descripcionHidrica = registro.descripcion;
    this.cerrarMenuHidrico();
  }

  /** Agrega un registro hídrico nuevo o actualiza el que está en edición. */
  guardarRegistroHidrico(): void {
    if (!this.puedeGuardarHidrico) return;

    const contexto = this.contexto();
    if (!contexto) return;

    const request: ControlHidricoRequest = {
      tipo: this.tipoHidrico === 'ingreso' ? 'INGRESO' : 'EGRESO',
      via: this.viaHidrica.trim(),
      cantidad: this.cantidadHidrica!,
      descripcion: this.descripcionHidrica.trim(),
      episodioId: contexto.episodioId,
      usuarioId: contexto.usuarioId,
    };

    this.guardando = true;
    this.cdr.markForCheck();
    this.peticionAccion?.unsubscribe();
    const peticion =
      this.registroHidricoEnEdicion === null
        ? this.hidricoService.crear(request)
        : this.hidricoService.actualizar(this.registroHidricoEnEdicion, request);

    this.peticionAccion = peticion
      .pipe(
        finalize(() => {
          this.guardando = false;
          if (!this.destruido) this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.limpiarFormularioHidrico();
          this.popUps.exito('Registro hídrico guardado exitosamente.');
          this.recargarHidrico();
        },
        error: (error) =>
          this.mostrarError(error, 'No se pudo guardar el registro hídrico.'),
      });
  }

  /** Marca el registro hídrico como eliminado en el backend. */
  eliminarRegistroHidrico(registro: RegistroHidricoVista): void {
    if (this.soloLectura || this.eliminando) return;

    this.eliminando = true;
    this.cdr.markForCheck();
    this.peticionAccion?.unsubscribe();
    this.peticionAccion = this.hidricoService
      .eliminar(registro.id)
      .pipe(
        finalize(() => {
          this.eliminando = false;
          if (!this.destruido) this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          if (this.registroHidricoEnEdicion === registro.id) this.limpiarFormularioHidrico();
          this.cerrarMenuHidrico();
          this.popUps.exito('Registro hídrico eliminado exitosamente.');
          this.recargarHidrico();
        },
        error: (error) =>
          this.mostrarError(error, 'No se pudo eliminar el registro hídrico.'),
      });
  }

  /** Deja el formulario hídrico listo para capturar un registro nuevo. */
  limpiarFormularioHidrico(): void {
    this.tipoHidrico = 'ingreso';
    this.viaHidrica = '';
    this.cantidadHidrica = null;
    this.descripcionHidrica = '';
    this.registroHidricoEnEdicion = null;
    this.cerrarMenuHidrico();
  }

  // ------------------- CAPTURA Y EDICIÓN DE GLUCOSA -------------------
  /** Carga en el formulario el registro de glucosa elegido para corregirlo. */
  editarRegistroGlucosa(registro: RegistroGlucosaVista): void {
    if (this.soloLectura) return;

    this.registroGlucosaEnEdicion = registro.id;
    this.glucosa = registro.glucosa;
    this.tipoGlucosa = registro.tipo;
    this.observacionGlucosa = registro.observacion;
    this.cerrarMenuGlucosa();
  }

  /** Agrega un registro de glucosa o actualiza el que está en edición. */
  guardarRegistroGlucosa(): void {
    if (!this.puedeGuardarGlucosa) return;

    const contexto = this.contexto();
    if (!contexto) return;

    const request: GlucosaRequest = {
      glucosa: this.glucosa!,
      tipo: this.aTipoGlucosaApi(this.tipoGlucosa),
      observacion: this.observacionGlucosa.trim() || null,
      episodioId: contexto.episodioId,
      usuarioId: contexto.usuarioId,
    };

    this.guardando = true;
    this.cdr.markForCheck();
    this.peticionAccion?.unsubscribe();
    const peticion =
      this.registroGlucosaEnEdicion === null
        ? this.glucosaService.crear(request)
        : this.glucosaService.actualizar(this.registroGlucosaEnEdicion, request);

    this.peticionAccion = peticion
      .pipe(
        finalize(() => {
          this.guardando = false;
          if (!this.destruido) this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.limpiarFormularioGlucosa();
          this.popUps.exito('Glucosa registrada exitosamente.');
          this.recargarGlucosa();
        },
        error: (error) => this.mostrarError(error, 'No se pudo guardar el registro de glucosa.'),
      });
  }

  /** Elimina el registro de glucosa del backend. */
  eliminarRegistroGlucosa(registro: RegistroGlucosaVista): void {
    if (this.soloLectura || this.eliminando) return;

    this.eliminando = true;
    this.cdr.markForCheck();
    this.peticionAccion?.unsubscribe();
    this.peticionAccion = this.glucosaService
      .eliminar(registro.id)
      .pipe(
        finalize(() => {
          this.eliminando = false;
          if (!this.destruido) this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          if (this.registroGlucosaEnEdicion === registro.id) this.limpiarFormularioGlucosa();
          this.cerrarMenuGlucosa();
          this.popUps.exito('Registro de glucosa eliminado exitosamente.');
          this.recargarGlucosa();
        },
        error: (error) =>
          this.mostrarError(error, 'No se pudo eliminar el registro de glucosa.'),
      });
  }

  /** Deja el formulario de glucosa listo para capturar un registro nuevo. */
  limpiarFormularioGlucosa(): void {
    this.glucosa = null;
    this.tipoGlucosa = '';
    this.observacionGlucosa = '';
    this.registroGlucosaEnEdicion = null;
    this.cerrarMenuGlucosa();
  }

  // ------------------- RECARGA PARCIAL -------------------
  private recargarSignos(): void {
    this.recargar(
      () => this.signosService.buscarPorEpisodio(this.episodioActivo.obtener()!),
      'signos',
    );
  }

  private recargarHidrico(): void {
    this.recargar(
      () => this.hidricoService.buscarPorEpisodio(this.episodioActivo.obtener()!),
      'hidrico',
    );
  }

  private recargarGlucosa(): void {
    this.recargar(
      () => this.glucosaService.buscarPorEpisodio(this.episodioActivo.obtener()!),
      'glucosa',
    );
  }

  private recargar<T>(
    peticion: () => import('rxjs').Observable<T[]>,
    seccion: SeccionMonitoreo,
  ): void {
    const episodioId = this.episodioActivo.obtener();
    if (episodioId === null) return;

    const sub =
      seccion === 'signos'
        ? this.peticionSignos
        : seccion === 'hidrico'
          ? this.peticionHidrico
          : this.peticionGlucosa;
    sub?.unsubscribe();

    const nueva = peticion().subscribe({
      next: (datos) => {
        if (seccion === 'signos') {
          this.registros = (datos as SignosVitalesResponse[]).map((registro) =>
            this.aRegistroSignos(registro),
          );
        } else if (seccion === 'hidrico') {
          this.registrosHidricos = (datos as ControlHidricoResponse[]).map((registro) =>
            this.aRegistroHidrico(registro),
          );
        } else {
          this.registrosGlucosa = (datos as GlucosaResponse[]).map((registro) =>
            this.aRegistroGlucosa(registro),
          );
        }
      },
      error: (error) => this.mostrarError(error, 'No se pudo actualizar el historial.'),
    });

    if (seccion === 'signos') this.peticionSignos = nueva;
    else if (seccion === 'hidrico') this.peticionHidrico = nueva;
    else this.peticionGlucosa = nueva;
  }

  // ------------------- MENÚ DE LA TARJETA -------------------
  /** Muestra u oculta el menú de opciones de la tarjeta pulsada. */
  alternarMenuRegistro(id: number): void {
    if (this.soloLectura) return;

    this.menuRegistroAbierto = this.menuRegistroAbierto === id ? null : id;
  }

  /** Cierra el menú de opciones que esté desplegado. */
  cerrarMenuRegistro(): void {
    this.menuRegistroAbierto = null;
  }

  /** Muestra u oculta el menú de opciones de la tarjeta hídrica pulsada. */
  alternarMenuHidrico(id: number): void {
    if (this.soloLectura) return;

    this.menuHidricoAbierto = this.menuHidricoAbierto === id ? null : id;
  }

  /** Cierra el menú de opciones del historial hídrico. */
  cerrarMenuHidrico(): void {
    this.menuHidricoAbierto = null;
  }

  /** Muestra u oculta el menú de opciones de la tarjeta de glucosa pulsada. */
  alternarMenuGlucosa(id: number): void {
    if (this.soloLectura) return;

    this.menuGlucosaAbierto = this.menuGlucosaAbierto === id ? null : id;
  }

  /** Cierra el menú de opciones del historial de glucosa. */
  cerrarMenuGlucosa(): void {
    this.menuGlucosaAbierto = null;
  }

  /** Cierra el menú al pulsar fuera de la tarjeta que lo tiene abierto. */
  cerrarMenuAlClicFuera(evento: Event): void {
    if (!(evento.target instanceof Element)) return;

    if (this.menuRegistroAbierto !== null) {
      const tarjeta = evento.target.closest<HTMLElement>('.registro-card');
      const tarjetaAbierta = tarjeta?.dataset['registroId'];

      if (tarjetaAbierta !== String(this.menuRegistroAbierto)) {
        this.cerrarMenuRegistro();
      }
    }

    if (this.menuHidricoAbierto !== null) {
      const tarjeta = evento.target.closest<HTMLElement>('.hidrico-card');
      const tarjetaAbierta = tarjeta?.dataset['registroId'];

      if (tarjetaAbierta !== String(this.menuHidricoAbierto)) {
        this.cerrarMenuHidrico();
      }
    }

    if (this.menuGlucosaAbierto !== null) {
      const tarjeta = evento.target.closest<HTMLElement>('.glucosa-card');
      const tarjetaAbierta = tarjeta?.dataset['registroId'];

      if (tarjetaAbierta !== String(this.menuGlucosaAbierto)) {
        this.cerrarMenuGlucosa();
      }
    }
  }

  // ------------------- APOYO -------------------
  /** Contexto obligatorio para registrar cualquier dato de Enfermería. */
  private contexto(): { episodioId: number; usuarioId: number } | null {
    const episodioId = this.episodioActivo.obtener();
    if (episodioId === null) {
      this.popUps.advertencia('No hay un episodio activo. Abra el episodio del paciente.');
      return null;
    }

    const usuarioId = this.authService.currentUser()?.id;
    if (!usuarioId) {
      this.popUps.error(
        'No se pudo identificar al usuario de la sesión. Inicie sesión nuevamente.',
      );
      return null;
    }

    return { episodioId, usuarioId };
  }

  private aRegistroSignos(respuesta: SignosVitalesResponse): RegistroSignosVista {
    const fecha = new Date(respuesta.fecha);

    return {
      id: respuesta.id,
      sistolica: respuesta.sistolica,
      diastolica: respuesta.diastolica,
      frecuenciaCardiaca: respuesta.frecuenciaCardiaca,
      frecuenciaRespiratoria: respuesta.frecuenciaRespiratoria,
      temperatura: respuesta.temperatura,
      saturacion: respuesta.saturacion,
      observacion: respuesta.observacion ?? '',
      fecha: this.formatearFecha(fecha),
      hora: this.formatearHora(fecha),
      usuario: respuesta.usuarioNombre,
    };
  }

  private aRegistroHidrico(respuesta: ControlHidricoResponse): RegistroHidricoVista {
    const fecha = new Date(respuesta.fecha);

    return {
      id: respuesta.id,
      tipo: respuesta.tipo === 'INGRESO' ? 'ingreso' : 'egreso',
      via: respuesta.via,
      cantidad: respuesta.cantidad,
      descripcion: respuesta.descripcion,
      fecha: this.formatearFecha(fecha),
      hora: this.formatearHora(fecha),
      usuario: respuesta.usuarioNombre,
      eliminado: respuesta.eliminado,
    };
  }

  private aRegistroGlucosa(respuesta: GlucosaResponse): RegistroGlucosaVista {
    const fecha = new Date(respuesta.fecha);

    return {
      id: respuesta.id,
      glucosa: respuesta.glucosa,
      tipo: this.aTipoGlucosaVista(respuesta.tipo),
      observacion: respuesta.observacion ?? '',
      fecha: this.formatearFecha(fecha),
      hora: this.formatearHora(fecha),
      usuario: respuesta.usuarioNombre,
    };
  }

  private aTipoGlucosaApi(tipo: string): TipoMedicionGlucosaApi {
    const normalizado = tipo.trim().toLowerCase();

    if (normalizado === 'preprandial') return 'PREPRANDIAL';
    if (normalizado === 'postprandial') return 'POSTPRANDIAL';
    if (normalizado === 'aleatoria') return 'ALEATORIA';
    return 'AYUNAS';
  }

  private aTipoGlucosaVista(tipo: TipoMedicionGlucosaApi): string {
    if (tipo === 'PREPRANDIAL') return 'Preprandial';
    if (tipo === 'POSTPRANDIAL') return 'Postprandial';
    if (tipo === 'ALEATORIA') return 'Aleatoria';
    return 'Ayunas';
  }

  /** Fecha de la toma en el formato corto de la tarjeta (dd/MM/yyyy). */
  private formatearFecha(fecha: Date): string {
    if (Number.isNaN(fecha.getTime())) return '';

    const dia = `${fecha.getDate()}`.padStart(2, '0');
    const mes = `${fecha.getMonth() + 1}`.padStart(2, '0');
    return `${dia}/${mes}/${fecha.getFullYear()}`;
  }

  /** Hora de la toma en el formato de la tarjeta (HH:mm). */
  private formatearHora(fecha: Date): string {
    if (Number.isNaN(fecha.getTime())) return '';

    const horas = `${fecha.getHours()}`.padStart(2, '0');
    const minutos = `${fecha.getMinutes()}`.padStart(2, '0');
    return `${horas}:${minutos}`;
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
