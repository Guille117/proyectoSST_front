import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, firstValueFrom, Subscription, TimeoutError, timeout } from 'rxjs';
import { AuthService } from '../../../Auth/data/auth-service';
import { PropiedadRegistroService } from '../../../Auth/data/propiedad-registro-service';
import { PopUps } from '../../../../shared/popUps/popUpsService';
import { EpisodioActivoService } from '../../data/episodio-activo-service';
import { HistoriaClinicaService } from '../data/historia-clinica-service';
import { HistoriaClinicaRequest } from '../data/historiaClinicaInterfaz';
import { CatalogoService } from '../../../Catalogos/data/serviceCatalogo';
import { Inter_base } from '../../../Catalogos/data/nombreInterfaz';
import { OpcionOtroComponent, OpcionOtroValor } from '../../../../shared/opcion-otro/opcion-otro';
import { TIMEOUT_HTTP_MS } from '../../evaluacion/data/constantes-clinicas';

/**
 * Historia clínica del episodio: sección de Evaluación clínica con un único cuadro de texto para
 * consultar, editar y guardar el interrogatorio contra el backend.
 */
@Component({
  selector: 'app-historia-clinica',
  imports: [FormsModule, OpcionOtroComponent],
  templateUrl: './historia-clinica.html',
  styleUrl: './historia-clinica.scss',
})
export class HistoriaClinica implements OnInit, OnDestroy {
  private peticion?: Subscription;
  private destruido = false;

  /** Episodio activo del módulo: lo abre la selección del paciente y se conserva hasta cerrarlo. */
  private get episodioId(): number | null {
    return this.episodioActivo.obtener();
  }

  /** El episodio es un historial cerrado: se consulta, pero no se registran cambios. */
  get soloLectura(): boolean {
    return this.episodioActivo.esSoloLectura();
  }

  /** Solo el autor del registro (o un rol global) puede editarlo. */
  puedeGestionar(usuarioId: number | null | undefined): boolean {
    return !this.soloLectura && this.propiedadRegistro.puedeGestionar(usuarioId);
  }

