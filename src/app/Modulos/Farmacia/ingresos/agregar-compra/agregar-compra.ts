import { DecimalPipe, SlicePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  inject,
  output,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule, NgForm } from '@angular/forms';
import { finalize } from 'rxjs';
import { CampoValidado } from '../../../../shared/campo-validado/campo-validado';
import { Paginacion } from '../../../../shared/paginacion/paginacion';
import { PopUps } from '../../../../shared/popUps/popUpsService';
import { TabSwitch } from '../../../../shared/tab-switch/tab-switch';
import { Insumo } from '../../insumos/data/interfazInsumo';
import { ServicioInsumos } from '../../insumos/data/servicio-insumos';
import {
  MedicamentoLogFiltros,
  MedicamentoLogResponse,
} from '../../medicamentos/data/interfaz-medicamento';
import { ServicioMedicamento } from '../../medicamentos/data/servicio-medicamento';
import { proveedorResponse } from '../../proveedores/data/proveedorInterfaz';
import { ProveedorService } from '../../proveedores/data/proveedor-service';
import { CompraRequest, LoteCompraRequest, LoteCompraVista } from './data/interfaz-compra';
import { ServicioCompra } from './data/servicio-compra';

type FiltrosInsumo = { nombre?: string; marcaId?: number; activo?: boolean };

