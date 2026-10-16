import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, Subscription, TimeoutError } from 'rxjs';
import { AuthService } from '../../Auth/data/auth-service';
import { PopUps } from '../../../shared/popUps/popUpsService';
import { EPISODIO_ID_TEMPORAL } from '../evaluacion/data/constantes-clinicas';
import { HistoriaClinicaService } from '../evaluacion/data/historia-clinica-service';
import { HistoriaClinicaRequest } from '../evaluacion/data/historiaClinicaInterfaz';

/**
 * Historia clínica del episodio: sección de Evaluación clínica con un único cuadro de texto para
 * consultar, editar y guardar el interrogatorio contra el backend.
 */
@Component({
  selector: 'app-historia-clinica',
  imports: [FormsModule],
  templateUrl: './historia-clinica.html',
  styleUrl: './historia-clinica.scss',
})
export class HistoriaClinica implements OnInit, OnDestroy {
  private peticion?: Subscription;
  private destruido = false;

  /** TEMPORAL: episodio fijo mientras la pantalla no recibe un episodio real. */
  private readonly episodioId = EPISODIO_ID_TEMPORAL;

  constructor(
    private historiaClinicaService: HistoriaClinicaService,
    private authService: AuthService,
    private popUps: PopUps,
    private cdr: ChangeDetectorRef,
  ) {}

  // ------------------- ESTADO DE LA VISTA -------------------
  /** Límite de caracteres de la descripción aceptado por el backend. */
  readonly maxCaracteres = 2000;

  /**
   * Cuadro en modo edición: sin historia registrada arranca habilitado para capturarla y, con una
   * historia existente, se habilita al pulsar "Editar".
   */
  modoEdicion = false;

  /** Descripción de la historia clínica registrada del episodio. */
  historiaClinica = '';

  /** Identificador de la historia vigente; mientras sea nulo el guardado crea un registro nuevo. */
  idHistoriaActual: number | null = null;

  /** Identificadores de carga para bloquear acciones incompatibles y evitar doble clic. */
  cargando = false;
  guardando = false;

  // ------------------- CICLO DE VIDA -------------------
  ngOnInit(): void {
    this.cargarHistoria();
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.peticion?.unsubscribe();
  }

  // ------------------- CONSULTAR -------------------
  /** Carga la historia clínica vigente del episodio y muestra la más reciente. */
  cargarHistoria(): void {
    if (this.destruido) return;
    this.cargando = true;
    this.cdr.markForCheck();
    this.peticion?.unsubscribe();
    this.peticion = this.historiaClinicaService
      .getHistoriasPorEpisodio(this.episodioId, true)
      .pipe(
        finalize(() => {
          this.cargando = false;
          if (!this.destruido) this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (historias) => {
          if (this.destruido) return;
          const ultima = historias.length ? historias[historias.length - 1] : null;
          this.idHistoriaActual = ultima?.id ?? null;
          this.historiaClinica = ultima?.descripcion ?? '';
          // Sin historia registrada no hay nada que habilitar: el cuadro arranca editable para
          // capturarla y la plantilla oculta "Editar" mientras se escribe sobre un registro nuevo.
          this.modoEdicion = ultima === null;
        },
        error: (error) => {
          if (this.destruido) return;
          this.idHistoriaActual = null;
          this.historiaClinica = '';
          this.mostrarError(error, 'No se pudo cargar la historia clínica. Intente nuevamente.');
        },
      });
  }

  // ------------------- ACCIONES DE LA VISTA -------------------
  /** Habilita la escritura en el cuadro de la historia clínica. */
  activarEdicion(): void {
    if (this.cargando || this.guardando) return;
    this.modoEdicion = true;
  }

  /** Crea o actualiza la historia clínica del episodio según exista un registro vigente. */
  guardarHistoria(): void {
    if (this.destruido || this.cargando || this.guardando) return;

    const descripcion = this.historiaClinica.trim();
    if (!descripcion) {
      this.popUps.error('La descripción de la historia clínica es obligatoria.');
      return;
    }
    if (descripcion.length > this.maxCaracteres) {
      this.popUps.error(`La descripción no puede superar los ${this.maxCaracteres} caracteres.`);
      return;
    }

    const usuarioId = this.authService.currentUser()?.id;
    if (!usuarioId) {
      this.popUps.error(
        'No se pudo identificar al usuario de la sesión. Inicie sesión nuevamente.',
      );
      return;
    }

    const cuerpo: HistoriaClinicaRequest = { descripcion, episodioId: this.episodioId, usuarioId };
    const id = this.idHistoriaActual;
    this.guardando = true;
    this.cdr.markForCheck();

    this.peticion?.unsubscribe();
    this.peticion = (
      id === null
        ? this.historiaClinicaService.postHistoria(cuerpo)
        : this.historiaClinicaService.putHistoria(id, cuerpo)
    )
      .pipe(
        finalize(() => {
          this.guardando = false;
          if (!this.destruido) this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (respuesta) => {
          if (this.destruido) return;
          this.idHistoriaActual = respuesta.id;
          this.historiaClinica = respuesta.descripcion;
          this.modoEdicion = false;
          this.popUps.exito(
            id === null
              ? 'Historia clínica guardada exitosamente.'
              : 'Historia clínica actualizada exitosamente.',
          );
        },
        error: (error) => {
          if (this.destruido) return;
          this.mostrarError(error, 'No se pudo guardar la historia clínica. Intente nuevamente.');
        },
      });
  }

  // ------------------- ERRORES -------------------
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
