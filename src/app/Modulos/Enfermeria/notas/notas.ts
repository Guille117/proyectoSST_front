import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, Subscription, TimeoutError } from 'rxjs';
import { PopUps } from '../../../shared/popUps/popUpsService';
import { AuthService } from '../../Auth/data/auth-service';
import { EpisodioActivoService } from '../../Medica/data/episodio-activo-service';
import {
  NotaEnfermeriaRequest,
  NotaEnfermeriaResponse,
} from './data/notaEnfermeriaInterfaz';
import { NotaEnfermeriaService } from './data/nota-enfermeria-service';

/** Nota de enfermería mostrada en el historial. */
interface NotaEnfermeriaVista {
  id: number;
  texto: string;
  fecha: string;
  hora: string;
  usuario: string;
}

/**
 * Notas de enfermería: editor de una nota y el historial de las notas registradas en el episodio,
 * con opciones para editar o eliminar cada una.
 */
@Component({
  selector: 'app-notas-enfermeria',
  imports: [FormsModule],
  templateUrl: './notas.html',
  styleUrl: './notas.scss',
  host: {
    '(document:click)': 'cerrarMenuAlClicFuera($event)',
  },
})
export class Notas implements OnInit, OnDestroy {
  private readonly popUps = inject(PopUps);
  private readonly authService = inject(AuthService);
  private readonly episodioActivo = inject(EpisodioActivoService);
  private readonly servicio = inject(NotaEnfermeriaService);
  private readonly cdr = inject(ChangeDetectorRef);

  private peticionLista?: Subscription;
  private peticionAccion?: Subscription;
  private destruido = false;

  /** Texto que se está capturando en el editor. */
  textoNota = '';

  /** Nota cuyos datos están cargados en el editor; null al capturar una nota nueva. */
  notaEnEdicion: number | null = null;

  /** Tarjeta del historial con su menú desplegado; null si no hay ninguna. */
  menuNotaAbierta: number | null = null;

  /** Notas registradas en el episodio. */
  notas: NotaEnfermeriaVista[] = [];

  /** Estados de la vista. */
  cargando = false;
  guardando = false;
  eliminando = false;
  errorCarga = false;
  sinEpisodioActivo = false;

  ngOnInit(): void {
    this.cargarNotas();
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.peticionLista?.unsubscribe();
    this.peticionAccion?.unsubscribe();
  }

  /** El episodio es un historial cerrado: se consulta, pero no se registran cambios. */
  get soloLectura(): boolean {
    return this.episodioActivo.esSoloLectura();
  }

  /** El editor puede guardar cuando la nota tiene texto. */
  get puedeGuardar(): boolean {
    return !this.guardando && this.textoNota.trim().length > 0;
  }

  /** Título del editor según se registre una nota nueva o se edite una existente. */
  get tituloEditor(): string {
    return this.notaEnEdicion === null ? 'Nueva nota' : 'Editar nota';
  }

