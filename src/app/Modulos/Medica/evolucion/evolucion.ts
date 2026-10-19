import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, Subscription, TimeoutError } from 'rxjs';
import { PopUps } from '../../../shared/popUps/popUpsService';
import { AuthService } from '../../Auth/data/auth-service';
import { EpisodioActivoService } from '../data/episodio-activo-service';
import { DatosPaciente } from '../datos-paciente/datos-paciente';
import {
  EvolucionRequest,
  EvolucionResponse,
  EstadoEvolucionApi,
} from './data/evolucionInterfaz';
import { EvolucionService } from './data/evolucion-service';

/* Tipos locales de la vista: traducen el contrato del backend al lenguaje de las tarjetas. */
/** Colores del acento de las tarjetas del historial de evoluciones. */
type TonoEvolucion = 'verde' | 'azul' | 'naranja' | 'morado';

/** Estado de la evolución registrada: las eliminadas se conservan para poder consultarlas. */
type EstadoEvolucion = 'activa' | 'eliminada';

/** Filtros del historial de evoluciones: las vigentes o las eliminadas. */
type FiltroEvolucion = 'activas' | 'eliminadas';

/** Evolución registrada en el episodio: quién la escribió, cuándo y su contenido clínico. */
interface EvolucionVista {
  id: number;
  medico: string;
  fecha: string;
  hora: string;
  /** Condición actual, cambios clínicos, hallazgos y respuesta al tratamiento. */
  evolucionClinica: string;
  /** Decisiones clínicas y plan de seguimiento. */
  planMedico: string;
  tono: TonoEvolucion;
  estado: EstadoEvolucion;
}

/** Opción del filtro del historial: la etiqueta que se pulsa y el estado del backend que lista. */
interface FiltroEvolucionVista {
  id: FiltroEvolucion;
  etiqueta: string;
  estado: EstadoEvolucionApi;
}

/**
 * Evolución médica del episodio: pantalla del módulo Médico con el registro de la evolución
 * (evolución clínica y plan médico) y el historial de las evoluciones registradas, que se listan
 * como las tarjetas del módulo. Las operaciones se guardan contra el backend; el episodio y el
 * usuario salen del contexto de la sesión.
 */
@Component({
  selector: 'app-evolucion',
  imports: [FormsModule, DatosPaciente],
  templateUrl: './evolucion.html',
  styleUrl: './evolucion.scss',
  host: {
    '(document:click)': 'cerrarMenuAlClicFuera($event)',
  },
})
export class Evolucion implements OnInit, OnDestroy {
  private readonly popUps = inject(PopUps);
  private readonly servicio = inject(EvolucionService);
  private readonly authService = inject(AuthService);
  private readonly episodioActivo = inject(EpisodioActivoService);
  private readonly cdr = inject(ChangeDetectorRef);

  private peticionLista?: Subscription;
  private peticionAccion?: Subscription;
  private destruido = false;

  // ------------------- ESTADO DE LA VISTA -------------------
  /** El episodio es un historial cerrado: se consulta, pero no se registran cambios. */
  get soloLectura(): boolean {
    return this.episodioActivo.esSoloLectura();
  }

  /** Longitud máxima de cada cuadro del registro de la evolución. */
  readonly maxCaracteres = 1000;

  /** Campos del formulario del registro. */
  evolucionClinica = '';
  planMedico = '';

  /** La ficha con los datos del paciente está desplegada; la abre su pestaña lateral. */
  pacienteAbierto = false;

  /** El cuerpo de la ficha del paciente está desplegado; el chevron de su encabezado lo pliega. */
  datosPacienteVisibles = true;

  /** Tarjeta del historial con su menú de opciones desplegado; null si no hay ninguna. */
  menuEvolucionAbierta: number | null = null;

  /** Evolución cuyos datos están cargados en el registro para corregirla; null al capturar una nueva. */
  evolucionEnEdicion: number | null = null;

  /** Evoluciones del episodio con el filtro elegido, ya traducidas a la vista. */
  evoluciones: EvolucionVista[] = [];

