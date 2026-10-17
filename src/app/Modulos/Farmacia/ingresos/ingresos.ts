import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TimeoutError, finalize } from 'rxjs';
import { ModalService } from '../../../modal-principal/modal-service';
import { PopUps } from '../../../shared/popUps/popUpsService';
import { ModalDocumento } from '../modalesFarmacia/modal-documento/modal-documento';
import { ModalMasDetalle } from '../modalesFarmacia/modal-mas-detalle/modal-mas-detalle';
import { proveedorResponse } from '../proveedores/data/proveedorInterfaz';
import { ProveedorService } from '../proveedores/data/proveedor-service';
import { AgregarCompra } from './agregar-compra/agregar-compra';
import {
  detalleCompraResponse,
  resumenCompraFiltros,
  resumenCompraResponse,
} from './agregar-compra/data/interfaz-compra';
import { ServicioCompra } from './agregar-compra/data/servicio-compra';

type CriterioBusqueda = 'codigo' | 'proveedorId' | 'fecha';

@Component({
  selector: 'app-ingresos',
  imports: [AgregarCompra, FormsModule, DecimalPipe],
  templateUrl: './ingresos.html',
  styleUrl: './ingresos.scss',
})
export class Ingresos implements OnInit {
  private modalService = inject(ModalService);
  private servicioCompra = inject(ServicioCompra);
  private servicioProveedor = inject(ProveedorService);
  private popUps = inject(PopUps);
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);

  private readonly mensajeErrorCompras =
    'No se pudo cargar la lista de compras. Intente nuevamente.';
  private readonly mensajeErrorDetalle =
    'No se pudo cargar el detalle de la compra. Intente nuevamente.';

  compras: resumenCompraResponse[] = [];
  cargandoCompras = false;
  errorCompras = '';

  proveedores: proveedorResponse[] = [];
  cargandoProveedores = false;
  criterioBusqueda: CriterioBusqueda = 'codigo';
  textoBusqueda = '';
  proveedorIdBusqueda: number | null = null;
  fechaBusqueda = '';
  private filtrosAplicados: resumenCompraFiltros | null = null;
  private versionCompras = 0;

  compraSeleccionadaId: number | null = null;
  detalleCompra: detalleCompraResponse | null = null;
  compraEditar: detalleCompraResponse | null = null;
  cargandoDetalle = false;
  eliminandoCompra = false;
  errorDetalle = '';

  private comprasDetalle = new Map<number, detalleCompraResponse>();

  mostrarAgregarCompra = signal(false);
  nombreUsuario = signal('Usuario');

  get resumenSeleccionado(): resumenCompraResponse | null {
    if (this.compraSeleccionadaId === null) return null;
    return this.compras.find((compra) => compra.id === this.compraSeleccionadaId) ?? null;
  }

  private readonly meses = [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre',
  ];

  /** Formatea una fecha ISO como `octubre 16, 2026` sin desfases de zona horaria. */
  formatearFecha(fecha: string): string {
    const [fechaParte] = fecha.split('T');
    const [anio, mes, dia] = fechaParte.split('-').map(Number);

    if (!anio || !mes || !dia || mes < 1 || mes > 12) return fecha;

    return `${this.meses[mes - 1]} ${dia}, ${anio}`;
  }

  ngOnInit(): void {
    this.listarProveedores();
    this.listarCompras();
  }

  listarCompras(): void {
    const version = ++this.versionCompras;
    const filtros = this.filtrosAplicados;
    const solicitud = filtros
      ? this.servicioCompra.buscarComprasResumen(filtros)
      : this.servicioCompra.listarComprasResumen();
    const mensajeError = filtros
      ? 'No se pudo realizar la búsqueda de compras. Intente nuevamente.'
      : this.mensajeErrorCompras;

    this.cargandoCompras = true;
    this.errorCompras = '';
    this.cdr.markForCheck();

    solicitud
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (version !== this.versionCompras) return;
          this.cargandoCompras = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (compras) => {
          if (version !== this.versionCompras) return;
          this.compras = compras;
          this.seleccionarCompraInicial();
          this.cdr.markForCheck();
        },
        error: (error) => {
          if (version !== this.versionCompras) return;
          this.compras = [];
          this.compraSeleccionadaId = null;
          this.detalleCompra = null;
          this.errorCompras = this.mensajeErrorPara(error, mensajeError);
          this.cdr.markForCheck();
          this.mostrarError(error, this.errorCompras);
        },
      });
  }

  buscarCompras(): void {
    const filtros = this.obtenerFiltrosBusqueda();
    this.filtrosAplicados = this.tieneFiltros(filtros) ? filtros : null;
    this.listarCompras();
  }

  cambiarCriterioBusqueda(): void {
    this.textoBusqueda = '';
    this.proveedorIdBusqueda = null;
    this.fechaBusqueda = '';
    this.cdr.markForCheck();
  }

  private obtenerFiltrosBusqueda(): resumenCompraFiltros {
    const filtros: resumenCompraFiltros = { activos: true };

    switch (this.criterioBusqueda) {
      case 'codigo': {
        const codigo = this.textoBusqueda.trim();
        if (codigo) filtros.codigo = codigo;
        break;
      }
      case 'proveedorId':
        if (this.proveedorIdBusqueda !== null) {
          filtros.proveedorId = this.proveedorIdBusqueda;
        }
        break;
      case 'fecha':
        if (this.fechaBusqueda) filtros.fecha = this.fechaBusqueda;
        break;
    }

    return filtros;
  }

  private tieneFiltros(filtros: resumenCompraFiltros): boolean {
    return (
      filtros.codigo !== undefined ||
      filtros.proveedorId !== undefined ||
      filtros.fecha !== undefined
    );
  }

  private listarProveedores(): void {
    this.cargandoProveedores = true;
    this.cdr.markForCheck();

    this.servicioProveedor
      .getProveedores(true)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.cargandoProveedores = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (proveedores) => {
          this.proveedores = proveedores;
          this.cdr.markForCheck();
        },
        error: (error) => {
          const mensaje = this.mensajeErrorPara(
            error,
            'No se pudieron cargar los proveedores para la búsqueda.',
          );
          this.mostrarError(error, mensaje);
        },
      });
  }

  seleccionarCompra(id: number): void {
    this.compraSeleccionadaId = id;
    const detalle = this.comprasDetalle.get(id);

    if (detalle) {
      this.detalleCompra = detalle;
      this.errorDetalle = '';
      this.cdr.markForCheck();
      return;
    }

    this.detalleCompra = null;
    if (!this.cargandoDetalle) this.cargarDetalle();
    this.cdr.markForCheck();
  }

  reintentarDetalle(): void {
    if (this.compraSeleccionadaId === null) return;
    this.cargarDetalle();
  }

  abrirComprobante(): void {
    const detalle = this.detalleCompra;
    if (!detalle?.comprobante) return;

    this.modalService.open(ModalDocumento, {
      title: 'Comprobante de compra',
      documento: detalle.comprobante,
      nombreArchivo: `comprobante-${detalle.codigo}`,
    });
  }

  editarCompra(): void {
    if (!this.detalleCompra || this.eliminandoCompra) return;
    this.compraEditar = this.detalleCompra;
    this.mostrarAgregarCompra.set(true);
  }

  async eliminarCompra(): Promise<void> {
    const detalle = this.detalleCompra;
    if (!detalle || this.eliminandoCompra) return;

    this.eliminandoCompra = true;
    this.cdr.markForCheck();

    try {
      const confirmado = await this.popUps.confirmarToast(
        `¿Deseas eliminar la compra ${detalle.codigo}?`,
      );
      if (!confirmado) {
        this.eliminandoCompra = false;
        this.cdr.markForCheck();
        return;
      }
    } catch (error) {
      this.eliminandoCompra = false;
      this.cdr.markForCheck();
      this.popUps.errorDesdeBackend(
        error,
        'No se pudo confirmar la operación. Intente nuevamente.',
      );
      return;
    }

    this.servicioCompra
      .eliminarCompra(detalle.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.eliminandoCompra = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.popUps.exito('Compra eliminada exitosamente.');
          this.comprasDetalle.delete(detalle.id);
          this.detalleCompra = null;
          this.compraSeleccionadaId = null;
          this.listarCompras();
        },
        error: (error) => {
          const mensaje = this.mensajeErrorPara(
            error,
            'No se pudo eliminar la compra. Intente nuevamente.',
          );
          this.mostrarError(error, mensaje);
        },
      });
  }

  abrirModalDetalleMed() {
    this.modalService.open(ModalMasDetalle, {title: 'Agregar detalle de producto'});
  }

  abrirModalCompra() {
    this.compraEditar = null;
    this.mostrarAgregarCompra.set(true);
  }

  cancelarAgregarCompra() {
    this.mostrarAgregarCompra.set(false);
    this.compraEditar = null;
    this.listarCompras();
  }

  finalizarEdicion() {
    this.mostrarAgregarCompra.set(false);
    this.compraEditar = null;
    this.detalleCompra = null;
    this.comprasDetalle.clear();
    this.listarCompras();
  }

  private seleccionarCompraInicial(): void {
    const seleccionActual = this.compraSeleccionadaId;
    const existeSeleccion = this.compras.some((compra) => compra.id === seleccionActual);
    const id = existeSeleccion ? seleccionActual : (this.compras[0]?.id ?? null);

    this.compraSeleccionadaId = id;
    if (id === null) {
      this.detalleCompra = null;
      return;
    }

    this.seleccionarCompra(id);
  }

  private cargarDetalle(): void {
    this.cargandoDetalle = true;
    this.errorDetalle = '';
    this.cdr.markForCheck();

    this.servicioCompra
      .listarCompras()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.cargandoDetalle = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (detalles) => {
          this.comprasDetalle = new Map(detalles.map((detalle) => [detalle.id, detalle]));
          this.detalleCompra =
            this.compraSeleccionadaId === null
              ? null
              : (this.comprasDetalle.get(this.compraSeleccionadaId) ?? null);
          this.cdr.markForCheck();
        },
        error: (error) => {
          this.detalleCompra = null;
          this.errorDetalle = this.mensajeErrorPara(error, this.mensajeErrorDetalle);
          this.cdr.markForCheck();
          this.mostrarError(error, this.errorDetalle);
        },
      });
  }

  private mensajeErrorPara(error: unknown, mensajeDefault: string): string {
    return error instanceof TimeoutError
      ? 'Error de comunicación. El servidor no respondió dentro del tiempo esperado.'
      : mensajeDefault;
  }

  private mostrarError(error: unknown, mensaje: string): void {
    if (error instanceof TimeoutError) {
      this.popUps.error(mensaje);
    } else {
      this.popUps.errorDesdeBackend(error, mensaje);
    }
  }
}
