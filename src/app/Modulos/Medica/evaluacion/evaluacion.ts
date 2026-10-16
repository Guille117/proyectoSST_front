import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, Subscription, switchMap, tap, TimeoutError } from 'rxjs';
import { AuthService } from '../../Auth/data/auth-service';
import { PopUps } from '../../../shared/popUps/popUpsService';
import { DatosPaciente } from '../datos-paciente/datos-paciente';
import { Diagnostico } from '../diagnostico/diagnostico';
import { HistoriaClinica } from '../historia-clinica/historia-clinica';
import { EPISODIO_ID_TEMPORAL } from './data/constantes-clinicas';
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
})
export class Evaluacion implements OnInit, OnDestroy {
  private peticion?: Subscription;
  private destruido = false;

  /** TEMPORAL: episodio fijo mientras la pantalla no recibe un episodio real. */
  private readonly episodioId = EPISODIO_ID_TEMPORAL;

  constructor(
    private examenFisicoService: ExamenFisicoService,
    private authService: AuthService,
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

  /** Partes del cuerpo del catálogo: cada una es una región donde se registra un hallazgo. */
  partesCuerpo: ParteCuerpoResponse[] = [];
  parteSeleccionadaId: number | null = null;

  /** Hallazgos registrados del episodio, del más reciente al más antiguo. */
  hallazgos: HallazgoVista[] = [];

  /** Descripción del hallazgo de la parte del cuerpo seleccionada. */
  hallazgoActual = '';

  /**
   * Cuadro en modo edición: sin hallazgo registrado para la parte seleccionada arranca habilitado
   * para capturarlo y, con un hallazgo existente, se habilita al pulsar "Editar".
   */
  modoEdicion = false;

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
        switchMap(() => this.examenFisicoService.getExamenesPorEpisodio(this.episodioId, true)),
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
          this.sincronizarCaptura();
        },
        error: (error) => {
          if (this.destruido) return;

          this.hallazgos = [];
          this.hallazgoActual = '';
          // Sin los hallazgos del servidor se mantiene el modo lectura con "Editar" visible: evita
          // crear un registro duplicado cuando no se pudo confirmar si la parte ya tenía uno.
          this.modoEdicion = false;
          this.mostrarError(error, 'No se pudo cargar el examen físico. Intente nuevamente.');
        },
      });
  }

  /** Hallazgo registrado de la parte del cuerpo seleccionada; nulo mientras no exista ninguno. */
  private hallazgoParteSeleccionada(): HallazgoVista | null {
    if (this.parteSeleccionadaId === null) return null;

    // El backend devuelve los registros del más reciente al más antiguo.
    return (
      this.hallazgos.find((hallazgo) => hallazgo.parteCuerpoId === this.parteSeleccionadaId) ?? null
    );
  }

  /** Muestra el hallazgo de la parte seleccionada y decide si el cuadro se captura o se lee. */
  private sincronizarCaptura(): void {
    const registro = this.hallazgoParteSeleccionada();
    this.hallazgoActual = registro?.descripcion ?? '';
    // Sin hallazgo registrado no hay nada que habilitar: el cuadro arranca editable para capturarlo
    // y la plantilla oculta "Editar" mientras se escribe un registro nuevo.
    this.modoEdicion = registro === null;
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

  /** Muestra en el bloque de captura el hallazgo de la parte del cuerpo seleccionada. */
  seleccionarParteCuerpo(id: number): void {
    if (this.cargando || this.guardando || id === this.parteSeleccionadaId) return;

    this.parteSeleccionadaId = id;
    this.sincronizarCaptura();
  }

  /** Habilita la escritura en el cuadro del hallazgo registrado. */
  activarEdicion(): void {
    if (this.cargando || this.guardando) return;

    this.modoEdicion = true;
  }

  /** Descarta la captura en curso y vuelve al hallazgo registrado de la parte seleccionada. */
  cancelarCaptura(): void {
    if (this.cargando || this.guardando) return;

    this.hallazgoActual = this.hallazgoParteSeleccionada()?.descripcion ?? '';
  }

  /** Crea el hallazgo de la parte seleccionada o actualiza el que ya estaba registrado. */
  guardarHallazgo(): void {
    if (this.destruido || this.cargando || this.guardando) return;

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

    const cuerpo: ExamenFisicoRequest = {
      descripcion,
      episodioId: this.episodioId,
      parteCuerpoId,
      usuarioId,
    };
    const registro = this.hallazgoParteSeleccionada();

    this.guardando = true;
    this.cdr.markForCheck();
    this.peticion?.unsubscribe();
    this.peticion = (
      registro === null
        ? this.examenFisicoService.postExamen(cuerpo)
        : this.examenFisicoService.putExamen(registro.id, cuerpo)
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
          this.sincronizarCaptura();
          this.popUps.exito(
            registro === null
              ? 'Hallazgo guardado exitosamente.'
              : 'Hallazgo actualizado exitosamente.',
          );
        },
        error: (error) => {
          if (this.destruido) return;

          this.mostrarError(error, 'No se pudo guardar el hallazgo. Intente nuevamente.');
        },
      });
  }
}