  /** Estados de las peticiones: bloquean acciones incompatibles y muestran la carga. */
  cargando = false;
  guardando = false;
  eliminando = false;
  confirmando = false;
  errorCarga = false;
  sinEpisodioActivo = false;

  /** Colores con que se reparten los acentos de las tarjetas. */
  private readonly tonos: TonoEvolucion[] = ['verde', 'azul', 'naranja', 'morado'];

  // ------------------- FILTROS DEL HISTORIAL -------------------
  /** Filtro elegido en el historial; abre mostrando las evoluciones vigentes. */
  filtroEvolucion: FiltroEvolucion = 'activas';

  /** Opciones del filtro del historial: las evoluciones vigentes y las eliminadas. */
  readonly filtrosEvolucion: FiltroEvolucionVista[] = [
    { id: 'activas', etiqueta: 'Activas', estado: 'ACTIVA' },
    { id: 'eliminadas', etiqueta: 'Eliminadas', estado: 'ELIMINADA' },
  ];

  // ------------------- CICLO DE VIDA -------------------
  ngOnInit(): void {
    this.cargarEvoluciones();
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.peticionLista?.unsubscribe();
    this.peticionAccion?.unsubscribe();
  }

  // ------------------- CONSULTAS PARA LA VISTA -------------------
  /** Evoluciones que muestra el historial; el backend ya aplica el filtro elegido. */
  get evolucionesFiltradas(): EvolucionVista[] {
    return this.evoluciones;
  }

  /** Texto del listado cuando el filtro elegido no tiene evoluciones. */
  get mensajeSinEvoluciones(): string {
    return this.filtroActualEvolucion.id === 'eliminadas'
      ? 'No hay evoluciones eliminadas en el episodio.'
      : 'Aún no hay evoluciones registradas para el paciente.';
  }

  /** Solo se puede guardar cuando la evolución clínica y el plan médico tienen contenido. */
  get puedeGuardar(): boolean {
    return (
      this.evolucionClinica.trim().length > 0 &&
      this.planMedico.trim().length > 0 &&
      this.evolucionClinica.length <= this.maxCaracteres &&
      this.planMedico.length <= this.maxCaracteres &&
      !this.guardando &&
      !this.confirmando
    );
  }

