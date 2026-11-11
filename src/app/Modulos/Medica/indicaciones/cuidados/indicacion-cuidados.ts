import { NgClass } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, forkJoin, map, Observable, Subscription, TimeoutError } from 'rxjs';
import { PopUps } from '../../../../shared/popUps/popUpsService';
import { TabSwitch } from '../../../../shared/tab-switch/tab-switch';
import { fueraDeRango } from '../../../../shared/signos-vitales/rangos-signos-vitales';
import { AuthService } from '../../../Auth/data/auth-service';
import { PropiedadRegistroService } from '../../../Auth/data/propiedad-registro-service';
import { EpisodioActivoService } from '../../data/episodio-activo-service';
import {
  DuracionVista,
  TIPOS_DURACION,
  TipoDuracion,
  faltaDuracionEnDias as calcularFaltaDuracion,
} from '../data/duracion';
import {
  CuidadoRequest,
  CuidadoResponse,
  EstadoCuidadoApi,
  TipoDuracionCuidadoApi,
} from './data/cuidadoInterfaz';
import { IndicacionCuidadoService } from './data/cuidado-service';
import {
  CONTROLES_MONITOREO,
  controlDeNombre,
  SeccionMonitoreoControl,
} from './data/monitoreo';
import { RegistrosEnfermeriaService } from '../../../Enfermeria/data/registrosEnfermeriaService';
import { EjecucionCuidadoResponse } from '../../../Enfermeria/data/registrosEnfermeriaInterfaz';
import { ControlHidricoService } from '../../../Enfermeria/monitoreo/data/control-hidrico-service';
import { ControlHidricoResponse } from '../../../Enfermeria/monitoreo/data/controlHidricoInterfaz';
import { GlucosaService } from '../../../Enfermeria/monitoreo/data/glucosa-service';
import { GlucosaResponse } from '../../../Enfermeria/monitoreo/data/glucosaInterfaz';
import { SignosVitalesService } from '../../../Enfermeria/monitoreo/data/signos-vitales-service';
import { SignosVitalesResponse } from '../../../Enfermeria/monitoreo/data/signosVitalesInterfaz';

/* Tipos locales de la vista: traducen el contrato del backend al lenguaje de las tarjetas. */
/** Colores de acento lateral de la tarjeta del cuidado; describen su estado en el listado. */
type TonoIndicacion = 'verde' | 'rojo' | 'naranja';

/** Pestaña del registro de atención: cuidado de nombre libre o monitoreo de un tipo. */
type TipoAtencion = 'cuidado' | 'monitoreo';

/** Estados en los que puede quedar un cuidado visto en el listado. */
type EstadoCuidado = 'enProceso' | 'completado' | 'eliminado';

/** Filtros del listado de cuidados: un estado concreto o «todas» los cuidados vigentes. */
type FiltroCuidado = 'todas' | 'completados' | 'enProceso' | 'eliminados';

/** Cuidado indicado listo para pintar la tarjeta del listado. */
interface CuidadoVista extends DuracionVista {
  id: number;
  usuarioId: number;
  nombre: string;
  /** Frecuencia indicada en horas; opcional cuando el cuidado se registra solo con su nombre. */
  frecuencia: number | null;
  observaciones: string;
  fechaInicio: string;
  fecha: string;
  hora: string;
  medico: string;
  /** Estado del registro: los eliminados solo se listan con el filtro «Eliminadas». */
  estado: EstadoCuidado;
}

/** Ejecución de Enfermería lista para la tabla desplegable de la tarjeta. */
interface EjecucionCuidadoVista {
  id: number;
  numero: number;
  fechaHoraProgramada: string;
  fechaRegistro: string;
  estado: string;
  esPositivo: boolean;
  usuario: string;
  observacion: string;
  monitoreoId: number | null;
  monitoreoTipo: SeccionMonitoreoControl | null;
}

/** Resultados del control listos para la fila expandible del historial. */
interface ResultadoControlVista {
  filas: { etiqueta: string; valor: string; fueraRango?: boolean }[];
}

/** Opción del filtro que decide qué cuidados se muestran en el listado. */
interface FiltroCuidadoVista {
  id: FiltroCuidado;
  etiqueta: string;
  /** Estados del backend que reúne la opción; «Todas» excluye los eliminados. */
  estados: EstadoCuidadoApi[];
}

