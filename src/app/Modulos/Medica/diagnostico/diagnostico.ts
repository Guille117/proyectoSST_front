import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, Subscription, TimeoutError } from 'rxjs';
import { AuthService } from '../../Auth/data/auth-service';
import { PopUps } from '../../../shared/popUps/popUpsService';
import { EPISODIO_ID_TEMPORAL } from '../evaluacion/data/constantes-clinicas';
import { DiagnosticoService } from '../evaluacion/data/diagnostico-service';
import {
  DiagnosticoRequest,
  DiagnosticoResponse,
  TipoDiagnostico,
} from '../evaluacion/data/diagnosticoInterfaz';

/** Opción visible del selector de tipo de diagnóstico. */
interface TipoDiagnosticoVista {
  valor: TipoDiagnostico;
  nombre: string;
}

/**
 * Diagnóstico del episodio: sección de Evaluación clínica con el registro y el listado de los
 * diagnósticos contra el backend.
 */
@Component({
  selector: 'app-diagnostico',
  imports: [FormsModule],
  templateUrl: './diagnostico.html',
  styleUrl: './diagnostico.scss',
})
export class Diagnostico implements OnInit, OnDestroy {
  private peticion?: Subscription;
  private destruido = false;

  /** TEMPORAL: episodio fijo mientras la pantalla no recibe un episodio real. */
  private readonly episodioId = EPISODIO_ID_TEMPORAL;

  constructor(
    private diagnosticoService: DiagnosticoService,
    private authService: AuthService,
    private popUps: PopUps,
    private cdr: ChangeDetectorRef,
  ) {}

  // ------------------- ESTADO DE LA VISTA -------------------
  /** Límite de caracteres de la descripción aceptado por el backend. */
  readonly maxCaracteres = 2000;

  /** Descripción que se registra o edita. */
  diagnostico = '';

  /** Tipo que se aplicará al diagnóstico que se registre o edite. */
  tipoSeleccionado: TipoDiagnostico = 'PRINCIPAL';

  /** Tipos de diagnóstico que se pueden asignar. */
  readonly tiposDiagnostico: TipoDiagnosticoVista[] = [
    { valor: 'PRINCIPAL', nombre: 'Principal' },
    { valor: 'PROVISIONAL', nombre: 'Provisional' },
    { valor: 'ASOCIADO', nombre: 'Asociado' },
  ];

  /** Diagnósticos vigentes del episodio registrados en el servidor. */
  diagnosticos: DiagnosticoResponse[] = [];

  /** Fila del listado en edición; null cuando lo escrito se registrará como diagnóstico nuevo. */
  diagnosticoEnEdicion: number | null = null;

  /** Identificadores de carga para bloquear acciones incompatibles y evitar doble clic. */
  cargando = false;
  guardando = false;

  // ------------------- CONSULTAS PARA LA VISTA -------------------
  /** El botón Guardar solo se habilita cuando hay algo que registrar. */
  get hayDiagnostico(): boolean {
    return this.diagnostico.trim().length > 0;
  }

  /** Nombre legible del tipo de diagnóstico que pinta la tabla. */
  nombreTipo(tipo: TipoDiagnostico): string {
    return this.tiposDiagnostico.find((opcion) => opcion.valor === tipo)?.nombre ?? tipo;
  }

  // ------------------- CICLO DE VIDA -------------------
  ngOnInit(): void {
    this.cargarDiagnosticos();
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.peticion?.unsubscribe();
  }

