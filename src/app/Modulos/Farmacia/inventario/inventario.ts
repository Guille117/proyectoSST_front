import {
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { TimeoutError, finalize, forkJoin } from 'rxjs';
import { ModalService } from '../../../modal-principal/modal-service';
import { Paginacion } from '../../../shared/paginacion/paginacion';
import { PopUps } from '../../../shared/popUps/popUpsService';
import { TabSwitch } from '../../../shared/tab-switch/tab-switch';
import { CatalogoService } from '../../Catalogos/data/serviceCatalogo';
import { Inter_base } from '../../Catalogos/data/nombreInterfaz';
import { proveedorResponse } from '../proveedores/data/proveedorInterfaz';
import { ProveedorService } from '../proveedores/data/proveedor-service';
import {
  BajaListadoResponse,
  EstadoInventario,
  InventarioFiltros,
  InventarioResponse,
} from './data/interfaz-inventario';
import { ServicioInventario } from './data/servicio-inventario';
import { ModalBajaLote } from './modal-baja-lote/modal-baja-lote';

type CriterioBusqueda = 'nombre' | 'proveedorId' | 'viaAdminId';

interface FiltroEstado {
  valor: EstadoInventario | null;
  etiqueta: string;
}

@Component({
  selector: 'app-inventario',
  imports: [TabSwitch, FormsModule, Paginacion],
  templateUrl: './inventario.html',
  styleUrl: './inventario.scss',
})
export class Inventario implements OnInit {
  private readonly servicioInventario = inject(ServicioInventario);
  private readonly modalService = inject(ModalService);
  private readonly servicioProveedor = inject(ProveedorService);
  private readonly servicioCatalogos = inject(CatalogoService);
  private readonly popUps = inject(PopUps);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  private readonly mensajeErrorInventario =
    'No se pudo cargar el inventario. Intente nuevamente.';
  private readonly diasPorVencer = 30;
  private readonly stockMinimo = 20;

  isMedicamento = true;
  estadoSeleccionado: EstadoInventario | null = null;

  inventario: InventarioResponse[] = [];
  bajas: BajaListadoResponse[] = [];
  paginaActual = 1;
  readonly cantidadMostrar = 10;
  cargandoInventario = false;
  cargandoBajas = false;
  errorInventario = '';
  errorBajas = '';
  revirtiendoBajaId: number | null = null;

  get esVistaBajas(): boolean {
    return this.estadoSeleccionado === 'eliminados';
  }

  get inventarioPaginado(): InventarioResponse[] {
    const inicio = (this.paginaActual - 1) * this.cantidadMostrar;
    return this.inventario.slice(inicio, inicio + this.cantidadMostrar);
  }

  get bajasPaginadas(): BajaListadoResponse[] {
    const inicio = (this.paginaActual - 1) * this.cantidadMostrar;
    return this.bajas.slice(inicio, inicio + this.cantidadMostrar);
  }

  proveedores: proveedorResponse[] = [];
  viasAdmin: Inter_base[] = [];
  cargandoCatalogos = false;

  criterioBusqueda: CriterioBusqueda = 'nombre';
  textoBusqueda = '';
  proveedorIdBusqueda: number | null = null;
  viaAdminIdBusqueda: number | null = null;

  private versionInventario = 0;
  private totalesPorCodigo = new Map<string, number>();

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

  readonly estados: FiltroEstado[] = [
    { valor: null, etiqueta: 'Todos' },
    { valor: 'vencidos', etiqueta: 'Vencidos' },
    { valor: 'por-vencer', etiqueta: 'Por vencer' },
    { valor: 'stock-bajo', etiqueta: 'Stock bajo' },
    { valor: 'sin-stock', etiqueta: 'Sin stock' },
    { valor: 'eliminados', etiqueta: 'Eliminados' },
  ];

  ngOnInit(): void {
    this.cargarCatalogos();
    this.listarInventario();
  }

  cambiarTipoProducto(esMedicamento: boolean): void {
    if (this.isMedicamento === esMedicamento) return;

    this.isMedicamento = esMedicamento;
    if (!esMedicamento) {
      this.viaAdminIdBusqueda = null;
      if (this.criterioBusqueda === 'viaAdminId') {
        this.criterioBusqueda = 'nombre';
        this.textoBusqueda = '';
      }
    }

    this.paginaActual = 1;
    this.listarInventario();
  }

  seleccionarEstado(estado: EstadoInventario | null): void {
    this.estadoSeleccionado =
      estado === null || this.estadoSeleccionado === estado ? null : estado;

    if (this.estadoSeleccionado === 'eliminados' && this.criterioBusqueda !== 'nombre') {
      this.criterioBusqueda = 'nombre';
      this.textoBusqueda = '';
      this.proveedorIdBusqueda = null;
      this.viaAdminIdBusqueda = null;
    }

    this.paginaActual = 1;
    this.listarInventario();
  }

  buscarInventario(): void {
    this.paginaActual = 1;
    this.listarInventario();
  }

  cambiarPagina(pagina: number): void {
    if (pagina < 1) return;
    this.paginaActual = pagina;
    this.cdr.markForCheck();
  }

  abrirModalBaja(item: InventarioResponse): void {
    this.modalService.open(ModalBajaLote, {
      title: 'Eliminar lote',
      modalClass: 'modal-ancho',
      lote: item,
      onGuardado: () => this.listarInventario(),
    });
  }

  cambiarCriterioBusqueda(): void {
    this.textoBusqueda = '';
    this.proveedorIdBusqueda = null;
    this.viaAdminIdBusqueda = null;
    this.cdr.markForCheck();
  }

  reintentar(): void {
    this.listarInventario();
  }

  formatearFecha(fecha: string | null): string {
    if (!fecha) return '—';

    const [fechaParte] = fecha.split('T');
    const [anio, mes, dia] = fechaParte.split('-').map(Number);

    if (!anio || !mes || !dia || mes < 1 || mes > 12) return fecha;

    return `${this.meses[mes - 1]} ${dia}, ${anio}`;
  }

  resumirTexto(texto: string | null | undefined, maxCaracteres = 34): string {
    const limpio = texto?.trim();
    if (!limpio) return '—';
    if (limpio.length <= maxCaracteres) return limpio;

    const recorte = limpio.slice(0, maxCaracteres).trimEnd();
    const ultimoEspacio = recorte.lastIndexOf(' ');
    const base = ultimoEspacio > 0 ? recorte.slice(0, ultimoEspacio) : recorte;

    return `${base}...`;
  }

  esTextoTruncado(texto: string | null | undefined, maxCaracteres = 34): boolean {
    const limpio = texto?.trim();
    return !!limpio && limpio.length > maxCaracteres;
  }

  esFechaVencida(fecha: string | null): boolean {
    const valor = this.fechaComoDate(fecha);
    return valor !== null && valor < this.fechaHoy();
  }

  esFechaPorVencer(fecha: string | null): boolean {
    const valor = this.fechaComoDate(fecha);
    if (valor === null) return false;

    const hoy = this.fechaHoy();
    const limite = new Date(hoy);
    limite.setDate(limite.getDate() + this.diasPorVencer);

    return valor >= hoy && valor <= limite;
  }

  esStockBajo(item: InventarioResponse): boolean {
    if (item.disponible <= 0 || this.esFechaVencida(item.fechaVencimiento)) return false;

    const total = this.totalesPorCodigo.get(item.codigo) ?? item.disponible;
    return total <= this.stockMinimo;
  }

  esSinStock(item: InventarioResponse): boolean {
    return item.disponible === 0;
  }

  private fechaComoDate(fecha: string | null): Date | null {
    if (!fecha) return null;

    const [fechaParte] = fecha.split('T');
    const [anio, mes, dia] = fechaParte.split('-').map(Number);
    if (!anio || !mes || !dia) return null;

    return new Date(anio, mes - 1, dia);
  }

  private fechaHoy(): Date {
    const hoy = new Date();
    return new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  }

  private cargarCatalogos(): void {
    this.cargandoCatalogos = true;
    this.cdr.markForCheck();

    forkJoin({
      proveedores: this.servicioProveedor.getProveedores(true),
      viasAdmin: this.servicioCatalogos.listar<Inter_base>('viaAdmin'),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.cargandoCatalogos = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: ({ proveedores, viasAdmin }) => {
          this.proveedores = proveedores;
          this.viasAdmin = viasAdmin;
          this.cdr.markForCheck();
        },
        error: (error) => {
          const mensaje = this.mensajeErrorPara(
            error,
            'No se pudieron cargar los filtros del inventario.',
          );
          this.mostrarError(error, mensaje);
        },
      });
  }

  private listarInventario(): void {
    if (this.esVistaBajas) {
      this.listarBajasEliminadas();
      return;
    }

    const version = ++this.versionInventario;
    this.cargandoInventario = true;
    this.errorInventario = '';
    this.cdr.markForCheck();

    this.servicioInventario
      .listarInventario(this.obtenerFiltros())
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (version !== this.versionInventario) return;
          this.cargandoInventario = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (inventario) => {
          if (version !== this.versionInventario) return;
          this.inventario = inventario;
          this.totalesPorCodigo = this.calcularTotalesPorCodigo(inventario);
          this.paginaActual = Math.min(
            this.paginaActual,
            Math.max(1, Math.ceil(inventario.length / this.cantidadMostrar)),
          );
          this.cdr.markForCheck();
        },
        error: (error) => {
          if (version !== this.versionInventario) return;
          this.inventario = [];
          this.totalesPorCodigo.clear();
          this.errorInventario = this.mensajeErrorPara(error, this.mensajeErrorInventario);
          this.cdr.markForCheck();
          this.mostrarError(error, this.errorInventario);
        },
      });
  }

  private listarBajasEliminadas(): void {
    const version = ++this.versionInventario;
    this.cargandoBajas = true;
    this.errorBajas = '';
    this.cdr.markForCheck();

    this.servicioInventario
      .listarBajas(this.isMedicamento ? 'medicamento' : 'insumo')
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (version !== this.versionInventario) return;
          this.cargandoBajas = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (bajas) => {
          if (version !== this.versionInventario) return;
          const texto =
            this.criterioBusqueda === 'nombre'
              ? this.textoBusqueda.trim().toLowerCase()
              : '';

          this.bajas = bajas.filter(
            (baja) => !texto || baja.producto.toLowerCase().includes(texto),
          );
          this.paginaActual = Math.min(
            this.paginaActual,
            Math.max(1, Math.ceil(this.bajas.length / this.cantidadMostrar)),
          );
          this.cdr.markForCheck();
        },
        error: (error) => {
          if (version !== this.versionInventario) return;
          this.bajas = [];
          this.errorBajas = this.mensajeErrorPara(
            error,
            'No se pudieron cargar las bajas de medicamentos. Intente nuevamente.',
          );
          this.cdr.markForCheck();
          this.mostrarError(error, this.errorBajas);
        },
      });
  }

  async revertirBaja(baja: BajaListadoResponse): Promise<void> {
    if (this.revirtiendoBajaId !== null) return;

    this.revirtiendoBajaId = baja.idBaja;
    this.cdr.markForCheck();

    try {
      const confirmado = await this.popUps.confirmarToast(
        `¿Deseas revertir la baja de ${baja.producto} del lote ${baja.lote}?`,
      );
      if (!confirmado) {
        this.revirtiendoBajaId = null;
        this.cdr.markForCheck();
        return;
      }
    } catch (error) {
      this.revirtiendoBajaId = null;
      this.cdr.markForCheck();
      this.popUps.errorDesdeBackend(
        error,
        'No se pudo confirmar la operación. Intente nuevamente.',
      );
      return;
    }

    this.servicioInventario
      .revertirBaja(baja.idBaja)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.revirtiendoBajaId = null;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.popUps.exito('Baja revertida exitosamente.');
          this.listarInventario();
        },
        error: (error) => {
          const mensaje = this.mensajeErrorPara(
            error,
            'No se pudo revertir la baja. Intente nuevamente.',
          );
          this.mostrarError(error, mensaje);
        },
      });
  }

  private obtenerFiltros(): InventarioFiltros {
    const filtros: InventarioFiltros = {
      tipo: this.isMedicamento ? 'medicamento' : 'insumo',
      activos: this.estadoSeleccionado !== 'eliminados',
    };

    if (this.estadoSeleccionado) {
      filtros.estadoInventario = this.estadoSeleccionado;
    }

    switch (this.criterioBusqueda) {
      case 'nombre': {
        const nombre = this.textoBusqueda.trim();
        if (nombre) filtros.nombre = nombre;
        break;
      }
      case 'proveedorId':
        if (this.proveedorIdBusqueda !== null) {
          filtros.proveedorId = this.proveedorIdBusqueda;
        }
        break;
      case 'viaAdminId':
        if (this.isMedicamento && this.viaAdminIdBusqueda !== null) {
          filtros.viaAdminId = this.viaAdminIdBusqueda;
        }
        break;
    }

    return filtros;
  }

  /** Suma el stock disponible de los lotes vigentes con el mismo código de producto. */
  private calcularTotalesPorCodigo(inventario: InventarioResponse[]): Map<string, number> {
    const totales = new Map<string, number>();

    for (const item of inventario) {
      if (this.esFechaVencida(item.fechaVencimiento)) continue;
      totales.set(item.codigo, (totales.get(item.codigo) ?? 0) + item.disponible);
    }

    return totales;
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
