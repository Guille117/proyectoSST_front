import { NgClass } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, forkJoin, Subscription, timeout, TimeoutError } from 'rxjs';
import { OpcionOtroComponent, OpcionOtroValor } from '../../../shared/opcion-otro/opcion-otro';
import { PopUps } from '../../../shared/popUps/popUpsService';
import { TabSwitch } from '../../../shared/tab-switch/tab-switch';
import { AuthService } from '../../Auth/data/auth-service';
import { Inter_base } from '../../Catalogos/data/nombreInterfaz';
import { CatalogoService } from '../../Catalogos/data/serviceCatalogo';
import { ProcedimientoMedicoService } from '../../Medica/procedimiento-medico/data/procedimiento-medico-service';
import {
  RecursoDisponibleResponse,
  TipoRecursoProcedimientoApi,
} from '../../Medica/procedimiento-medico/data/procedimientoMedicoInterfaz';
import { PacienteResumido } from '../../Pacientes/paciente/data/pacienteInterfaz';
import { PacienteService } from '../../Pacientes/paciente/data/paciente-service';
import { InventarioResponse } from '../inventario/data/interfaz-inventario';
import { ServicioInventario } from '../inventario/data/servicio-inventario';
import { SalidasService } from './data/salidas-service';
import {
  CondicionDevolucion,
  DevolucionLineaRequest,
  DetalleSolicitudSalida,
  EntregaLineaRequest,
  EstadoDetalleSalida,
  EstadoSolicitudSalida,
  HistorialMovimiento,
  LoteDisponibleSalida,
  LoteEntregadoSalida,
  SalidaDirectaLineaRequest,
  SalidaDirectaRequest,
  SolicitudSalida,
  SolicitudSalidaBase,
  SolicitudSalidaResumen,
} from './data/salidasInterfaz';

type FiltroSolicitud = 'todas' | EstadoSolicitudSalida;
type TipoRecurso = 'medicamento' | 'insumo';

const TIEMPO_ESPERA_MS = 5000;

interface DetalleSalidaVista extends DetalleSolicitudSalida {
  loteSeleccionadoId: number | null;
  cantidadEntrega: number | null;
  loteDevueltoId: number | null;
  cantidadDevolver: number | null;
  condicion: CondicionDevolucion;
  motivoBajaId: number | null;
  motivoBajaAnterior?: number | null;
}

interface SolicitudSalidaVista extends SolicitudSalidaBase {
  solicitante: string;
  detalles: DetalleSalidaVista[];
}

/** Línea de la salida directa que se está capturando desde Farmacia. */
interface LineaSalidaVista {
  tipo: TipoRecurso;
  referenciaId: number;
  nombre: string;
  cantidadSolicitada: number;
  cantidad: number | null;
  lotes: LoteDisponibleSalida[];
  loteSeleccionadoId: number | null;
}

/** Movimientos de una salida agrupados mientras no pasen más de 10 minutos entre uno y otro. */
interface GrupoHistorial {
  fechaHora: string;
  movimientos: HistorialMovimiento[];
}

/**
 * Farmacia → Salidas: solicitudes generadas por los procedimientos médicos,
 * despacho total o parcial por lote y devoluciones al inventario.
 */
@Component({
  selector: 'app-salidas',
  imports: [FormsModule, NgClass, OpcionOtroComponent, TabSwitch],
  templateUrl: './salidas.html',
  styleUrl: './salidas.scss',
})
export class Salidas implements OnInit, OnDestroy {
  private readonly salidasService = inject(SalidasService);
  private readonly catalogoService = inject(CatalogoService);
  private readonly authService = inject(AuthService);
  private readonly pacienteService = inject(PacienteService);
  private readonly inventarioService = inject(ServicioInventario);
  private readonly procedimientoService = inject(ProcedimientoMedicoService);
  private readonly popUps = inject(PopUps);
  private readonly cdr = inject(ChangeDetectorRef);

  private peticionLista?: Subscription;
  private peticionDetalle?: Subscription;
  private peticionMotivos?: Subscription;
  private peticionAccion?: Subscription;
  private peticionPacientes?: Subscription;
  private peticionHistorial?: Subscription;
  private peticionInventario?: Subscription;
  private peticionRecursos?: Subscription;
  private destruido = false;

  /** Pestaña activa del detalle: `false` = Solicitudes, `true` = Devoluciones. */
  readonly enDevoluciones = signal(false);
  /** Tercera pestaña del detalle: movimientos de la salida seleccionada. */
  readonly enHistorial = signal(false);
  /** La vista principal se reemplaza por la captura de una salida directa. */
  readonly generandoSalida = signal(false);

  filtro: FiltroSolicitud = 'todas';
  textoBusqueda = '';

  solicitudes: SolicitudSalidaResumen[] = [];
  solicitudSeleccionada: SolicitudSalidaVista | null = null;
  motivos: Inter_base[] = [];

  readonly opcionOtroId = -1;
  detalleEditandoMotivo: DetalleSalidaVista | null = null;
  creandoMotivo = false;

  cargandoSolicitudes = false;
  cargandoDetalle = false;
  cargandoMotivos = false;
  guardandoEntrega = false;
  guardandoDevolucion = false;