/** Instantánea de los campos del formulario al iniciar la edición, para detectar cambios. */
interface FormularioCuidadoOriginal {
  nombreCuidado: string;
  frecuenciaCuidado: number | null;
  duracionTipoCuidado: TipoDuracion | '';
  duracionCantidadCuidado: number | null;
  fechaInicioCuidado: string;
  observacionesCuidado: string;
}

/**
 * Sección de atenciones de las indicaciones médicas: registro del cuidado o del monitoreo con su
 * frecuencia, su duración y sus observaciones, y listado de las atenciones indicadas en el episodio.
 * Las operaciones se guardan contra el backend; el episodio y el usuario salen de la sesión.
 */
@Component({
  selector: 'app-indicacion-cuidados',
  imports: [FormsModule, NgClass, TabSwitch],
  templateUrl: './indicacion-cuidados.html',
  styleUrl: './indicacion-cuidados.scss',
  host: {
    '(document:click)': 'cerrarMenuAlClicFuera($event)',
  },
})
export class IndicacionCuidados implements OnInit, OnDestroy {
  private readonly popUps = inject(PopUps);
  private readonly servicio = inject(IndicacionCuidadoService);
  private readonly authService = inject(AuthService);
  private readonly propiedadRegistro = inject(PropiedadRegistroService);
  private readonly episodioActivo = inject(EpisodioActivoService);
  private readonly registrosEnfermeria = inject(RegistrosEnfermeriaService);
  private readonly servicioSignos = inject(SignosVitalesService);
  private readonly servicioGlucosa = inject(GlucosaService);
  private readonly servicioHidrico = inject(ControlHidricoService);
  private readonly cdr = inject(ChangeDetectorRef);

  private peticionLista?: Subscription;
  private peticionAccion?: Subscription;
  private peticionRegistros?: Subscription;
  private peticionResultado?: Subscription;
  private destruido = false;

  // ------------------- ESTADO DE LA VISTA -------------------
  /** El episodio es un historial cerrado: se consulta, pero no se registran cambios. */
  get soloLectura(): boolean {
    return this.episodioActivo.esSoloLectura();
  }

  /** Solo el autor del registro (o un rol global) puede editarlo o eliminarlo. */
  puedeGestionar(usuarioId: number): boolean {
    return !this.soloLectura && this.propiedadRegistro.puedeGestionar(usuarioId);
  }

  /** Pestaña activa del registro: cuidado de nombre libre o monitoreo de un tipo. */
  tipoAtencion: TipoAtencion = 'cuidado';

  /** Tipos de monitoreo que ofrece el desplegable de la pestaña Monitoreo. */
  readonly tiposMonitoreo = CONTROLES_MONITOREO.map((control) => control.nombre);

  /** Campos del formulario del cuidado: nombre, frecuencia, duración y observaciones. */
  nombreCuidado = '';
  frecuenciaCuidado: number | null = null;
  duracionTipoCuidado: TipoDuracion | '' = '';
  duracionCantidadCuidado: number | null = null;
  fechaInicioCuidado = '';
  observacionesCuidado = '';

  /** Tarjeta del listado con su menú desplegado; null si no hay ninguna. */
  menuIndicacionAbierta: number | null = null;

  /** Cuidado cuyos datos están cargados en el formulario; null al capturar un cuidado nuevo. */
  cuidadoEnEdicion: number | null = null;

  /** Valores originales del cuidado en edición, para deshabilitar el botón sin cambios. */
  private edicionOriginal: FormularioCuidadoOriginal | null = null;

  /** Tipos de duración que ofrece el desplegable de la duración. */
  tiposDuracion = TIPOS_DURACION;

  /** Cuidados del episodio con el filtro elegido, ya traducidos a la vista. */
  cuidados: CuidadoVista[] = [];

  /** Tarjeta cuyos registros de Enfermería están desplegados; null si ninguno. */
  registrosCuidadoAbierta: number | null = null;

  /** Ejecución cuyos resultados están desplegados en el historial; null si ninguna. */
  resultadoAbierto: number | null = null;

  /** Resultados del control desplegado. */
  resultadoActual: ResultadoControlVista | null = null;

  /** Estados de carga y error de los resultados del control. */
  cargandoResultado = false;
  errorResultado = false;

  /** Resultados ya consultados por ejecución, para no repetir la petición. */
  private readonly resultadosPorEjecucion = new Map<number, ResultadoControlVista>();