  // ------------------- CARGA DEL HISTORIAL -------------------
  /** Carga las evoluciones del episodio activo con el filtro elegido. */
  cargarEvoluciones(): void {
    if (this.destruido) return;

    const episodioId = this.episodioActivo.obtener();
    this.sinEpisodioActivo = episodioId === null;

    if (episodioId === null) {
      this.evoluciones = [];
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
      .buscarPorEpisodio(episodioId, this.filtroActualEvolucion.estado)
      .pipe(
        finalize(() => {
          this.cargando = false;
          if (!this.destruido) this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (respuestas) => {
          if (this.destruido) return;

          this.evoluciones = respuestas.map((respuesta) => this.aVista(respuesta));

          // La evolución en edición no puede quedar fuera del historial visible
          if (
            this.evolucionEnEdicion !== null &&
            !this.evoluciones.some((evolucion) => evolucion.id === this.evolucionEnEdicion)
          ) {
            this.cancelarCaptura();
          }
        },
        error: (error) => {
          if (this.destruido) return;

          this.evoluciones = [];
          this.errorCarga = true;
          this.mostrarError(
            error,
            'No se pudieron cargar las evoluciones. Intente nuevamente.',
          );
        },
      });
  }

  /** Muestra las evoluciones del estado elegido y recarga el historial. */
  seleccionarFiltroEvolucion(filtro: FiltroEvolucion): void {
    this.filtroEvolucion = filtro;
    this.cerrarMenuEvolucion();
    this.cargarEvoluciones();
  }

  // ------------------- FICHA DEL PACIENTE -------------------
  /**
   * Abre o cierra la ficha con los datos del paciente desde la pestaña lateral del bloque
   * compartido, igual que en evaluación clínica y en indicaciones médicas.
   */
  cambiarFichaPaciente(abierto: boolean): void {
    this.pacienteAbierto = abierto;

    if (abierto) {
      this.datosPacienteVisibles = true;
    }
  }

  // ------------------- MENÚ DE LA TARJETA -------------------
  /** Muestra u oculta el menú de opciones de la tarjeta pulsada. */
  alternarMenuEvolucion(id: number): void {
    this.menuEvolucionAbierta = this.menuEvolucionAbierta === id ? null : id;
  }

  /** Cierra el menú de opciones que esté desplegado. */
  cerrarMenuEvolucion(): void {
    this.menuEvolucionAbierta = null;
  }

  /** Cierra el menú al pulsar fuera de la tarjeta que lo tiene abierto. */
  cerrarMenuAlClicFuera(evento: Event): void {
    if (this.menuEvolucionAbierta === null || !(evento.target instanceof Element)) {
      return;
    }

    const tarjeta = evento.target.closest<HTMLElement>('.evolucion-card');
    // Cada tarjeta del historial lleva el identificador de su evolución
    if (tarjeta?.dataset['evolucionId'] !== String(this.menuEvolucionAbierta)) {
      this.cerrarMenuEvolucion();
    }
  }

  // ------------------- CAPTURA Y EDICIÓN -------------------
  /** Carga en el registro la evolución elegida para corregirla. */
  editarEvolucion(evolucion: EvolucionVista): void {
    if (this.guardando || this.eliminando || this.confirmando) return;

    this.cerrarMenuEvolucion();
    this.evolucionEnEdicion = evolucion.id;
    this.evolucionClinica = evolucion.evolucionClinica;
    this.planMedico = evolucion.planMedico;
  }

  /** Deja el formulario vacío para capturar una evolución nueva. */
  limpiarFormulario(): void {
    this.evolucionClinica = '';
    this.planMedico = '';
  }

  /** Descarta lo capturado y deja el registro listo para escribir una evolución nueva. */
  cancelarCaptura(): void {
    this.evolucionEnEdicion = null;
    this.limpiarFormulario();
  }

  /**
   * Crea la evolución o actualiza la que está en edición. El cuerpo lleva el episodio activo, el
   * usuario de la sesión y los valores que exige el contrato del backend.
   */
  async guardarEvolucion(): Promise<void> {
    if (this.destruido || this.guardando || this.confirmando) return;

    if (!this.puedeGuardar) {
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

    const idEditado = this.evolucionEnEdicion;

    if (idEditado !== null) {
      const referencia = this.evoluciones.find((evolucion) => evolucion.id === idEditado)?.fecha;
      const mensaje = referencia
        ? `¿Está seguro de guardar los cambios de la evolución del ${referencia}?`
        : '¿Está seguro de guardar los cambios de la evolución?';

      this.confirmando = true;
      this.cdr.markForCheck();
      const confirmado = await this.popUps.confirmarToast(mensaje).catch(() => false);
      this.confirmando = false;
      this.cdr.markForCheck();

      if (!confirmado || this.destruido) return;
    }

    const cuerpo: EvolucionRequest = {
      evolucionClinica: this.evolucionClinica.trim(),
      planMedico: this.planMedico.trim(),
      episodioId,
      usuarioId,
    };

    this.guardando = true;
    this.cdr.markForCheck();
    this.peticionAccion?.unsubscribe();
    this.peticionAccion = (
      idEditado === null
        ? this.servicio.crear(cuerpo)
        : this.servicio.actualizar(idEditado, cuerpo)
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

          // La evolución registrada es vigente: el historial vuelve a las activas para dejarla a la vista
          if (idEditado === null) {
            this.filtroEvolucion = 'activas';
          }
          this.cancelarCaptura();
          this.popUps.exito(
            idEditado === null
              ? 'Evolución guardada exitosamente.'
              : 'Evolución actualizada exitosamente.',
          );
          this.cargarEvoluciones();
        },
        error: (error) => {
          if (this.destruido) return;

          this.mostrarError(
            error,
            'No se pudo guardar la evolución. Intente nuevamente.',
          );
        },
      });
  }

  /** Confirma y pasa la evolución al estado eliminado; el historial se recarga. */
  async eliminarEvolucion(evolucion: EvolucionVista): Promise<void> {
    if (this.destruido || this.eliminando || this.guardando || this.confirmando) return;

    this.cerrarMenuEvolucion();

    this.confirmando = true;
    this.cdr.markForCheck();
    const confirmado = await this.popUps
      .confirmarToast(`¿Está seguro de eliminar la evolución del ${evolucion.fecha}?`)
      .catch(() => false);
    this.confirmando = false;
    this.cdr.markForCheck();

    if (!confirmado || this.destruido) return;

    this.eliminando = true;
    this.cdr.markForCheck();
    this.peticionAccion?.unsubscribe();
    this.peticionAccion = this.servicio
      .eliminar(evolucion.id)
      .pipe(
        finalize(() => {
          this.eliminando = false;
          if (!this.destruido) this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          if (this.destruido) return;

          if (this.evolucionEnEdicion === evolucion.id) {
            this.cancelarCaptura();
          }
          this.popUps.exito('Evolución eliminada exitosamente.');
          this.cargarEvoluciones();
        },
        error: (error) => {
          if (this.destruido) return;

          this.mostrarError(
            error,
            'No se pudo eliminar la evolución. Intente nuevamente.',
          );
        },
      });
  }

  // ------------------- APOYO -------------------
  /** Traduce la evolución del backend a los datos que pinta la tarjeta. */
  private aVista(respuesta: EvolucionResponse): EvolucionVista {
    const fecha = new Date(respuesta.fecha);

    return {
      id: respuesta.id,
      medico: respuesta.usuarioNombre,
      fecha: this.formatearFecha(fecha),
      hora: this.formatearHora(fecha),
      evolucionClinica: respuesta.evolucionClinica,
      planMedico: respuesta.planMedico,
      tono: this.tonoDe(respuesta.id),
      estado: respuesta.estado === 'ELIMINADA' ? 'eliminada' : 'activa',
    };
  }

  /** Color estable del acento de la tarjeta según el identificador de la evolución. */
  private tonoDe(id: number): TonoEvolucion {
    return this.tonos[Math.abs(id) % this.tonos.length];
  }

  /** Fecha de la evolución en el formato corto de la tarjeta (dd/MM/yyyy). */
  private formatearFecha(fecha: Date): string {
    if (Number.isNaN(fecha.getTime())) return '';

    const dia = `${fecha.getDate()}`.padStart(2, '0');
    const mes = `${fecha.getMonth() + 1}`.padStart(2, '0');
    return `${dia}/${mes}/${fecha.getFullYear()}`;
  }

  /** Hora de la evolución en el formato de la tarjeta (HH:mm). */
  private formatearHora(fecha: Date): string {
    if (Number.isNaN(fecha.getTime())) return '';

    const horas = `${fecha.getHours()}`.padStart(2, '0');
    const minutos = `${fecha.getMinutes()}`.padStart(2, '0');
    return `${horas}:${minutos}`;
  }

  /** Avisa del campo que impide guardar cuando el formulario se envía incompleto. */
  private avisarValidacion(): void {
    if (!this.evolucionClinica.trim()) {
      this.popUps.advertencia('La evolución clínica es obligatoria.');
      return;
    }
    if (!this.planMedico.trim()) {
      this.popUps.advertencia('El plan médico es obligatorio.');
      return;
    }
    if (
      this.evolucionClinica.length > this.maxCaracteres ||
      this.planMedico.length > this.maxCaracteres
    ) {
      this.popUps.advertencia(
        `Los textos no pueden superar los ${this.maxCaracteres} caracteres.`,
      );
    }
  }

  /** Opción del filtro del historial elegida en el listado. */
  private get filtroActualEvolucion(): FiltroEvolucionVista {
    return (
      this.filtrosEvolucion.find((filtro) => filtro.id === this.filtroEvolucion) ??
      this.filtrosEvolucion[0]
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