  /** Carga las notas del episodio activo. */
  cargarNotas(): void {
    if (this.destruido) return;

    const episodioId = this.episodioActivo.obtener();
    this.sinEpisodioActivo = episodioId === null;

    if (episodioId === null) {
      this.notas = [];
      this.cargando = false;
      this.errorCarga = false;
      this.cdr.markForCheck();
      return;
    }

    this.cargando = true;
    this.errorCarga = false;
    this.cdr.markForCheck();
    this.peticionLista?.unsubscribe();
    this.peticionLista = this.servicio
      .buscarPorEpisodio(episodioId)
      .pipe(
        finalize(() => {
          this.cargando = false;
          if (!this.destruido) this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (notas) => {
          if (this.destruido) return;

          this.notas = notas.map((nota) => this.aVista(nota));
        },
        error: (error) => {
          if (this.destruido) return;

          this.notas = [];
          this.errorCarga = true;
          this.mostrarError(error, 'No se pudieron cargar las notas de enfermería.');
        },
      });
  }

  /** Registra una nota nueva o actualiza la que está en edición. */
  guardarNota(): void {
    if (!this.puedeGuardar) return;

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

    const request: NotaEnfermeriaRequest = {
      texto: this.textoNota.trim(),
      episodioId,
      usuarioId,
    };

    const editando = this.notaEnEdicion !== null;
    this.guardando = true;
    this.cdr.markForCheck();
    this.peticionAccion?.unsubscribe();
    const peticion =
      this.notaEnEdicion === null
        ? this.servicio.crear(request)
        : this.servicio.actualizar(this.notaEnEdicion, request);

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
          this.popUps.exito(
            editando ? 'Nota actualizada exitosamente.' : 'Nota registrada exitosamente.',
          );
          this.cargarNotas();
        },
        error: (error) =>
          this.mostrarError(error, 'No se pudo guardar la nota de enfermería.'),
      });
  }

  /** Carga en el editor la nota elegida para corregirla. */
  editarNota(nota: NotaEnfermeriaVista): void {
    if (this.guardando || this.eliminando) return;

    this.notaEnEdicion = nota.id;
    this.textoNota = nota.texto;
    this.cerrarMenuNota();
  }

  /** Elimina la nota del backend. */
  eliminarNota(nota: NotaEnfermeriaVista): void {
    if (this.eliminando) return;

    this.eliminando = true;
    this.cdr.markForCheck();
    this.peticionAccion?.unsubscribe();
    this.peticionAccion = this.servicio
      .eliminar(nota.id)
      .pipe(
        finalize(() => {
          this.eliminando = false;
          if (!this.destruido) this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          if (this.notaEnEdicion === nota.id) this.limpiarFormulario();
          this.cerrarMenuNota();
          this.popUps.exito('Nota eliminada exitosamente.');
          this.cargarNotas();
        },
        error: (error) => this.mostrarError(error, 'No se pudo eliminar la nota.'),
      });
  }

  /** Deja el editor listo para una nota nueva. */
  limpiarFormulario(): void {
    this.textoNota = '';
    this.notaEnEdicion = null;
    this.cerrarMenuNota();
  }

  /** Muestra u oculta el menú de opciones de la nota pulsada. */
  alternarMenuNota(id: number): void {
    this.menuNotaAbierta = this.menuNotaAbierta === id ? null : id;
  }

  /** Cierra el menú de opciones desplegado. */
  cerrarMenuNota(): void {
    this.menuNotaAbierta = null;
  }

  /** Cierra el menú al pulsar fuera de la tarjeta que lo tiene abierto. */
  cerrarMenuAlClicFuera(evento: Event): void {
    if (this.menuNotaAbierta === null || !(evento.target instanceof Element)) return;

    const tarjeta = evento.target.closest<HTMLElement>('.nota-card');
    const tarjetaAbierta = tarjeta?.dataset['notaId'];

    if (tarjetaAbierta !== String(this.menuNotaAbierta)) {
      this.cerrarMenuNota();
    }
  }

  /** Traduce la nota del backend a la tarjeta del historial. */
  private aVista(nota: NotaEnfermeriaResponse): NotaEnfermeriaVista {
    const fecha = new Date(nota.fecha);

    return {
      id: nota.id,
      texto: nota.texto,
      fecha: this.formatearFecha(fecha),
      hora: this.formatearHora(fecha),
      usuario: nota.usuarioNombre,
    };
  }

  /** Fecha de la nota en el formato corto de la tarjeta (dd/MM/yyyy). */
  private formatearFecha(fecha: Date): string {
    if (Number.isNaN(fecha.getTime())) return '';

    const dia = `${fecha.getDate()}`.padStart(2, '0');
    const mes = `${fecha.getMonth() + 1}`.padStart(2, '0');

    return `${dia}/${mes}/${fecha.getFullYear()}`;
  }

  /** Hora de la nota en el formato de la tarjeta (HH:mm). */
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