  /** Ejecuciones de Enfermería cargadas por cuidado. */
  private readonly registrosPorCuidado = new Map<number, EjecucionCuidadoVista[]>();

  /** Estado de la carga de los registros de la tarjeta desplegada. */
  cargandoRegistros = false;
  errorRegistros = false;

  /** Estados de las peticiones: bloquean acciones incompatibles y muestran la carga. */
  cargando = false;
  guardando = false;
  eliminando = false;
  confirmando = false;
  errorCarga = false;
  sinEpisodioActivo = false;

  // ------------------- FILTROS DEL LISTADO -------------------
  /** Filtro elegido para el listado de cuidados; abre mostrando los cuidados vigentes. */
  filtroCuidado: FiltroCuidado = 'todas';

  /** Opciones del filtro de cuidados: sus estados y «Todas», que deja fuera los eliminados. */
  readonly filtrosCuidado: FiltroCuidadoVista[] = [
    { id: 'todas', etiqueta: 'Todas', estados: ['EN_PROCESO', 'COMPLETADO'] },
    { id: 'completados', etiqueta: 'Completadas', estados: ['COMPLETADO'] },
    { id: 'enProceso', etiqueta: 'En proceso', estados: ['EN_PROCESO'] },
    { id: 'eliminados', etiqueta: 'Eliminadas', estados: ['ELIMINADO'] },
  ];

  // ------------------- CICLO DE VIDA -------------------
  ngOnInit(): void {
    this.cargarCuidados();
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.peticionLista?.unsubscribe();
    this.peticionAccion?.unsubscribe();
    this.peticionRegistros?.unsubscribe();
    this.peticionResultado?.unsubscribe();
  }

  // ------------------- CONSULTAS PARA LA VISTA -------------------
  /** Verdadero cuando la pestaña activa es Monitoreo: el nombre se elige de una lista. */
  get esMonitoreo(): boolean {
    return this.tipoAtencion === 'monitoreo';
  }

  /** El botón Guardar del cuidado se habilita con el nombre del cuidado escrito. */
  get hayCuidado(): boolean {
    return this.nombreCuidado.trim().length > 0;
  }

  /** La duración en días obliga a indicar cuántos días dura el cuidado. */
  get faltaDuracionEnDiasCuidado(): boolean {
    return calcularFaltaDuracion(this.duracionTipoCuidado, this.duracionCantidadCuidado);
  }

  /**
   * El botón Guardar se habilita con el nombre, la frecuencia y el tipo de duración que exige el
   * backend, con los días resueltos y las observaciones dentro del límite.
   */
  get puedeGuardarCuidado(): boolean {
    return (
      this.hayCuidado &&
      !this.faltaDuracionEnDiasCuidado &&
      this.observacionesCuidado.length <= 2000 &&
      !this.guardando &&
      !this.confirmando
    );
  }

  /** Cuidados que muestra el listado; el backend ya aplica el filtro elegido. */
  get cuidadosFiltrados(): CuidadoVista[] {
    return this.cuidados;
  }

  /** Texto del botón de guardar: «Guardar cambios» al corregir un cuidado existente. */
  get textoBotonGuardar(): string {
    return this.cuidadoEnEdicion === null ? 'Guardar' : 'Guardar cambios';
  }

  /** Verdadero si el cuidado en edición tiene al menos un campo modificado. */
  get hayCambiosEnEdicion(): boolean {
    if (this.edicionOriginal === null) return true;

    return (
      this.nombreCuidado !== this.edicionOriginal.nombreCuidado ||
      this.frecuenciaCuidado !== this.edicionOriginal.frecuenciaCuidado ||
      this.duracionTipoCuidado !== this.edicionOriginal.duracionTipoCuidado ||
      this.duracionCantidadCuidado !== this.edicionOriginal.duracionCantidadCuidado ||
      this.fechaInicioCuidado !== this.edicionOriginal.fechaInicioCuidado ||
      this.observacionesCuidado !== this.edicionOriginal.observacionesCuidado
    );
  }

  /** Texto del listado cuando el filtro elegido no tiene cuidados. */
  get mensajeSinCuidados(): string {
    const filtro = this.filtroActualCuidado;

    return filtro.id === 'todas'
      ? 'Aún no hay cuidados indicados para el paciente.'
      : `No hay cuidados con el filtro «${filtro.etiqueta}».`;
  }

