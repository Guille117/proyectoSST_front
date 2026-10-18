import { NgClass } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, forkJoin, map, Subscription, TimeoutError } from 'rxjs';
import { PopUps } from '../../../../shared/popUps/popUpsService';
import { AuthService } from '../../../Auth/data/auth-service';
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

/* Tipos locales de la vista: traducen el contrato del backend al lenguaje de las tarjetas. */
/** Colores de acento lateral de la tarjeta del cuidado; describen su estado en el listado. */
type TonoIndicacion = 'verde' | 'rojo' | 'naranja';

/** Estados en los que puede quedar un cuidado visto en el listado. */
type EstadoCuidado = 'enProceso' | 'completado' | 'eliminado';

/** Filtros del listado de cuidados: un estado concreto o «todas» los cuidados vigentes. */
type FiltroCuidado = 'todas' | 'completados' | 'enProceso' | 'eliminados';

/** Cuidado indicado listo para pintar la tarjeta del listado. */
interface CuidadoVista extends DuracionVista {
  id: number;
  nombre: string;
  /** Frecuencia indicada en horas. */
  frecuencia: number;
  observaciones: string;
  fecha: string;
  hora: string;
  medico: string;
  /** Estado del registro: los eliminados solo se listan con el filtro «Eliminadas». */
  estado: EstadoCuidado;
}

/** Opción del filtro que decide qué cuidados se muestran en el listado. */
interface FiltroCuidadoVista {
  id: FiltroCuidado;
  etiqueta: string;
  /** Estados del backend que reúne la opción; «Todas» excluye los eliminados. */
  estados: EstadoCuidadoApi[];
}

/**
 * Sección de cuidados de las indicaciones médicas: registro del cuidado con su frecuencia, su
 * duración y sus observaciones, y listado de los cuidados indicados en el episodio. Las operaciones
 * se guardan contra el backend; el episodio y el usuario salen del contexto de la sesión.
 */
@Component({
  selector: 'app-indicacion-cuidados',
  imports: [FormsModule, NgClass],
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
  private readonly episodioActivo = inject(EpisodioActivoService);
  private readonly cdr = inject(ChangeDetectorRef);

  private peticionLista?: Subscription;
  private peticionAccion?: Subscription;
  private destruido = false;

  // ------------------- ESTADO DE LA VISTA -------------------
  /** Campos del formulario del cuidado: nombre, frecuencia, duración y observaciones. */
  nombreCuidado = '';
  frecuenciaCuidado: number | null = null;
  duracionTipoCuidado: TipoDuracion | '' = '';
  duracionCantidadCuidado: number | null = null;
  observacionesCuidado = '';

  /** Tarjeta del listado con su menú desplegado; null si no hay ninguna. */
  menuIndicacionAbierta: number | null = null;

  /** Cuidado cuyos datos están cargados en el formulario; null al capturar un cuidado nuevo. */
  cuidadoEnEdicion: number | null = null;

  /** Tipos de duración que ofrece el desplegable de la duración. */
  tiposDuracion = TIPOS_DURACION;

  /** Cuidados del episodio con el filtro elegido, ya traducidos a la vista. */
  cuidados: CuidadoVista[] = [];

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
  }

  // ------------------- CONSULTAS PARA LA VISTA -------------------
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
      this.duracionTipoCuidado !== '' &&
      this.frecuenciaCuidado !== null &&
      Number.isInteger(this.frecuenciaCuidado) &&
      this.frecuenciaCuidado > 0 &&
      this.observacionesCuidado.length <= 2000 &&
      !this.guardando &&
      !this.confirmando
    );
  }

  /** Cuidados que muestra el listado; el backend ya aplica el filtro elegido. */
  get cuidadosFiltrados(): CuidadoVista[] {
    return this.cuidados;
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
            .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

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
    this.cargarCuidados();
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

  // ------------------- CAPTURA Y EDICIÓN -------------------
  /** Carga en el formulario el cuidado elegido para corregirlo. */
  editarCuidado(cuidado: CuidadoVista): void {
    if (this.guardando || this.eliminando) return;

    this.cerrarMenuIndicacion();
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
      frecuencia: this.frecuenciaCuidado!,
      // El número de días solo se guarda con el tipo «días»
      duracion: this.duracionTipoCuidado === 'dias' ? this.duracionCantidadCuidado : null,
      tipoDuracion: this.aDuracionApi(this.duracionTipoCuidado as TipoDuracion),
      observacion: this.observacionesCuidado.trim() || null,
      episodioId,
      usuarioId,
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
    const fecha = new Date(respuesta.fecha);

    return {
      id: respuesta.id,
      nombre: respuesta.nombreCuidado,
      frecuencia: respuesta.frecuencia,
      duracionTipo: this.aDuracionVista(respuesta.tipoDuracion),
      duracionCantidad: respuesta.duracion,
      observaciones: respuesta.observacion ?? '',
      fecha: this.formatearFecha(fecha),
      hora: this.formatearHora(fecha),
      medico: respuesta.usuarioNombre,
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

  /** Avisa del campo que impide guardar cuando el formulario se envía incompleto. */
  private avisarValidacion(): void {
    if (!this.hayCuidado) {
      this.popUps.advertencia('El nombre del cuidado es obligatorio.');
      return;
    }
    if (
      this.frecuenciaCuidado === null ||
      !Number.isInteger(this.frecuenciaCuidado) ||
      this.frecuenciaCuidado <= 0
    ) {
      this.popUps.advertencia('La frecuencia debe ser un número entero mayor a 0.');
      return;
    }
    if (this.duracionTipoCuidado === '') {
      this.popUps.advertencia('Seleccione el tipo de duración.');
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
