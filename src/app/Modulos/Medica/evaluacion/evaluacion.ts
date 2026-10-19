import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, Subscription, switchMap, tap, TimeoutError } from 'rxjs';
import { AuthService } from '../../Auth/data/auth-service';
import { PopUps } from '../../../shared/popUps/popUpsService';
import { DatosPaciente } from '../datos-paciente/datos-paciente';
import { EpisodioActivoService } from '../data/episodio-activo-service';
import { Diagnostico } from './diagnostico/diagnostico';
import { HistoriaClinica } from './historia-clinica/historia-clinica';
import { ExamenFisicoService } from './data/examen-fisico-service';
import {
  ExamenFisicoRequest,
  ExamenFisicoResponse,
  ParteCuerpoResponse,
} from './data/examenFisicoInterfaz';

interface SeccionVista {
  id: string;
  titulo: string;
  descripcion: string;
  icono: string;
}

/** Hallazgo registrado listo para la tarjeta de la lista: fecha y hora ya formateadas. */
interface HallazgoVista {
  id: number;
  parteCuerpoId: number;
  parteCuerpo: string;
  descripcion: string;
  fecha: string;
  hora: string;
  usuario: string;
}

@Component({
  selector: 'app-evaluacion',
  imports: [FormsModule, HistoriaClinica, Diagnostico, DatosPaciente],
  templateUrl: './evaluacion.html',
  styleUrl: './evaluacion.scss',
  host: {
    '(document:click)': 'cerrarMenuAlClicFuera($event)',
  },
})
export class Evaluacion implements OnInit, OnDestroy {
  private peticion?: Subscription;
  private destruido = false;

  /** Episodio activo del módulo: lo abre la selección del paciente y se conserva hasta cerrarlo. */
  private get episodioId(): number | null {
    return this.episodioActivo.obtener();
  }

  constructor(
    private examenFisicoService: ExamenFisicoService,
    private authService: AuthService,
    private episodioActivo: EpisodioActivoService,
    private popUps: PopUps,
    private cdr: ChangeDetectorRef,
  ) {}

  // ------------------- ESTADO DE LA VISTA -------------------
  /** La descripción del hallazgo no puede superar los caracteres que acepta el backend. */
  readonly maxCaracteres = 2000;

  /** Sección del episodio que se muestra en el área central de la pantalla. */
  seccionActiva = 'examen-fisico';

  /** La pestaña lateral del área de trabajo abre y cierra la ficha del paciente. */
  pacienteAbierto = false;

  /** El chevron del encabezado pliega el cuerpo de la ficha sin ocultar el título. */
  datosPacienteVisibles = true;

  /** Mientras están activos bloquean las acciones que ya tienen una petición en curso. */
  cargando = false;
  guardando = false;
  eliminando = false;

  /** Partes del cuerpo del catálogo: cada una es una región donde se registra un hallazgo. */
  partesCuerpo: ParteCuerpoResponse[] = [];
  parteSeleccionadaId: number | null = null;

  /** Hallazgos registrados del episodio, del más reciente al más antiguo. */
  hallazgos: HallazgoVista[] = [];

  /** Texto del cuadro de captura: el formulario arranca vacío y solo se llena al editar una tarjeta. */
  hallazgoActual = '';

  /** Hallazgo cargado en el formulario para corregirlo; nulo mientras se captura uno nuevo. */
  hallazgoEnEdicion: HallazgoVista | null = null;

  /** Descripción con la que se cargó el hallazgo en edición; sirve para detectar cambios. */
  private textoOriginal = '';

  /** Parte del cuerpo con la que se cargó el hallazgo en edición; sirve para detectar cambios. */
  private parteOriginal: number | null = null;

  /** Menú de opciones desplegado de la tarjeta de hallazgo, por identificador del registro. */
  menuHallazgoAbierto: number | null = null;

  /** El cuadro está en modo edición mientras haya un hallazgo cargado desde una tarjeta. */
  get modoEdicion(): boolean {
    return this.hallazgoEnEdicion !== null;
  }

  /**
   * Habilita "Guardar" solo cuando hay algo que registrar: en una captura nueva exige texto y una
   * parte del cuerpo seleccionada y, en edición, exige que la descripción o la parte hayan cambiado.
   */
  get puedeGuardar(): boolean {
    if (this.cargando || this.guardando || this.eliminando) return false;

    const descripcion = this.hallazgoActual.trim();
    if (!descripcion) return false;

    if (this.hallazgoEnEdicion === null) {
      return this.parteSeleccionadaId !== null;
    }

    return (
      descripcion !== this.textoOriginal.trim() ||
      this.parteSeleccionadaId !== this.parteOriginal
    );
  }