  // ------------------- SALIDA DIRECTA -------------------
  pacientes: PacienteResumido[] = [];
  cargandoPacientes = false;
  pacienteSeleccionadoId: number | null = null;
  lineasSalida: LineaSalidaVista[] = [];
  lotesInventario: InventarioResponse[] = [];
  cargandoLotes = false;
  guardandoSalida = false;

  tipoRecurso: TipoRecurso = 'medicamento';
  textoBusquedaRecurso = '';
  busquedaRecursoRealizada = false;
  recursosEncontrados: RecursoDisponibleResponse[] = [];
  recursoSeleccionado: RecursoDisponibleResponse | null = null;
  lotesRecursoSeleccionado: LoteDisponibleSalida[] = [];
  loteRecursoSeleccionadoId: number | null = null;
  cantidadRecurso: number | null = null;
  cargandoRecursos = false;

  // ------------------- HISTORIAL -------------------
  historial: HistorialMovimiento[] = [];
  cargandoHistorial = false;
  errorHistorial = false;

  // ------------------- CICLO DE VIDA -------------------

  ngOnInit(): void {
    this.cargarMotivos();
    this.cargarSolicitudes();
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.peticionLista?.unsubscribe();
    this.peticionDetalle?.unsubscribe();
    this.peticionMotivos?.unsubscribe();
    this.peticionAccion?.unsubscribe();
    this.peticionPacientes?.unsubscribe();
    this.peticionHistorial?.unsubscribe();
    this.peticionInventario?.unsubscribe();
    this.peticionRecursos?.unsubscribe();
  }

  // ------------------- CONSULTAS PARA LA VISTA -------------------

  get detallesConEntregas(): DetalleSalidaVista[] {
    return this.solicitudSeleccionada?.detalles.filter((detalle) => detalle.entregado > 0) ?? [];
  }

  get puedeGuardarEntrega(): boolean {
    if (!this.solicitudSeleccionada || this.guardandoEntrega) return false;

    return this.solicitudSeleccionada.detalles.some((detalle) => {
      const cantidad = Number(detalle.cantidadEntrega);
      return (
        detalle.pendiente > 0 &&
        detalle.loteSeleccionadoId !== null &&
        Number.isInteger(cantidad) &&
        cantidad > 0 &&
        cantidad <= this.maximoEntrega(detalle)
      );
    });
  }

  get puedeGuardarDevolucion(): boolean {
    if (!this.solicitudSeleccionada || this.guardandoDevolucion) return false;

    return this.detallesConEntregas.some((detalle) => {
      const cantidad = Number(detalle.cantidadDevolver);
      return (
        detalle.loteDevueltoId !== null &&
        detalle.motivoBajaId !== null &&
        Number.isInteger(cantidad) &&
        cantidad > 0 &&
        cantidad <= this.maximoDevolucion(detalle)
      );
    });
  }

  get tituloDetalle(): string {
    if (this.enHistorial()) return 'Detalle de historial';
    return this.enDevoluciones() ? 'Detalle de devolución' : 'Detalle de solicitud';
  }

  get historialAgrupado(): GrupoHistorial[] {
    const margenMs = 10 * 60 * 1000;
    const grupos: GrupoHistorial[] = [];

    for (const movimiento of this.historial) {
      const instante = new Date(movimiento.fechaHora).getTime();
      const ultimo = grupos[grupos.length - 1];
      const anterior = ultimo?.movimientos[ultimo.movimientos.length - 1];
      const instanteAnterior = anterior ? new Date(anterior.fechaHora).getTime() : Number.NaN;

      if (ultimo && instante >= instanteAnterior && instante - instanteAnterior <= margenMs) {
        ultimo.movimientos.push(movimiento);
      } else {
        grupos.push({ fechaHora: movimiento.fechaHora, movimientos: [movimiento] });
      }
    }

    return grupos;
  }

  get puedeGenerarSalida(): boolean {
    if (this.guardandoSalida || this.pacienteSeleccionadoId === null) return false;
    if (!this.lineasSalida.length || this.lineasSalida.some((linea) => linea.cantidad === null)) {
      return false;
    }

    const usados = new Set<string>();
    for (const linea of this.lineasSalida) {
      if (linea.loteSeleccionadoId === null) return false;
      const disponible = this.disponibleLinea(linea);
      if (linea.cantidad === null || linea.cantidad < 1 || linea.cantidad > disponible) {
        return false;
      }
      const clave = `${linea.tipo}#${linea.referenciaId}#${linea.loteSeleccionadoId}`;
      if (usados.has(clave)) return false;
      usados.add(clave);
    }

    return true;
  }

  get etiquetaGuardarEntrega(): string {
    return this.guardandoEntrega ? 'Guardando...' : 'Guardar';
  }

  get etiquetaGuardarDevolucion(): string {
    return this.guardandoDevolucion ? 'Guardando...' : 'Guardar devolución';
  }

  // ------------------- CARGA DE DATOS -------------------

