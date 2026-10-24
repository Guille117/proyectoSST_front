import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectorRef,
  Component,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  inject,
} from '@angular/core';
import { Subscription, TimeoutError } from 'rxjs';
import { SignosVitalesService } from '../../Enfermeria/monitoreo/data/signos-vitales-service';
import { PacienteDetalle } from '../../Pacientes/paciente/data/pacienteInterfaz';
import { PacienteService } from '../../Pacientes/paciente/data/paciente-service';
import { EpisodioActivoService } from '../data/episodio-activo-service';

/** Signo vital que se muestra en la ficha. */
interface SignoVitalVista {
  etiqueta: string;
  valor: string;
}

/**
 * Ficha con los datos del paciente que acompaña a las pantallas del módulo Médico (evaluación
 * clínica, indicaciones médicas). Se dibuja pegada al borde derecho de la pantalla, desde la barra
 * superior hasta el borde inferior de la ventana, y tiene dos formas de uso:
 *
 * - Fija: el bloque se muestra siempre desplegado, sin pestaña ni controles para plegarlo.
 * - Plegable (plegable = true): una pestaña lateral lo abre y lo cierra y el chevron de su
 *   encabezado pliega el cuerpo dejando el título a la vista.
 *
 * El estado lo controla la pantalla que lo usa: recibe abierto y cuerpoVisible y avisa de los
 * cambios con abiertoCambia y cuerpoVisibleCambia, de modo que puede reservar el ancho del bloque y
 * plegarlo desde su propio código.
 *
 * Los datos se consultan del episodio activo: el paciente guardado al abrir el episodio y sus
 * últimos signos vitales. No se muestran datos de más.
 */
@Component({
  selector: 'app-datos-paciente',
  imports: [],
  templateUrl: './datos-paciente.html',
  styleUrl: './datos-paciente.scss',
})
export class DatosPaciente implements OnInit, OnDestroy {
  private readonly servicioPaciente = inject(PacienteService);
  private readonly servicioSignos = inject(SignosVitalesService);
  private readonly episodioActivo = inject(EpisodioActivoService);
  private readonly cdr = inject(ChangeDetectorRef);

  // ------------------- ESTADO DE LA VISTA -------------------
  /** El bloque se abre y se cierra desde su pestaña lateral en lugar de mostrarse siempre. */
  @Input() plegable = false;

  /** Permite que el usuario pliegue el bloque; con falso, solo la pantalla controla su estado. */
  @Input() permitirAlternar = true;

  /** El bloque está desplegado: solo se dibuja cuando es verdadero. */
  @Input() abierto = true;

  /** Avisa del estado pedido desde la pestaña lateral del bloque plegable. */
  @Output() abiertoCambia = new EventEmitter<boolean>();

  /** El cuerpo con los datos está desplegado; el título de la ficha se ve siempre. */
  @Input() cuerpoVisible = true;

  /** Avisa del estado pedido desde el chevron del encabezado. */
  @Output() cuerpoVisibleCambia = new EventEmitter<boolean>();

  /** Detalle real del paciente del episodio activo. */
  detalle: PacienteDetalle | null = null;

  /** Alergias registradas del paciente. */
  alergias: string[] = [];

  /** Motivo de atención del episodio activo. */
  motivoAtencion = '';

  /** Últimos signos vitales del episodio, con los mismos cuatro datos de la ficha. */
  signosVitales: SignoVitalVista[] = [];

  /** Estados de carga y error de la información del paciente. */
  cargando = false;
  error = '';

  /** Estados de carga y error de los signos vitales. */
  cargandoSignos = false;
  errorSignos = '';

  private peticionPaciente?: Subscription;
  private peticionDetalle?: Subscription;
  private peticionSignos?: Subscription;

  // ------------------- CICLO DE VIDA -------------------
  ngOnInit(): void {
    this.cargarDatos();
  }

  ngOnDestroy(): void {
    this.peticionPaciente?.unsubscribe();
    this.peticionDetalle?.unsubscribe();
    this.peticionSignos?.unsubscribe();
  }

  // ------------------- ACCIONES DE LA VISTA -------------------
  /** Abre o cierra el bloque desde su pestaña lateral. */
  alternarFicha(): void {
    if (!this.permitirAlternar) return;
    this.abiertoCambia.emit(!this.abierto);
  }

  /** Pliega o despliega el cuerpo del bloque desde el chevron de su encabezado. */
  alternarCuerpo(): void {
    if (!this.permitirAlternar) return;
    this.cuerpoVisibleCambia.emit(!this.cuerpoVisible);
  }

  /** Vuelve a consultar la información del episodio activo. */
  recargar(): void {
    this.cargarDatos();
  }

