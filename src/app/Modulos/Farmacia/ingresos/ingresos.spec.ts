import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, of } from 'rxjs';
import { ModalService } from '../../../modal-principal/modal-service';
import { PopUps } from '../../../shared/popUps/popUpsService';
import { VisorArchivos } from '../../../shared/visor-archivos/visor-archivos';
import { ServicioInsumos } from '../insumos/data/servicio-insumos';
import { ServicioMedicamento } from '../medicamentos/data/servicio-medicamento';
import { proveedorResponse } from '../proveedores/data/proveedorInterfaz';
import { ProveedorService } from '../proveedores/data/proveedor-service';
import {
  detalleCompraResponse,
  resumenCompraFiltros,
  resumenCompraResponse,
} from './agregar-compra/data/interfaz-compra';
import { ServicioCompra } from './agregar-compra/data/servicio-compra';

import { Ingresos } from './ingresos';

describe('Ingresos', () => {
  let component: Ingresos;
  let fixture: ComponentFixture<Ingresos>;

  const servicioMedicamento = {
    traerMedicamentoLog: vi.fn(() => of([])),
    buscarMedicamentoLog: vi.fn(() => of([])),
  };
  const servicioInsumos = {
    listarInsumos: vi.fn(() => of([])),
    buscarInsumos: vi.fn(() => of([])),
  };
  const servicioCompra = {
    listarComprasResumen: vi.fn<() => Observable<resumenCompraResponse[]>>(() => of([])),
    buscarComprasResumen: vi.fn<
      (filtros: resumenCompraFiltros) => Observable<resumenCompraResponse[]>
    >(() => of([])),
    listarCompras: vi.fn<() => Observable<detalleCompraResponse[]>>(() => of([])),
    eliminarCompra: vi.fn<(id: number) => Observable<void>>(() => of(void 0)),
  };
  const servicioProveedor = {
    getProveedores: vi.fn<(activos: boolean) => Observable<proveedorResponse[]>>(() => of([])),
  };
  const popUp = {
    errorDesdeBackend: vi.fn(),
    error: vi.fn(),
    exito: vi.fn(),
    confirmarToast: vi.fn(async () => true),
  };

  const resumenCompra: resumenCompraResponse = {
    id: 1,
    codigo: 'COMP-001',
    proveedor: 'Proveedor de ejemplo',
    fecha: '2026-10-16T10:30:00',
    cantidadProductos: 50,
    total: 500,
  };

  const detalleCompra: detalleCompraResponse = {
    id: 1,
    codigo: 'COMP-001',
    total: 500,
    comprobante: 'http://localhost:8080/api/v1/compras/1/comprobante',
    estado: true,
    proveedorId: 3,
    proveedorNombre: 'Proveedor de ejemplo',
    fecha: '2026-10-16T10:30:00',
    lotes: [
      {
        id: 10,
        codigoLote: 'LOTE-AMOX-001',
        cantidad: 50,
        disponible: 40,
        estado: true,
        fechaVencimiento: '2027-10-16',
        precioCompra: 10,
        precioVenta: 15,
        total: 500,
        idInsumoLog: null,
        nombreInsumo: null,
        idMedicamentoLog: 9,
        nombreMedicamento: 'Amoxicilina Genfar Caja x 12 500mg',
        idCompra: 1,
        codigoCompra: 'COMP-001',
      },
    ],
  };

  beforeEach(async () => {
    servicioMedicamento.traerMedicamentoLog.mockReset();
    servicioMedicamento.traerMedicamentoLog.mockReturnValue(of([]));
    servicioMedicamento.buscarMedicamentoLog.mockReset();
    servicioMedicamento.buscarMedicamentoLog.mockReturnValue(of([]));
    servicioInsumos.listarInsumos.mockReset();
    servicioInsumos.listarInsumos.mockReturnValue(of([]));
    servicioInsumos.buscarInsumos.mockReset();
    servicioInsumos.buscarInsumos.mockReturnValue(of([]));
    servicioCompra.listarComprasResumen.mockReset();
    servicioCompra.listarComprasResumen.mockReturnValue(of([]));
    servicioCompra.buscarComprasResumen.mockReset();
    servicioCompra.buscarComprasResumen.mockReturnValue(of([]));
    servicioCompra.listarCompras.mockReset();
    servicioCompra.listarCompras.mockReturnValue(of([]));
    servicioCompra.eliminarCompra.mockReset();
    servicioCompra.eliminarCompra.mockReturnValue(of(void 0));
    servicioProveedor.getProveedores.mockReset();
    servicioProveedor.getProveedores.mockReturnValue(of([]));
    popUp.errorDesdeBackend.mockReset();
    popUp.error.mockReset();
    popUp.exito.mockReset();
    popUp.confirmarToast.mockReset();
    popUp.confirmarToast.mockResolvedValue(true);

    await TestBed.configureTestingModule({
      imports: [Ingresos],
      providers: [
        { provide: ServicioMedicamento, useValue: servicioMedicamento },
        { provide: ServicioInsumos, useValue: servicioInsumos },
        { provide: ServicioCompra, useValue: servicioCompra },
        { provide: ProveedorService, useValue: servicioProveedor },
        { provide: PopUps, useValue: popUp },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Ingresos);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('replaces the ingresos view with AgregarCompra when registering a purchase', () => {
    const registerButton: HTMLButtonElement =
      fixture.nativeElement.querySelector('.btn._principal');

    registerButton.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-agregar-compra')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.detalle-compra')).toBeNull();
  });

  it('returns to ingresos with the return button', () => {
    const registerButton: HTMLButtonElement =
      fixture.nativeElement.querySelector('.btn._principal');
    registerButton.click();
    fixture.detectChanges();

    const returnButton: HTMLButtonElement =
      fixture.nativeElement.querySelector('button.boton-regresar');
    returnButton.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-agregar-compra')).toBeNull();
    expect(fixture.nativeElement.querySelector('.detalle-compra')).toBeTruthy();
  });

  it('muestra el resumen de compras devuelto por el backend', () => {
    servicioCompra.listarComprasResumen.mockReturnValue(of([resumenCompra]));

    const fixtureResumen = TestBed.createComponent(Ingresos);
    fixtureResumen.detectChanges();

    const fila: HTMLElement = fixtureResumen.nativeElement.querySelector('tbody tr');
    expect(fila.textContent).toContain('COMP-001');
    expect(fila.textContent).toContain('Proveedor de ejemplo');
    expect(fila.textContent).toContain('octubre 16, 2026');
    expect(fila.textContent).toContain('50');
    expect(fila.textContent).toContain('Q 500.00');

    fixtureResumen.destroy();
  });

  it('muestra el detalle de la compra seleccionada y habilita el comprobante', () => {
    servicioCompra.listarComprasResumen.mockReturnValue(of([resumenCompra]));
    servicioCompra.listarCompras.mockReturnValue(of([detalleCompra]));

    const fixtureDetalle = TestBed.createComponent(Ingresos);
    fixtureDetalle.detectChanges();

    const detalle: HTMLElement = fixtureDetalle.nativeElement.querySelector('.detalle-card');
    expect(detalle.textContent).toContain('COMP-001');
    expect(detalle.textContent).toContain('Proveedor de ejemplo');
    expect(detalle.textContent).toContain('LOTE-AMOX-001');
    expect(detalle.textContent).toContain('Amoxicilina Genfar Caja x 12 500mg');
    expect(detalle.textContent).toContain('Q 500.00');

    const botonComprobante = Array.from(
      detalle.querySelectorAll<HTMLButtonElement>('.acciones-compra button'),
    ).find((boton) => boton.textContent?.includes('Ver Comprobante'));
    expect(botonComprobante?.disabled).toBe(false);

    fixtureDetalle.destroy();
  });

  it('deshabilita el comprobante cuando la compra no lo tiene', () => {
    servicioCompra.listarComprasResumen.mockReturnValue(of([resumenCompra]));
    servicioCompra.listarCompras.mockReturnValue(
      of([{ ...detalleCompra, comprobante: null }]),
    );

    const fixtureSinComprobante = TestBed.createComponent(Ingresos);
    fixtureSinComprobante.detectChanges();

    const detalleSinComprobante: HTMLElement =
      fixtureSinComprobante.nativeElement.querySelector('.detalle-compra');
    const botonComprobante = Array.from(
      detalleSinComprobante.querySelectorAll<HTMLButtonElement>('.acciones-compra button'),
    ).find((boton) => boton.textContent?.includes('Ver Comprobante'));
    expect(botonComprobante?.disabled).toBe(true);

    fixtureSinComprobante.destroy();
  });

  it('actualiza el detalle al seleccionar otra compra de la tabla', () => {
    const segundoResumen: resumenCompraResponse = {
      ...resumenCompra,
      id: 3,
      codigo: 'COM-2',
      proveedor: 'distribuidora 3',
      total: 362.5,
    };
    const segundoDetalle: detalleCompraResponse = {
      ...detalleCompra,
      id: 3,
      codigo: 'COM-2',
      proveedorId: 3,
      proveedorNombre: 'distribuidora 3',
      total: 362.5,
      lotes: [
        {
          ...detalleCompra.lotes[0],
          id: 3,
          codigoLote: 'A3',
          nombreMedicamento: 'Amoxicilina Pfizer Tabletas 500mg',
          total: 62.5,
        },
      ],
    };
    servicioCompra.listarComprasResumen.mockReturnValue(of([resumenCompra, segundoResumen]));
    servicioCompra.listarCompras.mockReturnValue(of([detalleCompra, segundoDetalle]));

    const fixtureSeleccion = TestBed.createComponent(Ingresos);
    fixtureSeleccion.detectChanges();

    const filas: NodeListOf<HTMLTableRowElement> =
      fixtureSeleccion.nativeElement.querySelectorAll('.table-container tbody tr');
    expect(filas).toHaveLength(2);

    filas[1].click();
    fixtureSeleccion.detectChanges();

    const detalle: HTMLElement =
      fixtureSeleccion.nativeElement.querySelector('.detalle-card');
    expect(detalle.textContent).toContain('COM-2');
    expect(detalle.textContent).toContain('distribuidora 3');
    expect(detalle.textContent).toContain('A3');

    fixtureSeleccion.destroy();
  });

  it('abre el modal del comprobante al hacer clic en Ver Comprobante', () => {
    servicioCompra.listarComprasResumen.mockReturnValue(of([resumenCompra]));
    servicioCompra.listarCompras.mockReturnValue(of([detalleCompra]));

    const fixtureComprobante = TestBed.createComponent(Ingresos);
    fixtureComprobante.detectChanges();

    const modalService = TestBed.inject(ModalService);
    const abrirModal = vi.spyOn(modalService, 'open');

    const detalle: HTMLElement =
      fixtureComprobante.nativeElement.querySelector('.detalle-card');
    const botonComprobante = Array.from(
      detalle.querySelectorAll<HTMLButtonElement>('.acciones-compra button'),
    ).find((boton) => boton.textContent?.includes('Ver Comprobante'));
    botonComprobante?.click();

    expect(abrirModal).toHaveBeenCalledWith(
      VisorArchivos,
      expect.objectContaining({
        title: 'Comprobante de compra',
        modalClass: 'modal-visor-documentos',
        archivos: [
          expect.objectContaining({
            id: detalleCompra.comprobante,
            nombreOriginal: `comprobante-${detalleCompra.codigo}`,
          }),
        ],
        cargarArchivo: expect.any(Function),
      }),
    );

    fixtureComprobante.destroy();
  });

  it('confirma y elimina la compra seleccionada', async () => {
    servicioCompra.listarComprasResumen.mockReturnValue(of([resumenCompra]));
    servicioCompra.listarCompras.mockReturnValue(of([detalleCompra]));

    const fixtureEliminar = TestBed.createComponent(Ingresos);
    fixtureEliminar.detectChanges();

    const detalle: HTMLElement = fixtureEliminar.nativeElement.querySelector('.detalle-card');
    const botonEliminar = Array.from(
      detalle.querySelectorAll<HTMLButtonElement>('.acciones-compra button'),
    ).find((boton) => boton.getAttribute('title') === 'Eliminar compra');
    expect(botonEliminar).toBeTruthy();

    await fixtureEliminar.componentInstance.eliminarCompra();

    expect(popUp.confirmarToast).toHaveBeenCalledWith(
      '¿Deseas eliminar la compra COMP-001?',
    );
    expect(servicioCompra.eliminarCompra).toHaveBeenCalledWith(1);
    expect(popUp.exito).toHaveBeenCalledWith('Compra eliminada exitosamente.');

    fixtureEliminar.destroy();
  });

  it('no elimina la compra si se cancela la confirmación', async () => {
    servicioCompra.listarComprasResumen.mockReturnValue(of([resumenCompra]));
    servicioCompra.listarCompras.mockReturnValue(of([detalleCompra]));
    popUp.confirmarToast.mockResolvedValue(false);

    const fixtureCancelar = TestBed.createComponent(Ingresos);
    fixtureCancelar.detectChanges();

    await fixtureCancelar.componentInstance.eliminarCompra();

    expect(servicioCompra.eliminarCompra).not.toHaveBeenCalled();
    expect(fixtureCancelar.componentInstance.eliminandoCompra).toBe(false);

    fixtureCancelar.destroy();
  });

  it('busca compras por código y envía activos=true', () => {
    servicioCompra.buscarComprasResumen.mockReturnValue(of([resumenCompra]));

    const fixtureBusqueda = TestBed.createComponent(Ingresos);
    fixtureBusqueda.detectChanges();
    const componentBusqueda = fixtureBusqueda.componentInstance;
    componentBusqueda.criterioBusqueda = 'codigo';
    componentBusqueda.textoBusqueda = '  COM-1  ';

    componentBusqueda.buscarCompras();

    expect(servicioCompra.buscarComprasResumen).toHaveBeenCalledWith({
      codigo: 'COM-1',
      activos: true,
    });
    expect(componentBusqueda.compras).toEqual([resumenCompra]);

    fixtureBusqueda.destroy();
  });

  it('busca compras por proveedor y por fecha', () => {
    const fixtureBusqueda = TestBed.createComponent(Ingresos);
    fixtureBusqueda.detectChanges();
    const componentBusqueda = fixtureBusqueda.componentInstance;

    componentBusqueda.criterioBusqueda = 'proveedorId';
    componentBusqueda.proveedorIdBusqueda = 3;
    componentBusqueda.buscarCompras();

    expect(servicioCompra.buscarComprasResumen).toHaveBeenCalledWith({
      proveedorId: 3,
      activos: true,
    });

    componentBusqueda.criterioBusqueda = 'fecha';
    componentBusqueda.cambiarCriterioBusqueda();
    componentBusqueda.fechaBusqueda = '2026-10-09';
    componentBusqueda.buscarCompras();

    expect(servicioCompra.buscarComprasResumen).toHaveBeenCalledWith({
      fecha: '2026-10-09',
      activos: true,
    });

    fixtureBusqueda.destroy();
  });

  it('sin criterio vuelve a consultar el resumen general', () => {
    const fixtureBusqueda = TestBed.createComponent(Ingresos);
    fixtureBusqueda.detectChanges();
    const componentBusqueda = fixtureBusqueda.componentInstance;
    const llamadasIniciales = servicioCompra.listarComprasResumen.mock.calls.length;

    componentBusqueda.textoBusqueda = '';
    componentBusqueda.buscarCompras();

    expect(servicioCompra.buscarComprasResumen).not.toHaveBeenCalled();
    expect(servicioCompra.listarComprasResumen.mock.calls.length).toBe(
      llamadasIniciales + 1,
    );

    fixtureBusqueda.destroy();
  });

  it('alterna entre compras activas y eliminadas', () => {
    const fixtureFiltro = TestBed.createComponent(Ingresos);
    fixtureFiltro.detectChanges();
    const componentFiltro = fixtureFiltro.componentInstance;

    componentFiltro.cambiarFiltroEstado(false);

    expect(componentFiltro.mostrarActivos).toBe(false);
    expect(servicioCompra.listarComprasResumen).toHaveBeenLastCalledWith(false);

    componentFiltro.cambiarFiltroEstado(true);

    expect(componentFiltro.mostrarActivos).toBe(true);
    expect(servicioCompra.listarComprasResumen).toHaveBeenLastCalledWith(true);

    fixtureFiltro.destroy();
  });

  it('aplica el estado seleccionado a la busqueda de compras', () => {
    const fixtureFiltro = TestBed.createComponent(Ingresos);
    fixtureFiltro.detectChanges();
    const componentFiltro = fixtureFiltro.componentInstance;

    componentFiltro.cambiarFiltroEstado(false);
    componentFiltro.criterioBusqueda = 'codigo';
    componentFiltro.textoBusqueda = 'COM-1';
    componentFiltro.buscarCompras();

    expect(servicioCompra.buscarComprasResumen).toHaveBeenCalledWith({
      codigo: 'COM-1',
      activos: false,
    });

    fixtureFiltro.destroy();
  });
});