@Component({
  selector: 'app-agregar-compra',
  imports: [TabSwitch, Paginacion, CampoValidado, FormsModule, SlicePipe, DecimalPipe],
  templateUrl: './agregar-compra.html',
  styleUrl: './agregar-compra.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AgregarCompra implements OnInit {
  // ==================== INYECCIONES ====================
  private readonly servicioMedicamento = inject(ServicioMedicamento);
  private readonly servicioInsumos = inject(ServicioInsumos);
  private readonly servicioCompra = inject(ServicioCompra);
  private readonly servicioProveedor = inject(ProveedorService);
  private readonly popUp = inject(PopUps);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  cancelar = output<void>();

  isMedicamento: boolean = true;
  isCargandoProducto: boolean = true;

  // ------------ ESTADO BÚSQUEDA DE PRODUCTOS ------------
  textoBusqueda = '';
  medicamentos: MedicamentoLogResponse[] = [];
  insumos: Insumo[] = [];
  cargandoProductos = false;
  productoSeleccionadoId: number | null = null;
  paginaActual = 1;
  readonly cantidadMostrar = 5;

  get totalRegistros(): number {
    return this.isMedicamento ? this.medicamentos.length : this.insumos.length;
  }

  // ==================== CICLO DE VIDA ====================
  ngOnInit(): void {
    this.listarProductos();
    this.listarProveedores();
  }

  // ==================== TIPO DE PRODUCTO ====================
  cambiarTipoProducto(esMedicamento: boolean): void {
    if (this.hayProductoSeleccionado) return;
    if (this.isMedicamento === esMedicamento) return;

    this.isMedicamento = esMedicamento;
    this.textoBusqueda = '';
    this.paginaActual = 1;
    this.productoSeleccionadoId = null;
    this.listarProductos();
  }

  // ==================== LISTAR ====================
  listarProductos(): void {
    this.cargandoProductos = true;
    this.cdr.markForCheck();

    if (this.isMedicamento) {
      this.servicioMedicamento
        .traerMedicamentoLog(true)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (medicamentos) => this.aplicarMedicamentos(medicamentos),
          error: (err) => this.manejarErrorProductos(err, 'Error al cargar los medicamentos.'),
        });
      return;
    }

    this.servicioInsumos
      .listarInsumos(true)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (insumos) => this.aplicarInsumos(insumos),
        error: (err) => this.manejarErrorProductos(err, 'Error al cargar los insumos.'),
      });
  }

  // ==================== LISTAR PROVEEDORES (PASO 2) ====================
  listarProveedores(): void {
    this.cargandoProveedores = true;
    this.cdr.markForCheck();

    this.servicioProveedor
      .getProveedores(true)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (proveedores) => {
          this.proveedores = proveedores;
          this.cargandoProveedores = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.cargandoProveedores = false;
          this.popUp.errorDesdeBackend(err, 'Error al cargar los proveedores.');
          this.cdr.markForCheck();
        },
      });
  }

  // ==================== BUSCAR ====================
  buscarProductos(): void {
    if (this.hayProductoSeleccionado) return;

    const nombre = this.textoBusqueda.trim();
    this.cargandoProductos = true;
    this.paginaActual = 1;
    this.productoSeleccionadoId = null;
    this.cdr.markForCheck();

    if (this.isMedicamento) {
      const filtros: MedicamentoLogFiltros = { activo: true };
      if (nombre) filtros.nombre = nombre;

      this.servicioMedicamento
        .buscarMedicamentoLog(filtros)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (medicamentos) => this.aplicarMedicamentos(medicamentos),
          error: (err) => this.manejarErrorProductos(err, 'Error al buscar los medicamentos.'),
        });
      return;
    }

    const filtros: FiltrosInsumo = { activo: true };
    if (nombre) filtros.nombre = nombre;

    this.servicioInsumos
      .buscarInsumos(filtros)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (insumos) => this.aplicarInsumos(insumos),
        error: (err) => this.manejarErrorProductos(err, 'Error al buscar los insumos.'),
      });
  }

  // ==================== SELECCIÓN / PAGINACIÓN ====================
  get hayProductoSeleccionado(): boolean {
    return this.productoSeleccionadoId !== null;
  }

  seleccionarProducto(id: number): void {
    if (this.hayProductoSeleccionado) return;

    this.productoSeleccionadoId = id;
    this.cdr.markForCheck();
  }

  deseleccionarProducto(): void {
    this.productoSeleccionadoId = null;
    this.cdr.markForCheck();
  }

  cambiarPagina(pagina: number): void {
    if (this.hayProductoSeleccionado) return;

    this.paginaActual = pagina;
    this.cdr.markForCheck();
  }

  // ==================== HELPERS DE PRODUCTOS ====================
  private aplicarMedicamentos(medicamentos: MedicamentoLogResponse[]): void {
    this.medicamentos = medicamentos;
    this.finalizarCarga();
  }

  private aplicarInsumos(insumos: Insumo[]): void {
    this.insumos = insumos;
    this.finalizarCarga();
  }

  private finalizarCarga(): void {
    this.cargandoProductos = false;
    this.paginaActual = Math.min(
      this.paginaActual,
      Math.max(1, Math.ceil(this.totalRegistros / this.cantidadMostrar)),
    );
    this.cdr.markForCheck();
  }

  private manejarErrorProductos(error: unknown, mensaje: string): void {
    this.cargandoProductos = false;
    this.popUp.errorDesdeBackend(error, mensaje);
    this.cdr.markForCheck();
  }

  // ----------------- GUARDAR ------------------------

  // ------------ ESTADO GENERAL DE LA COMPRA ------------
  proveedorSeleccionadoId: number | null = null;
  archivoComprobante: File | null = null;
  proveedores: proveedorResponse[] = [];
  cargandoProveedores = false;

  /** Total de la compra: suma de los subtotales (cantidad × precio de compra) de todos los lotes. */
  get totalCompra(): number {
    return this.lotes.reduce((total, lote) => total + lote.cantidad * lote.precioCompra, 0);
  }

  /** Productos (lotes) agregados en el paso 1; alimenta el contador de la caja del indicador de pasos. */
  get totalProductosAgregados(): number {
    return this.lotes.length;
  }

  // ------------ VARIABLES DEL LOTE (binding bidireccional con el formulario del paso 1) ------------
  codigoLote = '';
  fechaVencimiento = '';
  precioCompra: number | null = null;
  precioVenta: number | null = null;
  cantidad: number | null = null;

  // ------------ ACUMULADO Y ESTADO DEL ENVÍO ------------
  /** Lotes agregados en el paso 1; se listan en el paso 2 y viajan en `request.lotes`. */
  lotes: LoteCompraVista[] = [];
  /** Verdadero mientras el servicio envía la compra (deshabilita el botón Guardar). */
  guardando = false;

  /**
   * Agrega los datos del lote al acumulado de la compra.
   * Requiere un producto seleccionado y el formulario del paso 1 completo.
   */
  agregarLote(formulario: NgForm): void {
    if (this.productoSeleccionadoId === null) {
      this.popUp.advertencia('Seleccione un medicamento o insumo antes de agregarlo.');
      return;
    }

    if (formulario.invalid) {
      this.popUp.formIncompleto('Complete los datos del lote para continuar.');
      return;
    }

    const producto = this.productoSeleccionado();

    this.lotes.push({
      esMedicamento: this.isMedicamento,
      idItem: this.productoSeleccionadoId,
      codigoLote: this.codigoLote,
      cantidad: this.cantidad!,
      fechaVencimiento: this.fechaVencimiento,
      precioCompra: this.precioCompra!,
      precioVenta: this.precioVenta!,
      // Datos de vista: alimentan la tabla del paso 2 y no se envían al backend (ver `aLoteRequest`)
      nombreItem: producto?.nombre ?? `Producto #${this.productoSeleccionadoId}`,
      descripcionItem: this.descripcionProducto(producto),
    });

    // Se limpia el formulario y se permanece en el paso 1 para seguir agregando productos;
    // el contador de la caja del indicador refleja cuántos productos se llevan agregados.
    this.limpiarLote(formulario);
    this.deseleccionarProducto();
    this.cdr.markForCheck();
  }

  /** Avanza al paso 2 solo si ya hay al menos un lote agregado (botón "Paso 2" del indicador). */
  avanzarAlPaso2(): void {
    if (this.lotes.length === 0) {
      this.popUp.advertencia('Agregue al menos un producto con su lote para continuar.');
      return;
    }

    this.isCargandoProducto = false;
    this.cdr.markForCheck();
  }

  /** Registra la compra: envía los lotes y el comprobante como multipart al backend. */
  guardarCompra(formulario: NgForm): void {
    // No se envía si el formulario está incompleto, ya hay un envío en curso o no hay lotes
    if (formulario?.invalid || this.guardando || this.lotes.length === 0) return;
    if (this.proveedorSeleccionadoId === null) return;

    // Cuerpo JSON de la compra: viaja en la parte `request` del multipart
    const request: CompraRequest = {
      proveedorId: this.proveedorSeleccionadoId,
      lotes: this.lotes.map((lote) => this.aLoteRequest(lote)),
    };

    this.guardando = true;
    this.cdr.markForCheck();

    this.servicioCompra
      .registrarCompra({ request, comprobante: this.archivoComprobante })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.guardando = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.popUp.exito('Compra registrada exitosamente.');
          this.limpiarCompra(formulario);
        },
        error: (error) => this.popUp.errorDesdeBackend(error, 'No se pudo registrar la compra.'),
      });
  }

  /** Limpia el estado de la compra y regresa al paso 1 para registrar otra compra. */
  private limpiarCompra(formulario: NgForm): void {
    formulario.resetForm({ proveedor: null });
    this.proveedorSeleccionadoId = null;
    this.archivoComprobante = null;
    this.lotes = [];
    this.isCargandoProducto = true;
    this.cdr.markForCheck();
  }

  /** Vacía las variables y los controles del formulario del lote (paso 1). */
  private limpiarLote(formulario: NgForm): void {
    // resetForm() escribe los valores por defecto en las variables del binding; se limpian después
    formulario.resetForm();
    this.codigoLote = '';
    this.fechaVencimiento = '';
    this.precioCompra = null;
    this.precioVenta = null;
    this.cantidad = null;
  }

  // ----------------- LISTA Y TOTAL DEL PASO 2 --------------------

  /** Quita de la lista el lote indicado; si la lista queda vacía regresa al paso 1. */
  eliminarLote(index: number): void {
    if (index < 0 || index >= this.lotes.length) return;

    this.lotes.splice(index, 1);
    if (this.lotes.length === 0) {
      this.isCargandoProducto = true;
    }
    this.cdr.markForCheck();
  }

  /** Convierte un lote de la lista del paso 2 en el cuerpo que espera el backend. */
  private aLoteRequest(lote: LoteCompraVista): LoteCompraRequest {
    return {
      esMedicamento: lote.esMedicamento,
      idItem: lote.idItem,
      codigoLote: lote.codigoLote,
      cantidad: lote.cantidad,
      fechaVencimiento: lote.fechaVencimiento,
      precioCompra: lote.precioCompra,
      precioVenta: lote.precioVenta,
    };
  }

  // ----------------- HELPERS DE PRODUCTO --------------------

  /** Producto seleccionado en la tabla del paso 1 (null si no hay selección o ya no está en la lista). */
  private productoSeleccionado(): MedicamentoLogResponse | Insumo | null {
    if (this.productoSeleccionadoId === null) return null;

    return this.isMedicamento
      ? (this.medicamentos.find((med) => med.id === this.productoSeleccionadoId) ?? null)
      : (this.insumos.find((insumo) => insumo.id === this.productoSeleccionadoId) ?? null);
  }

  /** Nombre del producto seleccionado; se muestra en el título del formulario del paso 1. */
  get nombreProductoSeleccionado(): string {
    return this.productoSeleccionado()?.nombre ?? '';
  }

  /** Marca, presentación y concentración del producto, para la columna Producto del paso 2. */
  private descripcionProducto(producto: MedicamentoLogResponse | Insumo | null): string {
    if (producto === null) return '';

    return 'dosis' in producto
      ? this.descripcionMedicamento(producto)
      : this.descripcionInsumo(producto);
  }

  private descripcionMedicamento(medicamento: MedicamentoLogResponse): string {
    const concentracion = `${medicamento.dosis} ${medicamento.unidadMedida}`;

    return [medicamento.marca, medicamento.presentacion, concentracion]
      .filter((parte) => !!parte)
      .join(' · ');
  }

  private descripcionInsumo(insumo: Insumo): string {
    return [insumo.marca?.nombreMarca, insumo.detalle].filter((parte) => !!parte).join(' · ');
  }

  // ----------------- HELPERS PARA ARCHIVOS --------------------
  seleccionarComprobante(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.archivoComprobante = input.files?.[0] ?? null;
  }

  soltarComprobante(event: DragEvent): void {
    event.preventDefault();
    this.archivoComprobante = event.dataTransfer?.files[0] ?? null;
  }

  quitarComprobante(input: HTMLInputElement): void {
    this.archivoComprobante = null;
    input.value = '';
  }
}