  cargarSolicitudes(seleccionarId?: number): void {
    if (this.destruido) return;

    const estado = this.filtro === 'todas' ? undefined : this.filtro;
    this.peticionLista?.unsubscribe();
    this.cargandoSolicitudes = true;
    this.cdr.markForCheck();

    this.peticionLista = this.salidasService
      .listar(estado, this.textoBusqueda)
      .pipe(
        finalize(() => {
          this.cargandoSolicitudes = false;
          if (!this.destruido) this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (solicitudes) => {
          if (this.destruido) return;

          this.solicitudes = solicitudes;
          const solicitado = seleccionarId !== undefined
            ? solicitudes.find((solicitud) => solicitud.id === seleccionarId)?.id
            : undefined;
          const actual = this.solicitudSeleccionada?.id;
          const siguiente = solicitado
            ?? (actual !== undefined && solicitudes.some((solicitud) => solicitud.id === actual)
              ? actual
              : solicitudes[0]?.id);

          if (siguiente === undefined) {
            this.solicitudSeleccionada = null;
            return;
          }

          this.cargarDetalle(siguiente);
        },
        error: (error) => {
          if (this.destruido) return;

          this.solicitudes = [];
          this.solicitudSeleccionada = null;
          this.mostrarError(error, 'No se pudieron cargar las solicitudes de salida.');
        },
      });
  }

  cargarDetalle(id: number): void {
    if (this.destruido) return;

    this.peticionDetalle?.unsubscribe();
    this.cargandoDetalle = true;
    this.cdr.markForCheck();

    this.peticionDetalle = this.salidasService
      .obtener(id)
      .pipe(
        finalize(() => {
          this.cargandoDetalle = false;
          if (!this.destruido) this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (solicitud) => {
          if (this.destruido) return;

          this.solicitudSeleccionada = this.aVista(solicitud);
          if (this.enHistorial()) this.cargarHistorial();
        },
        error: (error) => {
          if (this.destruido) return;

          this.solicitudSeleccionada = null;
          this.mostrarError(error, 'No se pudo cargar el detalle de la solicitud.');
        },
      });
  }

  cargarMotivos(): void {
    this.peticionMotivos?.unsubscribe();
    this.cargandoMotivos = true;
    this.cdr.markForCheck();

    this.peticionMotivos = this.catalogoService
      .listar<Inter_base>('motivoBaja', true)
      .pipe(
        timeout(TIEMPO_ESPERA_MS),
        finalize(() => {
          this.cargandoMotivos = false;
          if (!this.destruido) this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (motivos) => {
          if (this.destruido) return;

          this.motivos = motivos;
          for (const detalle of this.solicitudSeleccionada?.detalles ?? []) {
            if (detalle.entregado > 0 && detalle.motivoBajaId === null) {
              detalle.motivoBajaId = motivos[0]?.id ?? null;
            }
          }
        },
        error: (error) => {
          if (this.destruido) return;

          this.motivos = [];
          this.mostrarError(error, 'No se pudieron cargar los motivos de devolución.');
        },
      });
  }

  // ------------------- CREACIÓN DE MOTIVOS DE BAJA -------------------
  alElegirMotivo(detalle: DetalleSalidaVista, valor: number | null): void {
    if (valor === this.opcionOtroId) {
      detalle.motivoBajaAnterior = detalle.motivoBajaId;
      detalle.motivoBajaId = null;
      this.detalleEditandoMotivo = detalle;
      return;
    }

    detalle.motivoBajaId = valor;
  }

  crearMotivo(detalle: DetalleSalidaVista, datos: OpcionOtroValor): void {
    if (this.creandoMotivo) return;

    this.creandoMotivo = true;
    this.catalogoService
      .crear<Inter_base>('motivoBaja', { nombre: datos.nombre })
      .pipe(
        timeout(TIEMPO_ESPERA_MS),
        finalize(() => {
          this.creandoMotivo = false;
          if (!this.destruido) this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (creado) => {
          if (this.destruido || creado.id == null) return;

          this.motivos = [...this.motivos, creado];
          detalle.motivoBajaId = creado.id;
          detalle.motivoBajaAnterior = undefined;
          this.detalleEditandoMotivo = null;
          this.cdr.markForCheck();
        },
        error: (error) => {
          if (this.destruido) return;

          this.mostrarError(error, 'No se pudo crear el motivo de baja.');
        },
      });
  }

  cancelarMotivo(detalle: DetalleSalidaVista): void {
    this.detalleEditandoMotivo = null;
    detalle.motivoBajaId = detalle.motivoBajaAnterior ?? null;
    detalle.motivoBajaAnterior = undefined;
  }

  // ------------------- ACCIONES DE LA VISTA -------------------

  buscar(): void {
    this.cargarSolicitudes();
  }

  seleccionarFiltro(filtro: FiltroSolicitud): void {
    if (this.filtro === filtro) return;

    this.filtro = filtro;
    this.cargarSolicitudes();
  }

  seleccionarSolicitud(id: number): void {
    if (this.solicitudSeleccionada?.id === id) return;

    this.cargarDetalle(id);
  }

  /** Cambia la vista del detalle entre solicitudes y devoluciones. */
  seleccionarVista(devoluciones: boolean): void {
    this.enHistorial.set(false);

    if (this.enDevoluciones() === devoluciones) {
      this.cdr.markForCheck();
      return;
    }

    this.enDevoluciones.set(devoluciones);
    this.cdr.markForCheck();
  }

  /** Activa la pestaña Historial y carga los movimientos de la salida seleccionada. */
  seleccionarHistorial(): void {
    this.enDevoluciones.set(false);
    this.enHistorial.set(true);
    this.cargarHistorial();
    this.cdr.markForCheck();
  }

  // ------------------- SALIDA DIRECTA -------------------

  /** Oculta la vista principal y abre la captura de una salida directa. */
  abrirGeneracionSalida(): void {
    if (this.generandoSalida()) return;

    this.generandoSalida.set(true);
    this.pacienteSeleccionadoId = null;
    this.lineasSalida = [];
    this.lotesInventario = [];
    this.cancelarSeleccionRecurso();
    this.cargarPacientes();
    this.cargarLotes();
    this.cdr.markForCheck();
  }

  /** Descarta la captura de la salida directa y vuelve a la vista principal. */
  cancelarGeneracionSalida(): void {
    this.peticionPacientes?.unsubscribe();
    this.peticionInventario?.unsubscribe();
    this.peticionRecursos?.unsubscribe();
    this.peticionAccion?.unsubscribe();
    this.generandoSalida.set(false);
    this.pacienteSeleccionadoId = null;
    this.lineasSalida = [];
    this.lotesInventario = [];
    this.cancelarSeleccionRecurso();
    this.guardandoSalida = false;
    this.cdr.markForCheck();
  }

  private cargarPacientes(): void {
    this.peticionPacientes?.unsubscribe();
    this.cargandoPacientes = true;
    this.cdr.markForCheck();

    this.peticionPacientes = this.pacienteService
      .listarPacientes()
      .pipe(
        finalize(() => {
          this.cargandoPacientes = false;
          if (!this.destruido) this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (pacientes) => {
          if (this.destruido) return;
          this.pacientes = pacientes.filter((paciente) => paciente.episodioId !== null);
        },
        error: (error) => {
          if (this.destruido) return;
          this.pacientes = [];
          this.mostrarError(error, 'No se pudieron cargar los pacientes.');
        },
      });
  }

  private cargarLotes(): void {
    this.peticionInventario?.unsubscribe();
    this.cargandoLotes = true;
    this.cdr.markForCheck();

    this.peticionInventario = forkJoin([
      this.inventarioService.listarInventario({ tipo: 'medicamento', activos: true }),
      this.inventarioService.listarInventario({ tipo: 'insumo', activos: true }),
    ])
      .pipe(
        finalize(() => {
          this.cargandoLotes = false;
          if (!this.destruido) this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: ([medicamentos, insumos]) => {
          if (this.destruido) return;
          this.lotesInventario = [...medicamentos, ...insumos];
          this.actualizarLotesLineas();
          this.actualizarLotesRecursoSeleccionado();
        },
        error: (error) => {
          if (this.destruido) return;
          this.lotesInventario = [];
          this.mostrarError(error, 'No se pudieron cargar los lotes disponibles.');
        },
      });
  }

  // ------------------- RECURSOS DE LA SALIDA -------------------

  get etiquetaRecurso(): string {
    return this.tipoRecurso === 'medicamento' ? 'medicamento' : 'insumo';
  }

  get cantidadMaximaRecurso(): number {
    const seleccionado = this.recursoSeleccionado;
    const lote = this.lotesRecursoSeleccionado.find(
      (opcion) => opcion.id === this.loteRecursoSeleccionadoId,
    );
    if (!seleccionado || !lote) return 0;

    const agregadoAlRecurso = this.lineasSalida
      .filter((linea) => linea.tipo === this.tipoRecurso && linea.referenciaId === seleccionado.id)
      .reduce((total, linea) => total + linea.cantidadSolicitada, 0);
    const agregadoAlLote = this.lineasSalida
      .filter(
        (linea) =>
          linea.tipo === this.tipoRecurso &&
          linea.referenciaId === seleccionado.id &&
          linea.loteSeleccionadoId === lote.id,
      )
      .reduce((total, linea) => total + linea.cantidadSolicitada, 0);

    return Math.max(
      0,
      Math.min(
        seleccionado.disponible - agregadoAlRecurso,
        lote.disponible - agregadoAlLote,
      ),
    );
  }

  get puedeAgregarRecurso(): boolean {
    const cantidad = this.cantidadRecurso;
    return (
      !this.cargandoRecursos &&
      this.recursoSeleccionado !== null &&
      this.loteRecursoSeleccionadoId !== null &&
      cantidad !== null &&
      Number.isInteger(cantidad) &&
      cantidad > 0 &&
      cantidad <= this.cantidadMaximaRecurso
    );
  }

  cambiarTipoRecurso(esMedicamento: boolean): void {
    this.tipoRecurso = esMedicamento ? 'medicamento' : 'insumo';
    this.cancelarSeleccionRecurso();
    this.cdr.markForCheck();
  }

  buscarRecursos(): void {
    if (this.destruido || this.cargandoRecursos) return;

    this.peticionRecursos?.unsubscribe();
    this.busquedaRecursoRealizada = true;
    this.cargandoRecursos = true;
    this.recursoSeleccionado = null;
    this.cantidadRecurso = null;
    this.recursosEncontrados = [];
    this.cdr.markForCheck();

    this.peticionRecursos = this.procedimientoService
      .buscarRecursos(this.aTipoRecursoApi(this.tipoRecurso), this.textoBusquedaRecurso)
      .pipe(
        finalize(() => {
          this.cargandoRecursos = false;
          if (!this.destruido) this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (recursos) => {
          if (this.destruido) return;
          this.recursosEncontrados = recursos;
        },
        error: (error) => {
          if (this.destruido) return;
          this.recursosEncontrados = [];
          this.mostrarError(error, `No se pudo buscar ${this.etiquetaRecurso} en farmacia.`);
        },
      });
  }

  seleccionarRecurso(recurso: RecursoDisponibleResponse): void {
    this.recursoSeleccionado = recurso;
    this.lotesRecursoSeleccionado = this.lotesDeRecurso(this.tipoRecurso, recurso.id);
    this.loteRecursoSeleccionadoId = this.lotesRecursoSeleccionado[0]?.id ?? null;
    this.cantidadRecurso = this.lotesRecursoSeleccionado.length ? 1 : null;
    this.busquedaRecursoRealizada = false;
    this.recursosEncontrados = [];
    this.textoBusquedaRecurso = '';
    this.cdr.markForCheck();
  }

  cancelarSeleccionRecurso(): void {
    this.recursoSeleccionado = null;
    this.lotesRecursoSeleccionado = [];
    this.loteRecursoSeleccionadoId = null;
    this.cantidadRecurso = null;
    this.busquedaRecursoRealizada = false;
    this.recursosEncontrados = [];
    this.textoBusquedaRecurso = '';
  }

  /** Agrega el recurso seleccionado con el lote elegido a la salida. */
  agregarRecurso(): void {
    const seleccionado = this.recursoSeleccionado;
    const cantidad = this.cantidadRecurso;
    const loteId = this.loteRecursoSeleccionadoId;

    if (!seleccionado || cantidad === null || loteId === null || !this.puedeAgregarRecurso) {
      return;
    }

    const existente = this.buscarLineaAgregada(seleccionado.id, loteId);
    if (existente) {
      existente.cantidadSolicitada += cantidad;
      this.actualizarLotesLinea(existente);
    } else {
      const linea: LineaSalidaVista = {
        tipo: this.tipoRecurso,
        referenciaId: seleccionado.id,
        nombre: seleccionado.nombre,
        cantidadSolicitada: cantidad,
        cantidad: null,
        lotes: [],
        loteSeleccionadoId: loteId,
      };
      this.lineasSalida = [...this.lineasSalida, linea];
      this.actualizarLotesLinea(linea);
    }

    this.cancelarSeleccionRecurso();
    this.cdr.markForCheck();
  }

  private buscarLineaAgregada(
    referenciaId: number,
    loteSeleccionadoId: number,
  ): LineaSalidaVista | undefined {
    return this.lineasSalida.find(
      (linea) =>
        linea.tipo === this.tipoRecurso &&
        linea.referenciaId === referenciaId &&
        linea.loteSeleccionadoId === loteSeleccionadoId,
    );
  }

  private aTipoRecursoApi(tipo: TipoRecurso): TipoRecursoProcedimientoApi {
    return tipo === 'medicamento' ? 'MEDICAMENTO' : 'INSUMO';
  }

  quitarLineaSalida(indice: number): void {
    if (indice < 0 || indice >= this.lineasSalida.length) return;

    this.lineasSalida = this.lineasSalida.filter((_, posicion) => posicion !== indice);
    this.cdr.markForCheck();
  }

  /** Limita la cantidad de la captura al máximo del lote, sin rellenarla al borrarla. */
  ajustarCantidadRecurso(): void {
    const maximo = this.cantidadMaximaRecurso;
    if (this.cantidadRecurso !== null && this.cantidadRecurso > maximo) {
      this.cantidadRecurso = maximo;
    }
    this.cdr.markForCheck();
  }

  /** Código del lote con el que se agregó la línea, para mostrarlo como texto. */
  loteTexto(linea: LineaSalidaVista): string {
    return (
      linea.lotes.find((opcion) => opcion.id === linea.loteSeleccionadoId)?.codigoLote ??
      'Sin lote'
    );
  }

  disponibleLinea(linea: LineaSalidaVista): number {
    const lote = linea.lotes.find((opcion) => opcion.id === linea.loteSeleccionadoId);
    return lote?.disponible ?? 0;
  }

  private actualizarLotesLineas(): void {
    for (const linea of this.lineasSalida) {
      this.actualizarLotesLinea(linea);
    }
    this.cdr.markForCheck();
  }

  /** Refresca los lotes del recurso abierto en el panel de selección. */
  private actualizarLotesRecursoSeleccionado(): void {
    const seleccionado = this.recursoSeleccionado;
    if (!seleccionado) {
      this.lotesRecursoSeleccionado = [];
      this.loteRecursoSeleccionadoId = null;
      return;
    }

    this.lotesRecursoSeleccionado = this.lotesDeRecurso(this.tipoRecurso, seleccionado.id);
    if (!this.lotesRecursoSeleccionado.some((lote) => lote.id === this.loteRecursoSeleccionadoId)) {
      this.loteRecursoSeleccionadoId = this.lotesRecursoSeleccionado[0]?.id ?? null;
    }

    if (this.cantidadRecurso !== null) {
      this.cantidadRecurso = Math.min(this.cantidadRecurso, this.cantidadMaximaRecurso);
    } else if (this.cantidadMaximaRecurso > 0) {
      this.cantidadRecurso = 1;
    }
  }

  private actualizarLotesLinea(linea: LineaSalidaVista): void {
    linea.lotes = this.lotesDeRecurso(linea.tipo, linea.referenciaId);
    const seleccionado = linea.lotes.find((lote) => lote.id === linea.loteSeleccionadoId);
    linea.loteSeleccionadoId = seleccionado?.id ?? linea.lotes[0]?.id ?? null;

    const disponible = this.disponibleLinea(linea);
    linea.cantidad = linea.loteSeleccionadoId === null
      ? null
      : Math.min(linea.cantidadSolicitada, disponible);
  }

  /** Lotes activos, con existencia y no vencidos del recurso, ordenados por vencimiento. */
  private lotesDeRecurso(tipo: TipoRecurso, referenciaId: number): LoteDisponibleSalida[] {
    const hoy = new Date().toISOString().slice(0, 10);
    const tipoApi = tipo === 'medicamento' ? 'MEDICAMENTO' : 'INSUMO';

    return this.lotesInventario
      .filter(
        (lote) =>
          lote.tipo === tipoApi &&
          lote.idItem === referenciaId &&
          lote.estado &&
          lote.disponible > 0 &&
          (!lote.fechaVencimiento || lote.fechaVencimiento >= hoy),
      )
      .sort((a, b) =>
        (a.fechaVencimiento ?? '9999-12-31').localeCompare(b.fechaVencimiento ?? '9999-12-31'),
      )
      .map((lote) => ({
        id: lote.id,
        codigoLote: lote.codigoLote,
        fechaVencimiento: lote.fechaVencimiento,
        disponible: lote.disponible,
      }));
  }

  /** Registra la salida directa y descuenta el inventario de los lotes elegidos. */
  generarSalida(): void {
    if (!this.puedeGenerarSalida) return;

    const usuarioId = this.authService.currentUser()?.id;
    if (!usuarioId) {
      this.popUps.error('No se pudo identificar al usuario de la sesión.');
      return;
    }

    const paciente = this.pacientes.find(
      (opcion) => opcion.pacienteId === this.pacienteSeleccionadoId,
    );
    const episodioId = paciente?.episodioId ?? null;
    if (episodioId === null) {
      this.popUps.advertencia('Seleccione un paciente con episodio activo.');
      return;
    }

    const lineas: SalidaDirectaLineaRequest[] = this.lineasSalida.map((linea) => ({
      tipo: this.aTipoRecursoApi(linea.tipo),
      referenciaId: linea.referenciaId,
      cantidad: linea.cantidad!,
      loteId: linea.loteSeleccionadoId!,
    }));
    const request: SalidaDirectaRequest = { episodioId, usuarioId, lineas };

    this.peticionAccion?.unsubscribe();
    this.guardandoSalida = true;
    this.cdr.markForCheck();

    this.peticionAccion = this.salidasService
      .crearDirecta(request)
      .pipe(
        finalize(() => {
          this.guardandoSalida = false;
          if (!this.destruido) this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (respuesta) => {
          if (this.destruido) return;

          this.popUps.exito('Salida registrada exitosamente.');
          this.generandoSalida.set(false);
          this.pacienteSeleccionadoId = null;
          this.lineasSalida = [];
          this.cargarSolicitudes(respuesta.id);
        },
        error: (error) => {
          if (this.destruido) return;
          this.mostrarError(error, 'No se pudo registrar la salida. Intente nuevamente.');
        },
      });
  }

  // ------------------- HISTORIAL -------------------

  cargarHistorial(): void {
    const id = this.solicitudSeleccionada?.id;
    if (id === undefined) {
      this.historial = [];
      return;
    }

    this.peticionHistorial?.unsubscribe();
    this.cargandoHistorial = true;
    this.errorHistorial = false;
    this.cdr.markForCheck();

    this.peticionHistorial = this.salidasService
      .historial(id)
      .pipe(
        finalize(() => {
          this.cargandoHistorial = false;
          if (!this.destruido) this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (historial) => {
          if (this.destruido) return;
          this.historial = historial;
        },
        error: (error) => {
          if (this.destruido) return;
          this.historial = [];
          this.errorHistorial = true;
          this.mostrarError(error, 'No se pudo cargar el historial de la salida.');
        },
      });
  }

  historialTexto(movimiento: HistorialMovimiento): string {
    const accion = movimiento.tipoMovimiento === 'ENTREGA' ? 'Se entregó' : 'Se devolvió';
    return `${accion} ${movimiento.cantidad} de ${movimiento.producto} (${movimiento.lote})`;
  }

  /** Bloquea el tecleo de cantidades mayores a las permitidas en el input. */
  bloquearCantidadMayor(event: KeyboardEvent, maximo: number): void {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    // Teclas especiales (flechas, borrar, tabulación, etc.).
    if (event.key.length > 1) return;
    if (!/^\d$/.test(event.key)) {
      event.preventDefault();
      return;
    }

    const input = event.target as HTMLInputElement;
    const inicio = input.selectionStart ?? input.value.length;
    const fin = input.selectionEnd ?? inicio;
    const siguiente = `${input.value.slice(0, inicio)}${event.key}${input.value.slice(fin)}`;

    if (Number(siguiente) > maximo) {
      event.preventDefault();
    }
  }

  /** Limita la cantidad de entrega al pendiente y al stock del lote elegido. */
  ajustarCantidadEntrega(detalle: DetalleSalidaVista): void {
    const maximo = this.maximoEntrega(detalle);
    const valor = detalle.cantidadEntrega;
    const cantidad = valor === null || `${valor}`.trim() === '' ? null : Number(valor);

    if (cantidad === null || !Number.isInteger(cantidad) || cantidad < 1) {
      detalle.cantidadEntrega = null;
      return;
    }

    detalle.cantidadEntrega = Math.min(cantidad, maximo);
  }

  /** Al cambiar de lote, reinicia la cantidad de devolución al máximo permitido. */
  ajustarCantidadDevolucion(detalle: DetalleSalidaVista): void {
    const maximo = this.maximoDevolucion(detalle);
    const valor = detalle.cantidadDevolver;
    const cantidad = valor === null || `${valor}`.trim() === '' ? null : Number(valor);

    if (cantidad === null || !Number.isInteger(cantidad) || cantidad < 0) {
      detalle.cantidadDevolver = null;
      return;
    }

    detalle.cantidadDevolver = Math.min(cantidad, maximo);
  }

  maximoEntrega(detalle: DetalleSalidaVista): number {
    const lote = detalle.lotesDisponibles.find(
      (opcion) => opcion.id === detalle.loteSeleccionadoId,
    );
    return lote ? Math.min(detalle.pendiente, lote.disponible) : 0;
  }

  maximoDevolucion(detalle: DetalleSalidaVista): number {
    const lote = detalle.lotesEntregados.find(
      (opcion) => opcion.loteId === detalle.loteDevueltoId,
    );
    return lote?.disponibleDevolver ?? 0;
  }

  loteSugerido(detalle: DetalleSalidaVista): LoteDisponibleSalida | LoteEntregadoSalida | null {
    return detalle.lotesDisponibles[0] ?? detalle.lotesEntregados[0] ?? null;
  }

  lotesEntregadosTexto(detalle: DetalleSalidaVista): string {
    return detalle.lotesEntregados.map((lote) => lote.codigoLote).join(', ');
  }

  // ------------------- ENTREGAS -------------------

  entregar(): void {
    const solicitud = this.solicitudSeleccionada;
    if (!solicitud || this.guardandoEntrega) return;

    const usuarioId = this.authService.currentUser()?.id;
    if (!usuarioId) {
      this.popUps.error('No se pudo identificar al usuario de la sesión.');
      return;
    }

    const lineas: EntregaLineaRequest[] = [];
    for (const detalle of solicitud.detalles) {
      if (detalle.pendiente <= 0 || detalle.loteSeleccionadoId === null) continue;

      const cantidad = Number(detalle.cantidadEntrega);
      if (!Number.isInteger(cantidad) || cantidad <= 0) continue;

      if (cantidad > this.maximoEntrega(detalle)) {
        this.popUps.advertencia(
          `La cantidad de ${detalle.nombre} supera el pendiente o el stock del lote.`,
        );
        return;
      }

      lineas.push({
        detalleId: detalle.id,
        loteId: detalle.loteSeleccionadoId,
        cantidad,
      });
    }

    if (!lineas.length) {
      this.popUps.advertencia('Ingrese al menos una cantidad a entregar.');
      return;
    }

    this.peticionAccion?.unsubscribe();
    this.guardandoEntrega = true;
    this.cdr.markForCheck();

    this.peticionAccion = this.salidasService
      .entregar(solicitud.id, { usuarioId, lineas })
      .pipe(
        finalize(() => {
          this.guardandoEntrega = false;
          if (!this.destruido) this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (respuesta) => {
          if (this.destruido) return;

          this.solicitudSeleccionada = this.aVista(respuesta);
          this.popUps.exito('Entrega registrada exitosamente.');
          this.cargarSolicitudes(respuesta.id);
        },
        error: (error) => {
          if (this.destruido) return;

          this.mostrarError(error, 'No se pudo registrar la entrega. Intente nuevamente.');
        },
      });
  }

  // ------------------- DEVOLUCIONES -------------------

  devolver(): void {
    const solicitud = this.solicitudSeleccionada;
    if (!solicitud || this.guardandoDevolucion) return;

    const usuarioId = this.authService.currentUser()?.id;
    if (!usuarioId) {
      this.popUps.error('No se pudo identificar al usuario de la sesión.');
      return;
    }

    const lineas: DevolucionLineaRequest[] = [];
    for (const detalle of this.detallesConEntregas) {
      const cantidad = Number(detalle.cantidadDevolver);
      if (!Number.isInteger(cantidad) || cantidad <= 0) continue;

      if (detalle.loteDevueltoId === null) {
        this.popUps.advertencia(`Seleccione el lote entregado de ${detalle.nombre}.`);
        return;
      }
      if (detalle.motivoBajaId === null) {
        this.popUps.advertencia(`Seleccione el motivo de devolución de ${detalle.nombre}.`);
        return;
      }
      if (cantidad > this.maximoDevolucion(detalle)) {
        this.popUps.advertencia(
          `La cantidad a devolver de ${detalle.nombre} supera lo entregado en el lote.`,
        );
        return;
      }

      lineas.push({
        detalleId: detalle.id,
        loteId: detalle.loteDevueltoId,
        cantidad,
        condicion: detalle.condicion,
        motivoBajaId: detalle.motivoBajaId,
        observacion: null,
      });
    }

    if (!lineas.length) {
      this.popUps.advertencia('Ingrese al menos una cantidad a devolver.');
      return;
    }

    this.peticionAccion?.unsubscribe();
    this.guardandoDevolucion = true;
    this.cdr.markForCheck();

    this.peticionAccion = this.salidasService
      .devolver(solicitud.id, { usuarioId, lineas })
      .pipe(
        finalize(() => {
          this.guardandoDevolucion = false;
          if (!this.destruido) this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (respuesta) => {
          if (this.destruido) return;

          this.solicitudSeleccionada = this.aVista(respuesta);
          this.popUps.exito('Devolución registrada exitosamente.');
          this.cargarSolicitudes(respuesta.id);
        },
        error: (error) => {
          if (this.destruido) return;

          this.mostrarError(error, 'No se pudo registrar la devolución. Intente nuevamente.');
        },
      });
  }

  // ------------------- FORMATO -------------------

  estadoTexto(estado: EstadoSolicitudSalida | EstadoDetalleSalida): string {
    switch (estado) {
      case 'PENDIENTE':
        return 'Pendiente';
      case 'PARCIAL':
        return 'Parcial';
      case 'COMPLETADA':
        return 'Completa';
      default:
        return 'Cancelada';
    }
  }

  claseEstado(estado: EstadoSolicitudSalida | EstadoDetalleSalida): string {
    switch (estado) {
      case 'PENDIENTE':
        return 'estado-pendiente';
      case 'PARCIAL':
        return 'estado-parcial';
      case 'COMPLETADA':
        return 'estado-completo';
      default:
        return 'estado-cancelado';
    }
  }

  clasePunto(estado: EstadoSolicitudSalida): string {
    switch (estado) {
      case 'PENDIENTE':
        return 'punto-naranja';
      case 'PARCIAL':
        return 'punto-azul';
      case 'COMPLETADA':
        return 'punto-verde';
      default:
        return 'punto-gris';
    }
  }

  tipoAtencionTexto(tipo: string | null): string {
    if (tipo === 'EMERGENCIA') return 'Emergencia';
    if (tipo === 'HOSPITALIZACION') return 'Hospitalización';
    return tipo ?? '—';
  }

  formatearFechaHora(valor: string): string {
    if (!valor) return '—';

    const [fechaParte, horaParte] = valor.split('T');
    const [anio, mes, dia] = fechaParte.split('-').map(Number);
    if (!anio || !mes || !dia) return valor;

    const [hora, minuto] = (horaParte ?? '00:00').split(':').map(Number);
    const dosDigitos = (numero: number): string => `${numero}`.padStart(2, '0');

    return `${dosDigitos(dia)}/${dosDigitos(mes)}/${anio} · ${dosDigitos(hora)}:${dosDigitos(minuto)}`;
  }

  formatearFecha(valor: string | null): string {
    if (!valor) return '—';

    const [fechaParte] = valor.split('T');
    const [anio, mes, dia] = fechaParte.split('-').map(Number);
    if (!anio || !mes || !dia) return valor;

    const dosDigitos = (numero: number): string => `${numero}`.padStart(2, '0');
    return `${dosDigitos(dia)}/${dosDigitos(mes)}/${anio}`;
  }

  // ------------------- APOYO -------------------

  private aVista(solicitud: SolicitudSalida): SolicitudSalidaVista {
    return {
      id: solicitud.id,
      codigo: solicitud.codigo,
      paciente: solicitud.paciente,
      solicitante: solicitud.solicitante,
      tipoAtencion: solicitud.tipoAtencion,
      procedimiento: solicitud.procedimiento,
      fecha: solicitud.fecha,
      estado: solicitud.estado,
      detalles: solicitud.detalles.map((detalle) => this.prepararDetalle(detalle)),
    };
  }

  private prepararDetalle(detalle: DetalleSolicitudSalida): DetalleSalidaVista {
    const loteSugerido = detalle.lotesDisponibles[0] ?? null;
    const loteEntregado = detalle.lotesEntregados[0] ?? null;
    const maximo = loteSugerido
      ? Math.min(detalle.pendiente, loteSugerido.disponible)
      : 0;

    return {
      ...detalle,
      loteSeleccionadoId: loteSugerido?.id ?? null,
      cantidadEntrega: maximo > 0 ? maximo : null,
      loteDevueltoId: loteEntregado?.loteId ?? null,
      cantidadDevolver: null,
      condicion: 'APTO',
      motivoBajaId: this.motivos[0]?.id ?? null,
    };
  }

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