  constructor(
    private historiaClinicaService: HistoriaClinicaService,
    private authService: AuthService,
    private propiedadRegistro: PropiedadRegistroService,
    private episodioActivo: EpisodioActivoService,
    private popUps: PopUps,
    private cdr: ChangeDetectorRef,
    private servicioCatalogo: CatalogoService,
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

  /** Descripción registrada de la historia: es el estado al que vuelve "Cancelar". */
  private historiaOriginal = '';

  /** Estado clínico registrado al cargar: es el valor al que vuelve "Cancelar". */
  private estadoClinicoOriginal = '';

  /** Identificador de la historia vigente; mientras sea nulo el guardado crea un registro nuevo. */
  idHistoriaActual: number | null = null;

  /** Autor de la historia vigente; nulo mientras no haya un registro guardado. */
  usuarioIdHistoriaActual: number | null = null;

  /** Identificadores de carga para bloquear acciones incompatibles y evitar doble clic. */
  cargando = false;
  guardando = false;

  // ------------------- ESTADO CLÍNICO -------------------
  /** Catálogo de estados clínicos activos para el select del episodio. */
  estadosClinico: Inter_base[] = [];

  /** Valor elegido en el select de estado clínico (id como cadena o "__otro__"). */
  estadoClinicoValor = '';

  readonly opcionOtroId = '__otro__';
  mostrandoOtroEstado = false;
  creandoEstado = false;
  private estadoAnterior = '';

  // ------------------- CICLO DE VIDA -------------------
  ngOnInit(): void {
    this.cargarHistoria();
    this.cargarEstadosClinicos();
  }

  /** Carga el catálogo de estados clínicos activos para el select del episodio. */
  cargarEstadosClinicos(): void {
    this.servicioCatalogo.listar<Inter_base>('estadosClinico', true).subscribe({
      next: (datos) => {
        this.estadosClinico = datos;
      },
      error: () => {
        this.estadosClinico = [];
      },
    });
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.peticion?.unsubscribe();
  }

  // ------------------- CONSULTAR -------------------
  /** Carga la historia clínica vigente del episodio y muestra la más reciente. */
  cargarHistoria(): void {
    if (this.destruido) return;

    const episodioId = this.episodioId;
    if (episodioId === null) {
      this.cargando = false;
      this.idHistoriaActual = null;
      this.usuarioIdHistoriaActual = null;
      this.historiaClinica = '';
      this.historiaOriginal = '';
      this.modoEdicion = false;
      this.popUps.advertencia('No hay un episodio activo. Abra el episodio del paciente.');
      return;
    }

    this.cargando = true;
    this.cdr.markForCheck();
    this.peticion?.unsubscribe();
    this.peticion = this.historiaClinicaService
      .getHistoriasPorEpisodio(episodioId, true)
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
          this.usuarioIdHistoriaActual = ultima?.usuarioId ?? null;
          this.historiaClinica = ultima?.descripcion ?? '';
          this.historiaOriginal = ultima?.descripcion ?? '';
          this.estadoClinicoValor = ultima?.estadoClinicoId?.toString() ?? '';
          this.estadoClinicoOriginal = this.estadoClinicoValor;
          // Sin historia registrada no hay nada que habilitar: el cuadro arranca editable para
          // capturarla y la plantilla oculta "Editar" mientras se escribe sobre un registro nuevo.
          this.modoEdicion = ultima === null;
        },
        error: (error) => {
          if (this.destruido) return;
          this.idHistoriaActual = null;
          this.usuarioIdHistoriaActual = null;
          this.historiaClinica = '';
          this.historiaOriginal = '';
          this.estadoClinicoValor = '';
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

  /** Descarta la edición en curso y regresa al estado inicial de la historia registrada. */
  cancelarEdicion(): void {
    if (this.cargando || this.guardando) return;

    this.historiaClinica = this.historiaOriginal;
    this.estadoClinicoValor = this.estadoClinicoOriginal;
    // Igual que al cargar: sin historia registrada el cuadro queda editable para capturarla.
    this.modoEdicion = this.idHistoriaActual === null;
  }

  // ------------------- ESTADO CLÍNICO: OPCIÓN "OTRO" -------------------
  /** Reacciona al cambio del select de estado clínico: abre el campo "Otro" si se elige. */
  alElegirEstadoClinico(valor: string): void {
    if (valor === this.opcionOtroId) {
      this.estadoAnterior = this.estadoClinicoValor;
      this.estadoClinicoValor = '';
      this.mostrandoOtroEstado = true;
      return;
    }
    this.estadoClinicoValor = valor;
    this.mostrandoOtroEstado = false;
  }

  /** Crea un nuevo estado clínico a partir del valor capturado en "Otro". */
  async crearEstadoClinico(datos: OpcionOtroValor): Promise<boolean> {
    if (this.creandoEstado) return false;

    this.creandoEstado = true;
    try {
      const creada: Inter_base = await firstValueFrom(
        this.servicioCatalogo
          .crear<Inter_base>('estadosClinico', { nombre: datos.nombre } as Inter_base)
          .pipe(timeout(TIMEOUT_HTTP_MS)),
      );

      if (this.destruido) return false;
      if (creada.id == null) {
        this.popUps.error('No se pudo crear el estado clínico.');
        return false;
      }

      this.estadosClinico = [...this.estadosClinico, creada];
      this.estadoClinicoValor = String(creada.id);
      this.mostrandoOtroEstado = false;
      return true;
    } catch (error) {
      if (!this.destruido) {
        this.mostrarError(error, 'No se pudo crear el estado clínico.');
      }
      return false;
    } finally {
      this.creandoEstado = false;
      if (!this.destruido) this.cdr.markForCheck();
    }
  }

  /** Cancela la captura de un estado clínico "Otro" y restaura el valor anterior. */
  cancelarEstadoClinico(): void {
    this.mostrandoOtroEstado = false;
    this.estadoClinicoValor = this.estadoAnterior;
  }

  /** Convierte el valor del select en el id numérico que espera el backend. */
  private aIdCatalogo(valor: string): number | null {
    const id = Number(valor);
    return Number.isInteger(id) && id > 0 ? id : null;
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

    const estadoClinicoId = this.aIdCatalogo(this.estadoClinicoValor);
    if (estadoClinicoId === null) {
      this.popUps.error('El estado clínico es obligatorio. Seleccione una opción del catálogo.');
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

    const cuerpo: HistoriaClinicaRequest = { descripcion, episodioId, usuarioId, estadoClinicoId };
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
          this.usuarioIdHistoriaActual = respuesta.usuarioId;
          this.historiaClinica = respuesta.descripcion;
          this.historiaOriginal = respuesta.descripcion;
          this.estadoClinicoValor = respuesta.estadoClinicoId?.toString() ?? '';
          this.estadoClinicoOriginal = this.estadoClinicoValor;
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