  secciones: SeccionVista[] = [
    {
      id: 'historia-clinica',
      titulo: 'Historia clínica',
      descripcion: 'Antecedentes y padecimiento actual.',
      icono: 'bi-journal-medical',
    },
    {
      id: 'examen-fisico',
      titulo: 'Examen físico',
      descripcion: 'Valoración física por regiones.',
      icono: 'bi-heart-pulse',
    },
    {
      id: 'diagnostico',
      titulo: 'Diagnóstico',
      descripcion: 'Diagnóstico provisional y adicionales.',
      icono: 'bi-clipboard2-check',
    },
  ];

  // ------------------- CONSULTAS PARA LA VISTA -------------------
  /** El episodio es un historial cerrado: se consulta, pero no se registran cambios. */
  get soloLectura(): boolean {
    return this.episodioActivo.esSoloLectura();
  }

  /** Las secciones de historia clínica y diagnóstico muestran siempre el bloque de datos del paciente. */
  get seccionConDatosPaciente(): boolean {
    return this.seccionActiva !== 'examen-fisico';
  }

  /**
   * La ficha con los datos del paciente está desplegada: en el examen físico la abre su pestaña
   * lateral y en historia clínica y diagnóstico, que siempre muestran los datos, se dibuja desplegada
   * y sin pestaña.
   */
  get fichaAbierta(): boolean {
    return this.pacienteAbierto || this.seccionConDatosPaciente;
  }

  /** Solo el examen físico registra hallazgos: las demás secciones no muestran el panel de hallazgos. */
  get mostrarHallazgos(): boolean {
    return this.seccionActiva === 'examen-fisico';
  }

  // ------------------- CICLO DE VIDA -------------------
  ngOnInit(): void {
    this.cargarExamenFisico();
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.peticion?.unsubscribe();
  }

  // ------------------- DATOS DEL EXAMEN FÍSICO -------------------
  /**
   * Trae el catálogo de partes del cuerpo y, con la primera seleccionada, los hallazgos del episodio.
   * Las dos consultas van encadenadas para que la selección inicial ya exista al pintar la captura.
   */
  cargarExamenFisico(): void {
    if (this.destruido) return;

    const episodioId = this.episodioId;
    if (episodioId === null) {
      this.cargando = false;
      this.partesCuerpo = [];
      this.hallazgos = [];
      this.limpiarCaptura();
      this.popUps.advertencia('No hay un episodio activo. Abra el episodio del paciente.');
      return;
    }

    this.cargando = true;
    this.cdr.markForCheck();
    this.peticion?.unsubscribe();
    this.peticion = this.examenFisicoService
      .getPartesCuerpo(true)
      .pipe(
        tap((partesCuerpo) => {
          this.partesCuerpo = partesCuerpo;
          this.parteSeleccionadaId = partesCuerpo.length ? partesCuerpo[0].id : null;
        }),
        switchMap(() => this.examenFisicoService.getExamenesPorEpisodio(episodioId, true)),
        finalize(() => {
          this.cargando = false;
          if (!this.destruido) {
            this.cdr.markForCheck();
          }
        }),
      )
      .subscribe({
        next: (examenes) => {
          if (this.destruido) return;

          this.hallazgos = examenes.map((examen) => this.aHallazgoVista(examen));
          // El formulario arranca vacío: los registros existentes se corrigen desde la tarjeta
          this.limpiarCaptura();
        },
        error: (error) => {
          if (this.destruido) return;

          this.hallazgos = [];
          this.limpiarCaptura();
          this.mostrarError(error, 'No se pudo cargar el examen físico. Intente nuevamente.');
        },
      });
  }

  /** Deja el cuadro listo para capturar un hallazgo nuevo y sale del modo edición. */
  private limpiarCaptura(): void {
    this.hallazgoActual = '';
    this.textoOriginal = '';
    this.parteOriginal = null;
    this.hallazgoEnEdicion = null;
  }

  /** Convierte el registro del backend en los datos que pinta la tarjeta de la lista. */
  private aHallazgoVista(examen: ExamenFisicoResponse): HallazgoVista {
    const fecha = new Date(examen.fecha);

    return {
      id: examen.id,
      parteCuerpoId: examen.parteCuerpoId,
      parteCuerpo: examen.parteCuerpoNombre,
      descripcion: examen.descripcion,
      fecha: this.formatearFecha(fecha),
      hora: this.formatearHora(fecha),
      usuario: examen.usuarioNombre,
    };
  }

