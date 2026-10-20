import { NgClass } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize, Subscription, timeout, TimeoutError } from 'rxjs';
import { PopUps } from '../../../shared/popUps/popUpsService';
import { AuthService } from '../../Auth/data/auth-service';
import { Inter_base } from '../../Catalogos/data/nombreInterfaz';
import { CatalogoService } from '../../Catalogos/data/serviceCatalogo';
import { SalidasService } from './data/salidas-service';
import {
  CondicionDevolucion,
  DevolucionLineaRequest,
  DetalleSolicitudSalida,
  EntregaLineaRequest,
  EstadoDetalleSalida,
  EstadoSolicitudSalida,
  LoteDisponibleSalida,
  SolicitudSalida,
  SolicitudSalidaBase,
  SolicitudSalidaResumen,
} from './data/salidasInterfaz';

const TIEMPO_ESPERA_MS = 5000;

type FiltroSolicitud = 'todas' | EstadoSolicitudSalida;

interface DetalleSalidaVista extends DetalleSolicitudSalida {
  loteSeleccionadoId: number | null;
  cantidadEntrega: number | null;
  loteDevueltoId: number | null;
  cantidadDevolver: number | null;
  condicion: CondicionDevolucion;
  motivoBajaId: number | null;
}

interface SolicitudSalidaVista extends SolicitudSalidaBase {
  detalles: DetalleSalidaVista[];
}

/**
 * Farmacia → Salidas: solicitudes generadas por los procedimientos médicos,
 * despacho total o parcial por lote y devoluciones al inventario.
 */
@Component({
  selector: 'app-salidas',
  imports: [FormsModule, NgClass],
  templateUrl: './salidas.html',
  styleUrl: './salidas.scss',
})
export class Salidas implements OnInit, OnDestroy {
  private readonly salidasService = inject(SalidasService);
  private readonly catalogoService = inject(CatalogoService);
  private readonly authService = inject(AuthService);
  private readonly popUps = inject(PopUps);
  private readonly cdr = inject(ChangeDetectorRef);

  private peticionLista?: Subscription;
  private peticionDetalle?: Subscription;
  private peticionMotivos?: Subscription;
  private peticionAccion?: Subscription;
  private destruido = false;

  /** Pestaña activa del detalle: `false` = Solicitudes, `true` = Devoluciones. */
  readonly enDevoluciones = signal(false);

  filtro: FiltroSolicitud = 'todas';
  textoBusqueda = '';

  solicitudes: SolicitudSalidaResumen[] = [];
  solicitudSeleccionada: SolicitudSalidaVista | null = null;
  motivos: Inter_base[] = [];

  cargandoSolicitudes = false;
  cargandoDetalle = false;
  cargandoMotivos = false;
  guardandoEntrega = false;
  guardandoDevolucion = false;

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
    return this.enDevoluciones() ? 'Detalle de devolución' : 'Detalle de solicitud';
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
        },
        error: (error) => {
          if (this.destruido) return;

          this.motivos = [];
          this.mostrarError(error, 'No se pudieron cargar los motivos de devolución.');
        },
      });
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
    if (this.enDevoluciones() === devoluciones) {
      return;
    }

    this.enDevoluciones.set(devoluciones);
  }

  /** Limita la cantidad de entrega al pendiente y al stock del lote elegido. */
  ajustarCantidadEntrega(detalle: DetalleSalidaVista): void {
    const maximo = this.maximoEntrega(detalle);
    const cantidad = Number(detalle.cantidadEntrega);

    if (!Number.isInteger(cantidad) || cantidad < 1) {
      detalle.cantidadEntrega = maximo > 0 ? maximo : null;
      return;
    }

    if (cantidad > maximo) {
      detalle.cantidadEntrega = maximo;
    }
  }

  /** Al cambiar de lote, reinicia la cantidad de devolución al máximo permitido. */
  ajustarCantidadDevolucion(detalle: DetalleSalidaVista): void {
    const maximo = this.maximoDevolucion(detalle);
    const cantidad = Number(detalle.cantidadDevolver);

    if (!Number.isInteger(cantidad) || cantidad < 0) {
      detalle.cantidadDevolver = null;
      return;
    }

    if (cantidad > maximo) {
      detalle.cantidadDevolver = maximo;
    }
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

  loteSugerido(detalle: DetalleSalidaVista): LoteDisponibleSalida | null {
    return detalle.lotesDisponibles[0] ?? null;
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
      motivoBajaId: null,
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