  /** Texto de la tarjeta: cada cuántas horas se realiza y durante cuánto tiempo. */
  textoRealizacion(cuidado: CuidadoVista): string {
    if (cuidado.duracionTipo === 'unica') {
      return 'Realizar una vez';
    }

    const frecuencia = cuidado.frecuencia;
    if (frecuencia === null) {
      return 'Sin programación';
    }

    const cada = `Realizar cada ${frecuencia} ${frecuencia === 1 ? 'hora' : 'horas'}`;

    if (cuidado.duracionTipo === 'dias') {
      const dias = cuidado.duracionCantidad ?? 0;
      return `${cada} por ${dias} ${dias === 1 ? 'día' : 'días'}`;
    }

    if (cuidado.duracionTipo === 'indefinida') {
      return `${cada} por tiempo indefinido`;
    }

    return cada;
  }

  /** Color del borde lateral de la tarjeta del cuidado: describe su estado en el listado. */
  tonoCuidado(cuidado: CuidadoVista): TonoIndicacion {
    return this.tonoDe(cuidado.estado);
  }

  // ------------------- CARGA DEL LISTADO -------------------
  /** Carga los cuidados del episodio activo con el filtro elegido. */
  cargarCuidados(): void {
    if (this.destruido) return;

    const episodioId = this.episodioActivo.obtener();
    this.sinEpisodioActivo = episodioId === null;

    if (episodioId === null) {
      this.cuidados = [];
      this.errorCarga = false;
      this.cargando = false;
      this.cdr.markForCheck();
      return;
    }

    this.cargando = true;
    this.errorCarga = false;
    this.cdr.markForCheck();
    this.peticionLista?.unsubscribe();

    const consultas = this.filtroActualCuidado.estados.map((estado) =>
      this.servicio.buscarPorEpisodio(episodioId, estado),
    );
    const peticion =
      consultas.length === 1 ? consultas[0].pipe(map((lista) => [lista])) : forkJoin(consultas);

    this.peticionLista = peticion
      .pipe(
        finalize(() => {
          this.cargando = false;
          if (!this.destruido) this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (grupos) => {
          if (this.destruido) return;

          const respuestas = grupos
            .flat()
            .sort(
              (a, b) =>
                new Date(b.fechaInicio || b.fecha).getTime() -
                new Date(a.fechaInicio || a.fecha).getTime(),
            );

          this.cuidados = respuestas.map((respuesta) => this.aVista(respuesta));

          // El cuidado en edición no puede quedar fuera del listado visible
          if (
            this.cuidadoEnEdicion !== null &&
            !this.cuidados.some((cuidado) => cuidado.id === this.cuidadoEnEdicion)
          ) {
            this.limpiarFormularioCuidado();
          }
        },
        error: (error) => {
          if (this.destruido) return;

          this.cuidados = [];
          this.errorCarga = true;
          this.mostrarError(error, 'No se pudieron cargar los cuidados. Intente nuevamente.');
        },
      });
  }

  /** Muestra los cuidados del filtro elegido y recarga el listado. */
  seleccionarFiltroCuidado(filtro: FiltroCuidado): void {
    this.filtroCuidado = filtro;
    this.cerrarMenuIndicacion();
    this.cerrarResultado();
    this.registrosCuidadoAbierta = null;
    this.cargarCuidados();
  }

  // ------------------- PESTAÑA DE ATENCIÓN -------------------
  /**
   * Conmuta entre el registro de un cuidado y el de un monitoreo. Limpia el nombre capturado para
   * no arrastrar un valor que no pertenece a la lista del otro modo.
   */
  cambiarTipoAtencion(esCuidado: boolean): void {
    this.tipoAtencion = esCuidado ? 'cuidado' : 'monitoreo';
    this.nombreCuidado = '';
    this.cdr.markForCheck();
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
    // Cada tarjeta del listado lleva el identificador de su cuidado
    const tarjetaAbierta = tarjeta?.dataset['cuidadoId'];

    if (tarjetaAbierta !== String(this.menuIndicacionAbierta)) {
      this.cerrarMenuIndicacion();
    }
  }

  // ------------------- REGISTROS DE ENFERMERÍA -------------------
  /** Indica si los registros de Enfermería del cuidado están desplegados. */
  registrosAbiertos(id: number): boolean {
    return this.registrosCuidadoAbierta === id;
  }

  /** Despliega u oculta las ejecuciones de Enfermería del cuidado. */
  alternarRegistros(cuidado: CuidadoVista): void {
    this.cerrarResultado();

    if (this.registrosCuidadoAbierta === cuidado.id) {
      this.registrosCuidadoAbierta = null;
      return;
    }

    this.registrosCuidadoAbierta = cuidado.id;
    this.cargarRegistros(cuidado.id);
  }

  /** Indica si la ejecución tiene resultados de monitoreo u observación que mostrar. */
  tieneDetalle(registro: EjecucionCuidadoVista): boolean {
    return registro.monitoreoId !== null || registro.observacion.trim().length > 0;
  }

  /** Despliega los resultados del control o la observación de la ejecución. */
  verResultados(registro: EjecucionCuidadoVista): void {
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

  private cargarResultado(registro: EjecucionCuidadoVista): void {
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

  /** Ejecuciones de Enfermería ya cargadas de un cuidado. */
  registrosDe(id: number): EjecucionCuidadoVista[] {
    return this.registrosPorCuidado.get(id) ?? [];
  }

  /** Consulta las ejecuciones registradas por Enfermería para el cuidado. */
  private cargarRegistros(cuidadoId: number): void {
    if (this.destruido) return;

    this.cargandoRegistros = true;
    this.errorRegistros = false;
    this.cdr.markForCheck();
    this.peticionRegistros?.unsubscribe();

    this.peticionRegistros = this.registrosEnfermeria
      .buscarEjecucionesPorCuidado(cuidadoId)
      .pipe(
        finalize(() => {
          this.cargandoRegistros = false;
          if (!this.destruido) this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (registros) => {
          if (this.destruido) return;

          this.registrosPorCuidado.set(
            cuidadoId,
            registros.map((registro, indice) => this.aEjecucionVista(registro, indice)),
          );
        },
        error: (error) => {
          if (this.destruido) return;

          this.errorRegistros = true;
          this.registrosPorCuidado.delete(cuidadoId);
          this.mostrarError(error, 'No se pudieron cargar los registros de Enfermería.');
        },
      });
  }

  /** Traduce una ejecución de Enfermería a la fila de la tabla. */
  private aEjecucionVista(
    respuesta: EjecucionCuidadoResponse,
    indice: number,
  ): EjecucionCuidadoVista {
    const programada = new Date(respuesta.fechaHoraProgramada);
    const registrada = new Date(respuesta.fechaRegistro);
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
      numero: indice + 1,
      fechaHoraProgramada: this.formatearFechaHora(programada),
      fechaRegistro: this.formatearFechaHora(registrada),
      estado: respuesta.estado === 'REALIZADO' ? 'Realizado' : 'No realizado',
      esPositivo: respuesta.estado === 'REALIZADO',
      usuario: respuesta.usuarioNombre,
      observacion: respuesta.observacion ?? '',
      monitoreoId:
        respuesta.signosVitalesId ?? respuesta.glucosaId ?? respuesta.controlHidricoId ?? null,
      monitoreoTipo,
    };
  }

  // ------------------- CAPTURA Y EDICIÓN -------------------
  /** Carga en el formulario el cuidado elegido para corregirlo. */
  editarCuidado(cuidado: CuidadoVista): void {
    if (this.guardando || this.eliminando) return;

    this.cerrarMenuIndicacion();
    this.cerrarResultado();
    this.cuidadoEnEdicion = cuidado.id;
    this.tipoAtencion = controlDeNombre(cuidado.nombre) ? 'monitoreo' : 'cuidado';
    this.nombreCuidado = cuidado.nombre;
    this.frecuenciaCuidado = cuidado.frecuencia;
    this.duracionTipoCuidado = cuidado.duracionTipo;
    this.duracionCantidadCuidado = cuidado.duracionCantidad;
    this.fechaInicioCuidado = this.aFechaHoraInput(cuidado.fechaInicio);
    this.observacionesCuidado = cuidado.observaciones;

    this.edicionOriginal = {
      nombreCuidado: this.nombreCuidado,
      frecuenciaCuidado: this.frecuenciaCuidado,
      duracionTipoCuidado: this.duracionTipoCuidado,
      duracionCantidadCuidado: this.duracionCantidadCuidado,
      fechaInicioCuidado: this.fechaInicioCuidado,
      observacionesCuidado: this.observacionesCuidado,
    };
  }

  /** Deja el formulario del cuidado listo para capturar uno nuevo. */
  limpiarFormularioCuidado(): void {
    this.cerrarResultado();
    this.nombreCuidado = '';
    this.frecuenciaCuidado = null;
    this.duracionTipoCuidado = '';
    this.duracionCantidadCuidado = null;
    this.fechaInicioCuidado = '';
    this.observacionesCuidado = '';
    this.cuidadoEnEdicion = null;
    this.edicionOriginal = null;
  }

  /**
   * Crea el cuidado o actualiza el que está en edición. El cuerpo lleva el episodio activo, el
   * usuario de la sesión y los valores que exige el contrato del backend.
   */
  async agregarCuidado(): Promise<void> {
    if (this.destruido || this.guardando || this.confirmando) return;

    if (!this.puedeGuardarCuidado) {
      this.avisarValidacion();
      return;
    }

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

    const idEditado = this.cuidadoEnEdicion;

    if (idEditado !== null) {
      this.confirmando = true;
      this.cdr.markForCheck();
      const confirmado = await this.popUps
        .confirmarToast(
          `¿Está seguro de guardar los cambios del cuidado "${this.nombreCuidado.trim()}"?`,
        )
        .catch(() => false);
      this.confirmando = false;
      this.cdr.markForCheck();

      if (!confirmado || this.destruido) return;
    }

    const cuerpo: CuidadoRequest = {
      nombreCuidado: this.nombreCuidado.trim(),
      frecuencia: this.frecuenciaCuidado,
      // El número de días solo se guarda con el tipo «días»
      duracion: this.duracionTipoCuidado === 'dias' ? this.duracionCantidadCuidado : null,
      tipoDuracion:
        this.duracionTipoCuidado === ''
          ? null
          : this.aDuracionApi(this.duracionTipoCuidado as TipoDuracion),
      observacion: this.observacionesCuidado.trim() || null,
      episodioId,
      usuarioId,
      fechaInicio: this.fechaInicioCuidado || null,
    };

    this.guardando = true;
    this.cdr.markForCheck();
    this.peticionAccion?.unsubscribe();
    this.peticionAccion = (
      idEditado === null
        ? this.servicio.crearCuidado(cuerpo)
        : this.servicio.actualizarCuidado(idEditado, cuerpo)
    )
      .pipe(
        finalize(() => {
          this.guardando = false;
          if (!this.destruido) this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          if (this.destruido) return;

          this.limpiarFormularioCuidado();
          this.popUps.exito(
            idEditado === null
              ? 'Cuidado guardado exitosamente.'
              : 'Cuidado actualizado exitosamente.',
          );
          this.cargarCuidados();
        },
        error: (error) => {
          if (this.destruido) return;

          this.mostrarError(error, 'No se pudo guardar el cuidado. Intente nuevamente.');
        },
      });
  }

  /** Confirma y pasa el cuidado al estado eliminado; el listado se recarga. */
  async eliminarCuidado(cuidado: CuidadoVista): Promise<void> {
    if (this.destruido || this.eliminando || this.guardando || this.confirmando) return;

    this.cerrarMenuIndicacion();

    this.confirmando = true;
    this.cdr.markForCheck();
    const confirmado = await this.popUps
      .confirmarToast(`¿Está seguro de eliminar el cuidado "${cuidado.nombre}"?`)
      .catch(() => false);
    this.confirmando = false;
    this.cdr.markForCheck();

    if (!confirmado || this.destruido) return;

    this.eliminando = true;
    this.cdr.markForCheck();
    this.peticionAccion?.unsubscribe();
    this.peticionAccion = this.servicio
      .eliminarCuidado(cuidado.id)
      .pipe(
        finalize(() => {
          this.eliminando = false;
          if (!this.destruido) this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          if (this.destruido) return;

          if (this.cuidadoEnEdicion === cuidado.id) {
            this.limpiarFormularioCuidado();
          }
          this.popUps.exito('Cuidado eliminado exitosamente.');
          this.cargarCuidados();
        },
        error: (error) => {
          if (this.destruido) return;

          this.mostrarError(error, 'No se pudo eliminar el cuidado. Intente nuevamente.');
        },
      });
  }

  // ------------------- APOYO -------------------
  /** Traduce el cuidado del backend a los datos que pinta la tarjeta. */
  private aVista(respuesta: CuidadoResponse): CuidadoVista {
    const fechaRegistro = new Date(respuesta.fecha);

    return {
      id: respuesta.id,
      usuarioId: respuesta.usuarioId,
      nombre: respuesta.nombreCuidado,
      frecuencia: respuesta.frecuencia,
      duracionTipo:
        respuesta.tipoDuracion === null ? '' : this.aDuracionVista(respuesta.tipoDuracion),
      duracionCantidad: respuesta.duracion,
      observaciones: respuesta.observacion ?? '',
      fechaInicio: respuesta.fechaInicio ?? '',
      fecha: this.formatearFecha(fechaRegistro),
      hora: this.formatearHora(fechaRegistro),
      medico: respuesta.usuarioNombreCorto,
      estado: this.aEstadoVista(respuesta.estado),
    };
  }

  /** Convierte el tipo de duración del backend al valor del formulario. */
  private aDuracionVista(tipo: TipoDuracionCuidadoApi): TipoDuracion {
    if (tipo === 'DOSIS_UNICA') return 'unica';
    if (tipo === 'TIEMPO_INDEFINIDO') return 'indefinida';
    return 'dias';
  }

  /** Convierte el tipo de duración del formulario al enum del backend. */
  private aDuracionApi(tipo: TipoDuracion): TipoDuracionCuidadoApi {
    if (tipo === 'unica') return 'DOSIS_UNICA';
    if (tipo === 'indefinida') return 'TIEMPO_INDEFINIDO';
    return 'DIAS';
  }

  /** Convierte el estado del backend al estado de la vista. */
  private aEstadoVista(estado: EstadoCuidadoApi): EstadoCuidado {
    if (estado === 'COMPLETADO') return 'completado';
    if (estado === 'EN_PROCESO') return 'enProceso';
    return 'eliminado';
  }

  /** Color del borde lateral de la tarjeta según el estado del cuidado. */
  private tonoDe(estado: EstadoCuidado): TonoIndicacion {
    if (estado === 'completado') return 'verde';
    if (estado === 'enProceso') return 'naranja';
    return 'rojo';
  }

  /** Fecha del cuidado en el formato corto de la tarjeta (dd/MM/yyyy). */
  private formatearFecha(fecha: Date): string {
    if (Number.isNaN(fecha.getTime())) return '';

    const dia = `${fecha.getDate()}`.padStart(2, '0');
    const mes = `${fecha.getMonth() + 1}`.padStart(2, '0');
    return `${dia}/${mes}/${fecha.getFullYear()}`;
  }

  /** Hora del cuidado en el formato de la tarjeta (HH:mm). */
  private formatearHora(fecha: Date): string {
    if (Number.isNaN(fecha.getTime())) return '';

    const horas = `${fecha.getHours()}`.padStart(2, '0');
    const minutos = `${fecha.getMinutes()}`.padStart(2, '0');
    return `${horas}:${minutos}`;
  }

  /** Fecha y hora en formato dd/MM/yyyy HH:mm. */
  private formatearFechaHora(fecha: Date): string {
    return `${this.formatearFecha(fecha)} ${this.formatearHora(fecha)}`;
  }

  /** Recorta la fecha ISO al formato que acepta datetime-local, o la deja vacía. */
  private aFechaHoraInput(fecha: string | null): string {
    return fecha ? fecha.slice(0, 16) : '';
  }

  /** Avisa del campo que impide guardar cuando el formulario se envía incompleto. */
  private avisarValidacion(): void {
    if (!this.hayCuidado) {
      this.popUps.advertencia('El nombre del cuidado es obligatorio.');
      return;
    }
    if (this.faltaDuracionEnDiasCuidado) {
      this.popUps.advertencia('Indique cuántos días dura el cuidado.');
      return;
    }
    if (this.observacionesCuidado.length > 2000) {
      this.popUps.advertencia('Las observaciones no pueden superar los 2000 caracteres.');
    }
  }

  /** Opción del filtro de cuidados elegida en el listado. */
  private get filtroActualCuidado(): FiltroCuidadoVista {
    return (
      this.filtrosCuidado.find((filtro) => filtro.id === this.filtroCuidado) ??
      this.filtrosCuidado[0]
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