  /** Fecha del hallazgo en el formato corto de la lista (dd-MM-yyyy). */
  private formatearFecha(fecha: Date): string {
    if (Number.isNaN(fecha.getTime())) return '';

    const dia = `${fecha.getDate()}`.padStart(2, '0');
    const mes = `${fecha.getMonth() + 1}`.padStart(2, '0');
    return `${dia}-${mes}-${fecha.getFullYear()}`;
  }

  /** Hora del hallazgo en el formato de la lista (h:mm AM/PM). */
  private formatearHora(fecha: Date): string {
    if (Number.isNaN(fecha.getTime())) return '';

    const horas = fecha.getHours();
    const minutos = `${fecha.getMinutes()}`.padStart(2, '0');
    const sufijo = horas < 12 ? 'AM' : 'PM';
    const hora12 = horas % 12 === 0 ? 12 : horas % 12;
    return `${hora12}:${minutos} ${sufijo}`;
  }

  /** Refleja el registro confirmado por el servidor sin volver a pedir la lista. */
  private guardarEnLista(hallazgo: HallazgoVista): void {
    const indice = this.hallazgos.findIndex((registro) => registro.id === hallazgo.id);

    if (indice === -1) {
      this.hallazgos = [hallazgo, ...this.hallazgos];
      return;
    }

    const lista = [...this.hallazgos];
    lista[indice] = hallazgo;
    this.hallazgos = lista;
  }

  /** Avisa del fallo de una petición, distinguiendo el servidor que no responde. */
  private mostrarError(error: unknown, mensajeDefault: string): void {
    if (error instanceof TimeoutError) {
      this.popUps.error(
        'Error de comunicación. El servidor no respondió dentro del tiempo esperado.',
      );
      return;
    }

    this.popUps.errorDesdeBackend(error, mensajeDefault);
  }

  // ------------------- ACCIONES DE LA VISTA -------------------
  /**
   * Abre o cierra la ficha del paciente desde la pestaña lateral del bloque compartido, que avisa del
   * estado pedido. Al abrirla se muestran los datos completos para que el usuario vea la información
   * de contexto aunque la hubiera plegado antes.
   */
  cambiarFicha(abierto: boolean): void {
    this.pacienteAbierto = abierto;

    if (abierto) {
      this.datosPacienteVisibles = true;
    }
  }

  /**
   * Cambia la sección del área central. La ficha plegable se cierra porque las secciones de historia
   * clínica y diagnóstico muestran su propio bloque de datos del paciente.
   */
  seleccionarSeccion(id: string): void {
    this.seccionActiva = id;
    this.pacienteAbierto = false;
  }

  /** Elige la parte del cuerpo que se está capturando; el cuadro permanece vacío hasta escribir. */
  seleccionarParteCuerpo(id: number): void {
    if (this.cargando || this.guardando || this.eliminando) return;
    if (id === this.parteSeleccionadaId) return;

    this.parteSeleccionadaId = id;
  }

  /** Muestra u oculta el menú de opciones de la tarjeta de hallazgo pulsada. */
  alternarMenuHallazgo(id: number): void {
    this.menuHallazgoAbierto = this.menuHallazgoAbierto === id ? null : id;
  }

  /** Cierra el menú de opciones que esté desplegado. */
  cerrarMenuHallazgo(): void {
    this.menuHallazgoAbierto = null;
  }

  /** Cierra el menú al pulsar fuera de la tarjeta que lo tiene abierto. */
  cerrarMenuAlClicFuera(evento: Event): void {
    if (this.menuHallazgoAbierto === null || !(evento.target instanceof Element)) {
      return;
    }

    const tarjeta = evento.target.closest<HTMLElement>('.hallazgo-card');
    if (tarjeta?.dataset['hallazgoId'] !== String(this.menuHallazgoAbierto)) {
      this.cerrarMenuHallazgo();
    }
  }

  /** Carga en el formulario el hallazgo de la tarjeta elegida para corregirlo. */
  editarHallazgo(hallazgo: HallazgoVista): void {
    if (this.cargando || this.guardando || this.eliminando) return;

    this.hallazgoEnEdicion = hallazgo;
    this.parteSeleccionadaId = hallazgo.parteCuerpoId;
    this.hallazgoActual = hallazgo.descripcion;
    this.textoOriginal = hallazgo.descripcion;
    this.parteOriginal = hallazgo.parteCuerpoId;
    this.cerrarMenuHallazgo();
  }

