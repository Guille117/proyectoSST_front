import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, firstValueFrom, Subscription, switchMap, tap, timeout, TimeoutError } from 'rxjs';
import { AuthService } from '../../Auth/data/auth-service';
import { PropiedadRegistroService } from '../../Auth/data/propiedad-registro-service';
import { OpcionOtroComponent, OpcionOtroValor } from '../../../shared/opcion-otro/opcion-otro';
import { crearSeleccionesPendientes } from '../../../shared/opcion-otro/crear-seleccion-pendiente';
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
import { TIMEOUT_HTTP_MS } from './data/constantes-clinicas';

interface SeccionVista {
  id: string;
  titulo: string;
  descripcion: string;
  icono: string;
}

/** Hallazgo registrado listo para la tarjeta de la lista: fecha y hora ya formateadas. */
interface HallazgoVista {
  id: number;
  usuarioId: number;
  parteCuerpoId: number;
  parteCuerpo: string;
  descripcion: string;
  fecha: string;
  hora: string;
  usuario: string;
}

@Component({
  selector: 'app-evaluacion',
  imports: [FormsModule, OpcionOtroComponent, HistoriaClinica, Diagnostico, DatosPaciente],
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
    private propiedadRegistro: PropiedadRegistroService,
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


  /** Mientras están activos bloquean las acciones que ya tienen una petición en curso. */
  cargando = false;
  guardando = false;
  eliminando = false;

  /** Partes del cuerpo del catálogo: cada una es una región donde se registra un hallazgo. */
  partesCuerpo: ParteCuerpoResponse[] = [];
  parteSeleccionadaId: number | null = null;

  readonly opcionOtroId = -1;
  mostrandoOtroParte = false;
  creandoParte = false;
  preparandoSelecciones = false;
  private parteAnterior: number | null = null;
  private readonly parteOtro = viewChild<OpcionOtroComponent>('parteOtro');

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
    if (this.cargando || this.guardando || this.eliminando || this.preparandoSelecciones) {
      return false;
    }

    const descripcion = this.hallazgoActual.trim();
    if (!descripcion) return false;

    if (this.hallazgoEnEdicion === null) {
      return this.parteSeleccionadaId !== null || this.mostrandoOtroParte;
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

  /** Solo el autor del registro (o un rol global) puede editarlo o eliminarlo. */
  puedeGestionar(usuarioId: number): boolean {
    return !this.soloLectura && this.propiedadRegistro.puedeGestionar(usuarioId);
  }

  /** Solo historia clínica muestra siempre el bloque de datos; el resto usa la ficha plegable. */
  get seccionConDatosPaciente(): boolean {
    return this.seccionActiva === 'historia-clinica';
  }

  /**
   * La ficha con los datos del paciente está desplegada: en el examen físico y en diagnóstico la abre
   * su pestaña lateral y en historia clínica, que siempre muestra los datos, se dibuja desplegada y
   * sin pestaña.
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
      usuarioId: examen.usuarioId,
      parteCuerpoId: examen.parteCuerpoId,
      parteCuerpo: examen.parteCuerpoNombre,
      descripcion: examen.descripcion,
      fecha: this.formatearFecha(fecha),
      hora: this.formatearHora(fecha),
      usuario: examen.usuarioNombreCorto,
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
  }

  /**
   * Cambia la sección del área central. La ficha plegable se cierra porque historia clínica muestra su
   * propio bloque de datos del paciente.
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

  alElegirParte(valor: number | null): void {
    if (valor === this.opcionOtroId) {
      this.parteAnterior = this.parteSeleccionadaId;
      this.parteSeleccionadaId = null;
      this.mostrandoOtroParte = true;
      return;
    }

    if (valor == null) {
      this.parteSeleccionadaId = null;
      return;
    }

    this.seleccionarParteCuerpo(valor);
  }

  async crearParte(datos: OpcionOtroValor): Promise<boolean> {
    if (this.creandoParte) return false;

    this.creandoParte = true;
    try {
      const creada = await firstValueFrom(
        this.examenFisicoService.postParteCuerpo(datos.nombre).pipe(timeout(TIMEOUT_HTTP_MS)),
      );

      if (this.destruido) return false;
      if (creada.id == null) {
        this.popUps.error('No se pudo crear la parte del cuerpo.');
        return false;
      }

      this.partesCuerpo = [...this.partesCuerpo, creada];
      this.parteSeleccionadaId = creada.id;
      this.mostrandoOtroParte = false;
      return true;
    } catch (error) {
      if (!this.destruido) {
        this.mostrarError(error, 'No se pudo crear la parte del cuerpo.');
      }
      return false;
    } finally {
      this.creandoParte = false;
      if (!this.destruido) this.cdr.markForCheck();
    }
  }

  cancelarParte(): void {
    this.mostrandoOtroParte = false;
    this.parteSeleccionadaId = this.parteAnterior;
  }

  private resolverPartePendiente(): Promise<boolean> {
    if (!this.mostrandoOtroParte) {
      return Promise.resolve(true);
    }

    return crearSeleccionesPendientes(
      [
        {
          etiqueta: 'Parte del cuerpo',
          componente: this.parteOtro,
          crear: (datos) => this.crearParte(datos),
        },
      ],
      (mensaje) => this.popUps.formIncompleto(mensaje),
    );
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
    if (
      this.destruido ||
      this.cargando ||
      this.guardando ||
      this.eliminando ||
      this.preparandoSelecciones
    ) {
      return;
    }
    if (!this.puedeGuardar) return;

    const enEdicion = this.hallazgoEnEdicion;

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

    this.preparandoSelecciones = true;
    this.cdr.markForCheck();
    try {
      if (!(await this.resolverPartePendiente())) return;
    } finally {
      this.preparandoSelecciones = false;
      if (!this.destruido) this.cdr.markForCheck();
    }
    if (this.destruido) return;

    const parteCuerpoId = this.parteSeleccionadaId;
    if (parteCuerpoId === null) {
      this.popUps.error('Seleccione la parte del cuerpo del hallazgo.');
      return;
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