  // ------------------- CONSULTAS -------------------
  /** Carga el paciente del episodio activo y sus últimos signos vitales. */
  private cargarDatos(): void {
    this.peticionPaciente?.unsubscribe();
    this.peticionDetalle?.unsubscribe();
    this.peticionSignos?.unsubscribe();
    this.detalle = null;
    this.alergias = [];
    this.motivoAtencion = '';
    this.signosVitales = [];
    this.error = '';
    this.errorSignos = '';
    this.cargando = true;
    this.cargandoSignos = false;

    const episodioId = this.episodioActivo.obtener();
    if (episodioId === null) {
      this.cargando = false;
      this.cdr.markForCheck();
      return;
    }

    const pacienteId = this.episodioActivo.pacienteId();
    if (pacienteId !== null) {
      this.cargarDetalle(pacienteId);
      this.cargarSignos(episodioId);
      return;
    }

    // Respaldo para sesiones antiguas: busca el paciente cuyo episodio está activo.
    this.peticionPaciente = this.servicioPaciente.listarPacientes().subscribe({
      next: (pacientes) => {
        const paciente = pacientes.find((item) => item.episodioId === episodioId);
        if (!paciente) {
          this.cargando = false;
          this.error = 'No se pudo identificar al paciente del episodio.';
          this.cdr.markForCheck();
          return;
        }

        this.episodioActivo.guardarPaciente(paciente.pacienteId);
        this.cargarDetalle(paciente.pacienteId);
        this.cargarSignos(episodioId);
      },
      error: (error) => {
        this.cargando = false;
        this.error = this.mensajeError(error, 'No se pudo identificar al paciente del episodio.');
        this.cdr.markForCheck();
      },
    });
  }

  /** Trae el detalle del paciente y prepara los datos de la ficha. */
  private cargarDetalle(pacienteId: number): void {
    this.peticionDetalle = this.servicioPaciente.obtenerPaciente(pacienteId).subscribe({
      next: (detalle) => {
        this.detalle = detalle;
        this.alergias = detalle.alergias.map((alergia) => alergia.nombre);
        this.motivoAtencion = detalle.descripcion?.trim() || 'No registrado';
        this.cargando = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.cargando = false;
        this.error = this.mensajeError(error, 'No se pudo cargar la información del paciente.');
        this.cdr.markForCheck();
      },
    });
  }

  /** Trae los signos vitales del episodio y deja solo los cuatro datos de la ficha. */
  private cargarSignos(episodioId: number): void {
    this.cargandoSignos = true;
    this.errorSignos = '';
    this.peticionSignos = this.servicioSignos.buscarPorEpisodio(episodioId).subscribe({
      next: (registros) => {
        const ultimo = [...registros].sort(
          (a, b) => this.fechaMs(b.fecha) - this.fechaMs(a.fecha),
        )[0];

        this.signosVitales = ultimo
          ? [
              { etiqueta: 'PA (mmHg)', valor: `${ultimo.sistolica}/${ultimo.diastolica}` },
              { etiqueta: 'FC (lpm)', valor: `${ultimo.frecuenciaCardiaca}` },
              { etiqueta: 'Temp. (°C)', valor: `${ultimo.temperatura}` },
              { etiqueta: 'SpO₂ (%)', valor: `${ultimo.saturacion}` },
            ]
          : [];
        this.cargandoSignos = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        this.cargandoSignos = false;
        this.errorSignos = this.mensajeError(error, 'No se pudieron cargar los signos vitales.');
        this.cdr.markForCheck();
      },
    });
  }

  // ------------------- AUXILIARES -------------------
  /** Tipo de atención del paciente en el texto de la ficha. */
  protected tipoAtencionLegible(tipo: PacienteDetalle['tipoAtencion']): string {
    if (tipo === 'HOSPITALIZACION') return 'Hospitalización';
    if (tipo === 'EMERGENCIA') return 'Emergencia';
    return '—';
  }

  /** Fecha de ingreso en el formato dd-mm-yyyy. */
  protected fechaIngresoLegible(valor: string | null): string {
    if (!valor) return '—';

    const [fecha] = valor.split('T');
    const [anio, mes, dia] = fecha.split('-');
    if (!anio || !mes || !dia) return valor;

    return `${dia}-${mes}-${anio}`;
  }

  /** Parte el texto en líneas cortas para que el tooltip nativo no se abra tan ancho. */
  protected textoTooltip(valor: string | null, porDefecto: string): string {
    const texto = (valor ?? '').trim() || porDefecto;
    const limite = 34;
    const palabras = texto.split(/\s+/);
    const lineas: string[] = [];
    let linea = '';

    for (const palabra of palabras) {
      if (!linea) {
        linea = palabra;
        continue;
      }

      if (`${linea} ${palabra}`.length > limite) {
        lineas.push(linea);
        linea = palabra;
      } else {
        linea = `${linea} ${palabra}`;
      }
    }

    if (linea) lineas.push(linea);
    return lineas.join('\n');
  }

  /** Fecha de un registro clínico en milisegundos; los valores inválidos quedan al final. */
  private fechaMs(valor: string): number {
    const fecha = new Date(valor).getTime();
    return Number.isNaN(fecha) ? 0 : fecha;
  }

  /** Mensaje legible de un error HTTP, de red o de tiempo de espera. */
  private mensajeError(error: unknown, porDefecto: string): string {
    if (error instanceof TimeoutError) {
      return 'Error de comunicación. El servidor no respondió dentro del tiempo esperado.';
    }

    if (error instanceof HttpErrorResponse) {
      const cuerpo = error.error;

      if (cuerpo && typeof cuerpo === 'object' && 'message' in cuerpo) {
        const mensaje = String((cuerpo as { message?: unknown }).message ?? '').trim();
        if (mensaje) return mensaje;
      }

      if (typeof cuerpo === 'string' && cuerpo.trim()) return cuerpo.trim();
      if (error.status === 0) return 'No se pudo conectar con el servidor.';
    }

    if (error && typeof error === 'object' && 'message' in error) {
      const mensaje = String((error as { message?: unknown }).message ?? '').trim();
      if (mensaje) return mensaje;
    }

    return porDefecto;
  }
}