  // ------------------- CONSULTAR -------------------
  /** Carga los diagnósticos vigentes del episodio, del más reciente al más antiguo. */
  cargarDiagnosticos(): void {
    if (this.destruido) return;

    this.cargando = true;
    this.cdr.markForCheck();
    this.peticion?.unsubscribe();
    this.peticion = this.diagnosticoService
      .getDiagnosticosPorEpisodio(this.episodioId, true)
      .pipe(
        finalize(() => {
          this.cargando = false;
          if (!this.destruido) this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (diagnosticos) => {
          if (this.destruido) return;

          this.diagnosticos = diagnosticos;
        },
        error: (error) => {
          if (this.destruido) return;

          this.diagnosticos = [];
          this.mostrarError(error, 'No se pudo cargar el diagnóstico. Intente nuevamente.');
        },
      });
  }

  // ------------------- ACCIONES DE LA VISTA -------------------
  /** Selecciona el tipo que se aplicará al diagnóstico que se registre o edite. */
  seleccionarTipo(tipo: TipoDiagnosticoVista): void {
    if (this.cargando || this.guardando) return;

    this.tipoSeleccionado = tipo.valor;
  }

  /** Crea el diagnóstico con el tipo seleccionado o actualiza la fila en edición. */
  guardarDiagnostico(): void {
    if (this.destruido || this.cargando || this.guardando) return;

    const descripcion = this.diagnostico.trim();
    if (!descripcion) {
      this.popUps.error('La descripción del diagnóstico es obligatoria.');
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

    const cuerpo: DiagnosticoRequest = {
      tipoDiagnostico: this.tipoSeleccionado,
      descripcion,
      episodioId: this.episodioId,
      usuarioId,
    };
    const idEditado = this.diagnosticoEnEdicion;

    this.guardando = true;
    this.cdr.markForCheck();
    this.peticion?.unsubscribe();
    this.peticion = (
      idEditado === null
        ? this.diagnosticoService.postDiagnostico(cuerpo)
        : this.diagnosticoService.putDiagnostico(idEditado, cuerpo)
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

          this.guardarEnLista(respuesta);
          this.limpiarFormulario();
          this.popUps.exito(
            idEditado === null
              ? 'Diagnóstico guardado exitosamente.'
              : 'Diagnóstico actualizado exitosamente.',
          );
        },
        error: (error) => {
          if (this.destruido) return;

          this.mostrarError(error, 'No se pudo guardar el diagnóstico. Intente nuevamente.');
        },
      });
  }

  /** Carga la fila elegida en el formulario para corregirla. */
  editarDiagnostico(adicional: DiagnosticoResponse): void {
    if (this.cargando || this.guardando) return;

    this.diagnosticoEnEdicion = adicional.id;
    this.diagnostico = adicional.descripcion;
    this.tipoSeleccionado = adicional.tipoDiagnostico;
  }

  /** Confirma y cambia el estado del diagnóstico para retirarlo del listado vigente. */
  async eliminarDiagnostico(adicional: DiagnosticoResponse): Promise<void> {
    if (this.destruido || this.cargando || this.guardando) return;

    const confirmado = await this.popUps
      .confirmarToast(`¿Está seguro de eliminar el diagnóstico "${adicional.descripcion}"?`)
      .catch(() => false);

    if (!confirmado || this.destruido || this.cargando || this.guardando) {
      return;
    }

    this.guardando = true;
    this.cdr.markForCheck();
    this.peticion?.unsubscribe();
    this.peticion = this.diagnosticoService
      .cambiarEstado(adicional.id)
      .pipe(
        finalize(() => {
          this.guardando = false;
          if (!this.destruido) this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          if (this.destruido) return;

          this.diagnosticos = this.diagnosticos.filter(
            (registrado) => registrado.id !== adicional.id,
          );
          this.limpiarFormulario();
          this.popUps.exito('Diagnóstico eliminado exitosamente.');
        },
        error: (error) => {
          if (this.destruido) return;

          this.mostrarError(error, 'No se pudo eliminar el diagnóstico. Intente nuevamente.');
        },
      });
  }

  /** Deja el formulario listo para capturar un diagnóstico nuevo. */
  cancelarCaptura(): void {
    if (this.cargando || this.guardando) return;

    this.limpiarFormulario();
  }

  // ------------------- INTERNOS -------------------
  /** Refleja el registro confirmado por el servidor sin volver a pedir la lista. */
  private guardarEnLista(diagnostico: DiagnosticoResponse): void {
    const indice = this.diagnosticos.findIndex((registro) => registro.id === diagnostico.id);

    if (indice === -1) {
      this.diagnosticos = [diagnostico, ...this.diagnosticos];
      return;
    }

    const lista = [...this.diagnosticos];
    lista[indice] = diagnostico;
    this.diagnosticos = lista;
  }

  /** Vacía el campo y vuelve la captura a su estado inicial. */
  private limpiarFormulario(): void {
    this.diagnostico = '';
    this.tipoSeleccionado = 'PRINCIPAL';
    this.diagnosticoEnEdicion = null;
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