  /** Descarta la captura en curso y deja el formulario vacío para un hallazgo nuevo. */
  cancelarCaptura(): void {
    if (this.cargando || this.guardando || this.eliminando) return;

    this.limpiarCaptura();
  }

  /**
   * Crea el hallazgo de la parte seleccionada o actualiza el que se cargó en edición. Al corregir un
   * registro se confirma el cambio con el popup y, en ambos casos, el formulario queda vacío tras
   * guardar para la siguiente captura.
   */
  async guardarHallazgo(): Promise<void> {
    if (this.destruido || this.cargando || this.guardando || this.eliminando) return;
    if (!this.puedeGuardar) return;

    const enEdicion = this.hallazgoEnEdicion;
    const parteCuerpoId = this.parteSeleccionadaId;
    if (parteCuerpoId === null) {
      this.popUps.error('Seleccione la parte del cuerpo del hallazgo.');
      return;
    }

    const descripcion = this.hallazgoActual.trim();
    if (!descripcion) {
      this.popUps.error('La descripción del hallazgo es obligatoria.');
      return;
    }

    const usuarioId = this.authService.currentUser()?.id;
    if (!usuarioId) {
      this.popUps.error(
        'No se pudo identificar al usuario de la sesión. Inicie sesión nuevamente.',
      );
      return;
    }

    const episodioId = this.episodioId;
    if (episodioId === null) {
      this.popUps.advertencia('No hay un episodio activo. Abra el episodio del paciente.');
      return;
    }

    // Al corregir un hallazgo existente se confirma el cambio antes de enviarlo
    if (enEdicion) {
      const confirmado = await this.popUps
        .confirmarToast('¿Está seguro de guardar los cambios del hallazgo?')
        .catch(() => false);

      if (!confirmado || this.destruido) {
        return;
      }
    }

    const cuerpo: ExamenFisicoRequest = {
      descripcion,
      episodioId,
      parteCuerpoId,
      usuarioId,
    };

    this.guardando = true;
    this.cdr.markForCheck();
    this.peticion?.unsubscribe();
    this.peticion = (
      enEdicion
        ? this.examenFisicoService.putExamen(enEdicion.id, cuerpo)
        : this.examenFisicoService.postExamen(cuerpo)
    )
      .pipe(
        finalize(() => {
          this.guardando = false;
          if (!this.destruido) {
            this.cdr.markForCheck();
          }
        }),
      )
      .subscribe({
        next: (respuesta) => {
          if (this.destruido) return;

          this.guardarEnLista(this.aHallazgoVista(respuesta));
          this.limpiarCaptura();
          this.popUps.exito(
            enEdicion ? 'Hallazgo actualizado exitosamente.' : 'Hallazgo guardado exitosamente.',
          );
        },
        error: (error) => {
          if (this.destruido) return;

          this.mostrarError(error, 'No se pudo guardar el hallazgo. Intente nuevamente.');
        },
      });
  }

  /** Confirma con el popup y da de baja el hallazgo de la tarjeta elegida. */
  async eliminarHallazgo(hallazgo: HallazgoVista): Promise<void> {
    if (this.destruido || this.cargando || this.guardando || this.eliminando) return;

    this.cerrarMenuHallazgo();

    const confirmado = await this.popUps
      .confirmarToast(`¿Está seguro de eliminar el hallazgo de "${hallazgo.parteCuerpo}"?`)
      .catch(() => false);

    if (!confirmado || this.destruido) {
      return;
    }

    this.eliminando = true;
    this.cdr.markForCheck();
    this.peticion?.unsubscribe();
    this.peticion = this.examenFisicoService
      .cambiarEstado(hallazgo.id)
      .pipe(
        finalize(() => {
          this.eliminando = false;
          if (!this.destruido) {
            this.cdr.markForCheck();
          }
        }),
      )
      .subscribe({
        next: () => {
          if (this.destruido) return;

          this.hallazgos = this.hallazgos.filter((registro) => registro.id !== hallazgo.id);
          if (this.hallazgoEnEdicion?.id === hallazgo.id) {
            this.limpiarCaptura();
          }
          this.popUps.exito('Hallazgo eliminado exitosamente.');
        },
        error: (error) => {
          if (this.destruido) return;

          this.mostrarError(error, 'No se pudo eliminar el hallazgo. Intente nuevamente.');
        },
      });
  }
}
