import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgForm } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { Observable, Subject, of, throwError } from 'rxjs';
import { PopUps } from '../../../../shared/popUps/popUpsService';
import { Insumo } from '../../insumos/data/interfazInsumo';
import { ServicioInsumos } from '../../insumos/data/servicio-insumos';
import {
  MedicamentoLogFiltros,
  MedicamentoLogResponse,
} from '../../medicamentos/data/interfaz-medicamento';
import { ServicioMedicamento } from '../../medicamentos/data/servicio-medicamento';
import { proveedorResponse } from '../../proveedores/data/proveedorInterfaz';
import { ProveedorService } from '../../proveedores/data/proveedor-service';

import { AgregarCompra } from './agregar-compra';
import { CompraMultipartRequest, detalleCompraResponse } from './data/interfaz-compra';
import { ServicioCompra } from './data/servicio-compra';

describe('AgregarCompra', () => {
  let component: AgregarCompra;
  let fixture: ComponentFixture<AgregarCompra>;

  const servicioMedicamento = {
    traerMedicamentoLog: vi.fn<(activo: boolean) => Observable<MedicamentoLogResponse[]>>(() =>
      of([]),
    ),
    buscarMedicamentoLog: vi.fn<
      (filtros: MedicamentoLogFiltros) => Observable<MedicamentoLogResponse[]>
    >(() => of([])),
  };
  const servicioInsumos = {
    listarInsumos: vi.fn<(activo: boolean) => Observable<Insumo[]>>(() => of([])),
    buscarInsumos: vi.fn<
      (filtros: { nombre?: string; marcaId?: number; activo?: boolean }) => Observable<Insumo[]>
    >(() => of([])),
  };
  const servicioCompra = {
    registrarCompra: vi.fn<(compra: CompraMultipartRequest) => Observable<void>>(() => of(void 0)),
    actualizarCompra: vi.fn<(id: number, compra: CompraMultipartRequest) => Observable<void>>(() =>
      of(void 0),
    ),
  };
  const servicioProveedor = {
    getProveedores: vi.fn<(activos: boolean) => Observable<proveedorResponse[]>>(() => of([])),
  };
  const popUp = {
    exito: vi.fn(),
    advertencia: vi.fn(),
    formIncompleto: vi.fn(),
    errorDesdeBackend: vi.fn(),
    error: vi.fn(),
    confirmarToast: vi.fn(async () => true),
  };

  const medicamento: MedicamentoLogResponse = {
    id: 1,
    nombre: 'Amoxicilina',
    dosis: 500,
    marca: 'Genfar',
    presentacion: 'Cápsula',
    viaAdministracion: 'Oral',
    unidadMedida: 'mg',
    estado: true,
  };
  const insumo: Insumo = {
    id: 5,
    nombre: 'Guantes',
    marca: { idMarca: 1, nombreMarca: 'Acme' },
    detalle: 'Desechables',
    estado: true,
  };
  const proveedor: proveedorResponse = {
    id: 2,
    codigo: 'PRV-002',
    nombre: 'Distribuidora Salud',
    nit: '1234567-8',
    telefono: '5555-5555',
    email: 'ventas@distribuidora.com',
    estado: true,
  };

  const otroProveedor: proveedorResponse = {
    ...proveedor,
    id: 3,
    codigo: 'PRV-003',
    nombre: 'Farmacia Central',
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
    servicioCompra.registrarCompra.mockReset();
    servicioCompra.registrarCompra.mockReturnValue(of(void 0));
    servicioCompra.actualizarCompra.mockReset();
    servicioCompra.actualizarCompra.mockReturnValue(of(void 0));
    servicioProveedor.getProveedores.mockReset();
    servicioProveedor.getProveedores.mockReturnValue(of([]));
    popUp.exito.mockReset();
    popUp.advertencia.mockReset();
    popUp.formIncompleto.mockReset();
    popUp.errorDesdeBackend.mockReset();
    popUp.error.mockReset();
    popUp.confirmarToast.mockReset();
    popUp.confirmarToast.mockResolvedValue(true);

    await TestBed.configureTestingModule({
      imports: [AgregarCompra],
      providers: [
        { provide: ServicioMedicamento, useValue: servicioMedicamento },
        { provide: ServicioInsumos, useValue: servicioInsumos },
        { provide: ServicioCompra, useValue: servicioCompra },
        { provide: ProveedorService, useValue: servicioProveedor },
        { provide: PopUps, useValue: popUp },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AgregarCompra);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  /** Formulario presente en el DOM: el del paso 1 o el del paso 2 según el estado actual. */
  const formularioVisible = (): NgForm => {
    const selector = fixture.nativeElement.querySelector('.trabajoArea2 form')
      ? '.trabajoArea2 form'
      : '.paso2 form';

    return fixture.debugElement.query(By.css(selector)).injector.get(NgForm);
  };

  /** Escribe los campos del lote por `name` en el formulario del paso 1 y actualiza la vista. */
  const escribirLote = (valores: Record<string, string>): void => {
    for (const [name, valor] of Object.entries(valores)) {
      const input: HTMLInputElement = fixture.nativeElement.querySelector(`[name="${name}"]`);
      input.value = valor;
      input.dispatchEvent(new Event('input'));
    }
    fixture.detectChanges();
  };

  /** Carga el medicamento de prueba en la tabla del paso 1 (da nombre al lote que se agrega). */
  const cargarMedicamentos = (): void => {
    servicioMedicamento.traerMedicamentoLog.mockReturnValue(of([medicamento]));
    component.listarProductos();
    fixture.detectChanges();
  };

  /** Crea una instancia del componente en modo edición con la compra indicada. */
  const crearFixtureEdicion = (
    compra: detalleCompraResponse = compraDetalle,
  ): ComponentFixture<AgregarCompra> => {
    const editFixture = TestBed.createComponent(AgregarCompra);
    editFixture.componentRef.setInput('compraEdicion', compra);
    editFixture.detectChanges();
    return editFixture;
  };

  const loteCompleto: Record<string, string> = {
    nombre: 'LOTE-001',
    concentracion: '2027-05-31',
    precioCompra: '10',
    precioVenta: '15',
    cantidad: '20',
  };

  const loteEsperado = {
    esMedicamento: true,
    idItem: medicamento.id,
    codigoLote: 'LOTE-001',
    cantidad: 20,
    fechaVencimiento: '2027-05-31',
    precioCompra: 10,
    precioVenta: 15,
  };

  /** Lote tal como queda en la lista del paso 2: los datos del request más los de la tabla. */
  const loteVista = {
    ...loteEsperado,
    nombreItem: medicamento.nombre,
    descripcionItem: 'Genfar · Cápsula · 500 mg',
  };

  const compraDetalle: detalleCompraResponse = {
    id: 1,
    codigo: 'COMP-001',
    total: 500,
    comprobante: 'http://localhost:8080/api/v1/compras/1/comprobante',
    estado: true,
    proveedorId: proveedor.id,
    proveedorNombre: proveedor.nombre,
    fecha: '2026-10-16T10:30:00',
    lotes: [
      {
        id: 10,
        codigoLote: 'LOTE-001',
        cantidad: 50,
        disponible: 40,
        estado: true,
        fechaVencimiento: '2027-10-16',
        precioCompra: 10,
        precioVenta: 15,
        total: 500,
        idInsumoLog: null,
        nombreInsumo: null,
        idMedicamentoLog: medicamento.id,
        nombreMedicamento: medicamento.nombre,
        idCompra: 1,
        codigoCompra: 'COMP-001',
      },
    ],
  };

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('navigates between purchase steps with the step buttons', () => {
    const [stepOne, stepTwo] = fixture.nativeElement.querySelectorAll('button.paso-compra');

    expect(stepOne).toBeInstanceOf(HTMLButtonElement);
    expect(stepOne.classList.contains('activo')).toBe(true);

    // Sin lotes agregados el paso 2 no se habilita y se avisa al usuario
    stepTwo.click();
    fixture.detectChanges();

    expect(component.isCargandoProducto).toBe(true);
    expect(stepTwo.classList.contains('activo')).toBe(false);
    expect(popUp.advertencia).toHaveBeenCalledWith(
      'Agregue al menos un producto con su lote para continuar.',
    );

    // Con un lote agregado sí se puede avanzar al paso 2
    component.seleccionarProducto(medicamento.id);
    escribirLote(loteCompleto);
    component.agregarLote(formularioVisible());
    fixture.detectChanges();

    stepTwo.click();
    fixture.detectChanges();

    expect(component.isCargandoProducto).toBe(false);
    expect(stepTwo.classList.contains('activo')).toBe(true);

    stepOne.click();
    fixture.detectChanges();

    expect(component.isCargandoProducto).toBe(true);
    expect(stepOne.classList.contains('activo')).toBe(true);
  });

  it('requires expiration only for medications before enabling save', () => {
    const saveButton: HTMLButtonElement = fixture.nativeElement.querySelector('.btn._guardar');
    const expiration: HTMLInputElement =
      fixture.nativeElement.querySelector('[name="concentracion"]');
    const requiredFields = ['nombre', 'precioCompra', 'precioVenta', 'cantidad'];

    expect(saveButton.disabled).toBe(true);
    expect(
      fixture.nativeElement.querySelector(
        'label[for="concentracionMedicamento"] .campo-obligatorio',
      ),
    ).toBeTruthy();

    for (const name of requiredFields) {
      const input: HTMLInputElement = fixture.nativeElement.querySelector(`[name="${name}"]`);
      input.value = '1';
      input.dispatchEvent(new Event('input'));
    }
    expiration.value = '2027-01-01';
    expiration.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(saveButton.disabled).toBe(false);

    const insumosOption: HTMLElement = fixture.nativeElement.querySelector(
      'app-tab-switch .miniSubMenu .op',
    );
    insumosOption.click();
    fixture.detectChanges();

    expiration.value = '';
    expiration.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(saveButton.disabled).toBe(false);
    expect(
      fixture.nativeElement.querySelector(
        'label[for="concentracionMedicamento"] .campo-obligatorio',
      ),
    ).toBeNull();
  });

  it('inicia sin productos y muestra la indicacion de buscar', () => {
    expect(servicioMedicamento.traerMedicamentoLog).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('tbody').textContent).toContain(
      'Busque un producto',
    );
    expect(fixture.nativeElement.querySelector('app-paginacion')).toBeNull();
  });

  it('muestra la paginacion y la ayuda para seleccionar despues de buscar', async () => {
    servicioMedicamento.buscarMedicamentoLog.mockReturnValueOnce(of([medicamento]));
    component.textoBusqueda = 'amox';
    component.buscarProductos();
    await fixture.whenStable();
    fixture.detectChanges();

    const paginacion: HTMLElement = fixture.nativeElement.querySelector('app-paginacion');
    expect(paginacion).not.toBeNull();
    expect(paginacion.textContent).toContain('Seleccione un medicamento');
    expect(paginacion.textContent).toContain('Mostrando 1 de 1 resultados');
  });

  it('muestra los medicamentos activos en la tabla', async () => {
    servicioMedicamento.traerMedicamentoLog.mockReturnValueOnce(of([medicamento]));
    component.listarProductos();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(1);
    expect(fixture.nativeElement.querySelector('tbody').textContent).toContain('Amoxicilina');
  });

  it('busca medicamentos por nombre con la lupa', async () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('.buscador input');
    input.value = ' amox ';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.btnLupa').click();
    await fixture.whenStable();

    expect(servicioMedicamento.buscarMedicamentoLog).toHaveBeenCalledWith({
      activo: true,
      nombre: 'amox',
    });
  });

  it('lista los productos activos cuando la busqueda esta vacia', () => {
    component.textoBusqueda = '   ';
    component.buscarProductos();

    expect(servicioMedicamento.traerMedicamentoLog).toHaveBeenCalledWith(true);
    expect(servicioMedicamento.buscarMedicamentoLog).not.toHaveBeenCalled();
  });

  it('permite buscar medicamentos pulsando Enter', async () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('.buscador input');
    input.value = 'amox';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await fixture.whenStable();

    expect(servicioMedicamento.buscarMedicamentoLog).toHaveBeenCalledWith({
      activo: true,
      nombre: 'amox',
    });
  });

  it('cambia a insumos con el tab-switch y busca insumos', async () => {
    const insumosOption: HTMLElement = fixture.nativeElement.querySelector(
      'app-tab-switch .miniSubMenu .op',
    );
    insumosOption.click();
    await fixture.whenStable();

    expect(component.isMedicamento).toBe(false);
    expect(servicioInsumos.listarInsumos).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('tbody').textContent).toContain(
      'Busque un producto',
    );

    const input: HTMLInputElement = fixture.nativeElement.querySelector('.buscador input');
    input.value = 'guante';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.btnLupa').click();
    await fixture.whenStable();

    expect(servicioInsumos.buscarInsumos).toHaveBeenCalledWith({ activo: true, nombre: 'guante' });
  });

  it('muestra los insumos en su tabla al cambiar de tipo', async () => {
    component.cambiarTipoProducto(false);
    servicioInsumos.listarInsumos.mockReturnValueOnce(of([insumo]));
    component.listarProductos();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(1);
    expect(fixture.nativeElement.querySelector('tbody').textContent).toContain('Guantes');
    expect(fixture.nativeElement.querySelector('tbody td:nth-child(3)').textContent.trim()).toBe(
      'Desechables',
    );
  });

  it('resalta la fila seleccionada al hacer clic', async () => {
    servicioMedicamento.traerMedicamentoLog.mockReturnValueOnce(of([medicamento]));
    component.listarProductos();
    await fixture.whenStable();
    fixture.detectChanges();

    const fila: HTMLTableRowElement = fixture.nativeElement.querySelector('tbody tr');
    fila.click();
    fixture.detectChanges();

    expect(component.productoSeleccionadoId).toBe(medicamento.id);
    expect(fila.classList.contains('selected-row')).toBe(true);
  });

  it('muestra la x solo en la fila seleccionada y la oculta al deseleccionar', async () => {
    servicioMedicamento.traerMedicamentoLog.mockReturnValueOnce(of([medicamento]));
    component.listarProductos();
    await fixture.whenStable();
    fixture.detectChanges();

    const fila: HTMLTableRowElement = fixture.nativeElement.querySelector('tbody tr');
    const input: HTMLInputElement = fixture.nativeElement.querySelector('.buscador input');
    const switchEl: HTMLElement = fixture.nativeElement.querySelector('app-tab-switch .miniSubMenu');
    expect(fila.querySelector('.iconQuitar')).toBeNull();

    fila.click();
    fixture.detectChanges();

    const quitar = fila.querySelector('button.iconQuitar') as HTMLButtonElement;
    expect(quitar).toBeTruthy();

    quitar.click();
    fixture.detectChanges();
    // NgModel propaga el estado disabled del input dentro de un microtask
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.productoSeleccionadoId).toBeNull();
    expect(fila.classList.contains('selected-row')).toBe(false);
    expect(fila.querySelector('.iconQuitar')).toBeNull();
    expect(input.disabled).toBe(false);
    expect(switchEl.classList.contains('deshabilitado')).toBe(false);
  });

  it('bloquea buscador, tab-switch y paginación mientras hay una selección activa', async () => {
    servicioMedicamento.traerMedicamentoLog.mockReturnValueOnce(of([medicamento]));
    component.listarProductos();
    await fixture.whenStable();
    fixture.detectChanges();

    const input: HTMLInputElement = fixture.nativeElement.querySelector('.buscador input');
    const lupa: HTMLButtonElement = fixture.nativeElement.querySelector('.btnLupa');
    const switchEl: HTMLElement = fixture.nativeElement.querySelector('app-tab-switch .miniSubMenu');
    const paginacion: HTMLElement = fixture.nativeElement.querySelector('.paginacion-bloqueada');

    expect(input.disabled).toBe(false);
    expect(lupa.disabled).toBe(false);
    expect(switchEl.classList.contains('deshabilitado')).toBe(false);
    expect(paginacion.classList.contains('bloqueada')).toBe(false);

    component.seleccionarProducto(medicamento.id);
    fixture.detectChanges();
    // NgModel propaga el estado disabled del input dentro de un microtask
    await fixture.whenStable();
    fixture.detectChanges();

    expect(input.disabled).toBe(true);
    expect(lupa.disabled).toBe(true);
    expect(switchEl.classList.contains('deshabilitado')).toBe(true);
    expect(switchEl.getAttribute('aria-disabled')).toBe('true');
    expect(paginacion.classList.contains('bloqueada')).toBe(true);
  });

  it('bloquea las demás filas y evita reemplazar la selección activa', async () => {
    const otro: MedicamentoLogResponse = {
      ...medicamento,
      id: medicamento.id + 1,
      nombre: 'Ibuprofeno',
    };
    servicioMedicamento.traerMedicamentoLog.mockReturnValueOnce(of([medicamento, otro]));
    component.listarProductos();
    await fixture.whenStable();
    fixture.detectChanges();

    const filas: NodeListOf<HTMLTableRowElement> =
      fixture.nativeElement.querySelectorAll('tbody tr');

    filas[0].click();
    fixture.detectChanges();
    filas[1].click();
    fixture.detectChanges();

    expect(component.productoSeleccionadoId).toBe(medicamento.id);
    expect(filas[0].classList.contains('selected-row')).toBe(true);
    expect(filas[1].classList.contains('fila-bloqueada')).toBe(true);
    expect(filas[1].querySelector('.iconQuitar')).toBeNull();
  });

  it('ignora cambiar de tipo, buscar y paginar con una selección activa', () => {
    component.seleccionarProducto(medicamento.id);
    component.textoBusqueda = 'amox';

    component.cambiarTipoProducto(false);
    component.buscarProductos();
    component.cambiarPagina(2);

    expect(component.isMedicamento).toBe(true);
    expect(component.textoBusqueda).toBe('amox');
    expect(component.paginaActual).toBe(1);
    expect(servicioInsumos.listarInsumos).not.toHaveBeenCalled();
    expect(servicioMedicamento.buscarMedicamentoLog).not.toHaveBeenCalled();
  });

  it('informa errores de búsqueda sin reemplazar los medicamentos', () => {
    const error = new Error('Error de búsqueda');
    const originales = component.medicamentos;
    servicioMedicamento.buscarMedicamentoLog.mockReturnValueOnce(throwError(() => error));

    component.textoBusqueda = 'amox';
    component.buscarProductos();

    expect(component.medicamentos).toBe(originales);
    expect(popUp.errorDesdeBackend).toHaveBeenCalledWith(
      error,
      'Error al buscar los medicamentos.',
    );
  });

  it('muestra el estado de carga mientras consulta los productos', async () => {
    const peticion$ = new Subject<MedicamentoLogResponse[]>();
    servicioMedicamento.traerMedicamentoLog.mockReturnValueOnce(peticion$);

    component.listarProductos();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('tbody [role="status"]').textContent).toContain(
      'Cargando medicamentos...',
    );

    peticion$.next([medicamento]);
    peticion$.complete();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('tbody [role="status"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('tbody').textContent).toContain('Amoxicilina');
  });

  it('informa cuando la búsqueda no tiene resultados', async () => {
    component.buscarProductos();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('tbody').textContent).toContain(
      'No se encontraron medicamentos.',
    );
  });

  // ==================== PASO 1: AGREGAR LOTES ====================

  it('no agrega el lote si no hay un producto seleccionado', () => {
    component.agregarLote(formularioVisible());

    expect(component.lotes).toEqual([]);
    expect(component.isCargandoProducto).toBe(true);
    expect(popUp.advertencia).toHaveBeenCalledWith(
      'Seleccione un medicamento o insumo antes de agregarlo.',
    );
  });

  it('no agrega el lote si el formulario del paso 1 está incompleto', () => {
    component.seleccionarProducto(medicamento.id);
    fixture.detectChanges();

    component.agregarLote(formularioVisible());

    expect(component.lotes).toEqual([]);
    expect(component.isCargandoProducto).toBe(true);
    expect(popUp.formIncompleto).toHaveBeenCalledWith(
      'Complete los datos del lote para continuar.',
    );
    expect(popUp.advertencia).not.toHaveBeenCalled();
  });

  it('no agrega un medicamento con fecha de vencimiento anterior a la actual', () => {
    cargarMedicamentos();
    component.seleccionarProducto(medicamento.id);
    escribirLote({ ...loteCompleto, concentracion: '2000-01-01' });

    component.agregarLote(formularioVisible());

    expect(component.lotes).toEqual([]);
    expect(popUp.advertencia).toHaveBeenCalledWith(
      'La fecha de vencimiento no puede ser menor a la fecha actual.',
    );
  });

  it('no agrega un lote si el precio de compra es mayor al precio de venta', () => {
    cargarMedicamentos();
    component.seleccionarProducto(medicamento.id);
    escribirLote({ ...loteCompleto, precioCompra: '20', precioVenta: '15' });

    component.agregarLote(formularioVisible());

    expect(component.lotes).toEqual([]);
    expect(popUp.advertencia).toHaveBeenCalledWith(
      'El precio de compra no puede ser mayor al precio de venta.',
    );
  });

  it('no agrega un lote si la cantidad es menor o igual a 0', () => {
    cargarMedicamentos();
    component.seleccionarProducto(medicamento.id);
    escribirLote({ ...loteCompleto, cantidad: '0' });

    component.agregarLote(formularioVisible());

    expect(component.lotes).toEqual([]);
    expect(popUp.advertencia).toHaveBeenCalledWith('La cantidad debe ser mayor a 0.');
  });

  it('agrega el lote con los datos del paso 1 y permanece en el paso 1', async () => {
    cargarMedicamentos();
    component.seleccionarProducto(medicamento.id);
    escribirLote(loteCompleto);

    const agregar: HTMLButtonElement = fixture.nativeElement.querySelector(
      'form button[type="submit"]',
    );
    expect(agregar.disabled).toBe(false);

    agregar.click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.lotes).toEqual([loteVista]);
    // No se avanza solo al paso 2: se sigue en el paso 1 y el contador de la caja aumenta
    expect(component.isCargandoProducto).toBe(true);
    expect(component.totalProductosAgregados).toBe(1);
    expect(component.productoSeleccionadoId).toBeNull();
    expect(component.codigoLote).toBe('');
    expect(component.fechaVencimiento).toBe('');
    expect(component.cantidad).toBeNull();
  });

  it('incrementa el número de la caja junto a los pasos al agregar productos', () => {
    const numeroContador = (): string =>
      fixture.nativeElement
        .querySelector('.contador-productos .contador-productos__numero')
        .textContent.trim();

    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.contador-productos i.bi-box-seam')).toBeTruthy();
    expect(numeroContador()).toBe('0');

    cargarMedicamentos();
    component.seleccionarProducto(medicamento.id);
    escribirLote(loteCompleto);
    component.agregarLote(formularioVisible());
    fixture.detectChanges();

    expect(numeroContador()).toBe('1');
    expect(component.isCargandoProducto).toBe(true);

    component.seleccionarProducto(medicamento.id);
    escribirLote({ ...loteCompleto, nombre: 'LOTE-002' });
    component.agregarLote(formularioVisible());
    fixture.detectChanges();

    expect(numeroContador()).toBe('2');
    expect(component.totalProductosAgregados).toBe(2);
    expect(component.isCargandoProducto).toBe(true);
  });

  it('bloquea el paso 2 mientras no haya lotes agregados', () => {
    component.avanzarAlPaso2();

    expect(component.isCargandoProducto).toBe(true);
    expect(popUp.advertencia).toHaveBeenCalledWith(
      'Agregue al menos un producto con su lote para continuar.',
    );
  });

  // ==================== PASO 2: REGISTRAR COMPRA ====================

  it('registra la compra con los lotes y el comprobante', async () => {
    const comprobante = new File(['factura'], 'factura.pdf', { type: 'application/pdf' });

    cargarMedicamentos();
    component.seleccionarProducto(medicamento.id);
    escribirLote(loteCompleto);
    component.agregarLote(formularioVisible());
    component.avanzarAlPaso2();
    component.proveedorSeleccionadoId = 2;
    component.archivoComprobante = comprobante;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const guardar: HTMLButtonElement = fixture.nativeElement.querySelector('.btn._guardar');
    expect(guardar.disabled).toBe(false);

    guardar.click();
    await fixture.whenStable();

    expect(servicioCompra.registrarCompra).toHaveBeenCalledTimes(1);
    expect(servicioCompra.registrarCompra).toHaveBeenCalledWith({
      request: { proveedorId: 2, lotes: [loteEsperado] },
      comprobante,
    });
    expect(popUp.exito).toHaveBeenCalledWith('Compra registrada exitosamente.');
    expect(component.guardando).toBe(false);
    expect(component.lotes).toEqual([]);
    expect(component.proveedorSeleccionadoId).toBeNull();
    expect(component.archivoComprobante).toBeNull();
    expect(component.isCargandoProducto).toBe(true);
  });

  it('no registra la compra si el formulario del paso 2 está incompleto', () => {
    cargarMedicamentos();
    component.seleccionarProducto(medicamento.id);
    escribirLote(loteCompleto);
    component.agregarLote(formularioVisible());
    component.avanzarAlPaso2();
    fixture.detectChanges();

    component.guardarCompra(formularioVisible());

    expect(servicioCompra.registrarCompra).not.toHaveBeenCalled();
    expect(popUp.exito).not.toHaveBeenCalled();
    expect(component.lotes).toEqual([loteVista]);
  });

  it('informa el error del backend al registrar la compra', () => {
    const error = new Error('Fallo el registro');

    cargarMedicamentos();
    component.seleccionarProducto(medicamento.id);
    escribirLote(loteCompleto);
    component.agregarLote(formularioVisible());
    component.avanzarAlPaso2();
    component.proveedorSeleccionadoId = 2;
    fixture.detectChanges();

    servicioCompra.registrarCompra.mockReturnValueOnce(throwError(() => error));
    component.guardarCompra(formularioVisible());

    expect(popUp.errorDesdeBackend).toHaveBeenCalledWith(error, 'No se pudo registrar la compra.');
    expect(popUp.exito).not.toHaveBeenCalled();
    expect(component.guardando).toBe(false);
    expect(component.lotes).toEqual([loteVista]);
  });

  // ==================== PASO 2: PRODUCTOS AGREGADOS, TOTAL Y PROVEEDORES ====================

  it('muestra el titulo Agregar detalle de lote en el formulario del paso 1', () => {
    cargarMedicamentos();

    const titulo: HTMLElement = fixture.nativeElement.querySelector('#tituloMedicamento');
    expect(titulo.textContent).toContain('Agregar detalle de lote');

    component.seleccionarProducto(medicamento.id);
    fixture.detectChanges();

    expect(titulo.textContent).toContain('Agregar detalle de lote');
  });

  it('carga los proveedores activos y los ofrece en el select del paso 2', async () => {
    servicioProveedor.getProveedores.mockReturnValue(of([proveedor]));

    component.listarProveedores();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(servicioProveedor.getProveedores).toHaveBeenCalledWith(true);
    expect(component.proveedores).toEqual([proveedor]);
    expect(component.cargandoProveedores).toBe(false);

    cargarMedicamentos();
    component.seleccionarProducto(medicamento.id);
    escribirLote(loteCompleto);
    component.agregarLote(formularioVisible());
    component.avanzarAlPaso2();
    fixture.detectChanges();

    const opciones: HTMLOptionElement[] = Array.from(
      fixture.nativeElement.querySelectorAll('#proveedorCompra option'),
    );
    expect(opciones.map((opcion) => opcion.textContent?.trim())).toEqual([
      'Seleccione un proveedor',
      proveedor.nombre,
    ]);
  });

  it('informa el error del backend al cargar los proveedores', async () => {
    const error = new Error('Fallo el listado de proveedores');
    servicioProveedor.getProveedores.mockReturnValue(throwError(() => error));

    component.listarProveedores();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(popUp.errorDesdeBackend).toHaveBeenCalledWith(
      error,
      'Error al cargar los proveedores.',
    );
    expect(component.cargandoProveedores).toBe(false);
    expect(component.proveedores).toEqual([]);
  });

  it('lista los lotes agregados con su subtotal y el total de la compra', () => {
    cargarMedicamentos();
    component.seleccionarProducto(medicamento.id);
    escribirLote(loteCompleto);
    component.agregarLote(formularioVisible());
    component.avanzarAlPaso2();
    fixture.detectChanges();

    const celdas: string[] = Array.from(
      fixture.nativeElement.querySelectorAll('tbody tr td') as NodeListOf<HTMLElement>,
    ).map((celda) => celda.textContent?.replace(/\s+/g, ' ').trim() ?? '');

    expect(celdas.length).toBe(9);
    expect(celdas[0]).toBe('1');
    expect(celdas[1]).toContain('Amoxicilina');
    expect(celdas[1]).toContain('Medicamento');
    expect(celdas[1]).toContain('Genfar');
    expect(celdas[2]).toBe('LOTE-001');
    expect(celdas[3]).toBe('2027-05-31');
    expect(celdas[4]).toBe('Q10.00');
    expect(celdas[5]).toBe('Q15.00');
    expect(celdas[6]).toBe('20');
    expect(celdas[8]).toBe('Q200.00');
    expect(component.totalCompra).toBe(200);
    expect(fixture.nativeElement.querySelector('.formulario').textContent).toContain('Q200.00');
  });

  it('muestra las columnas Vencimiento y Acciones en el paso 2', () => {
    cargarMedicamentos();
    component.seleccionarProducto(medicamento.id);
    escribirLote(loteCompleto);
    component.agregarLote(formularioVisible());
    component.avanzarAlPaso2();
    fixture.detectChanges();

    const encabezados = Array.from(
      fixture.nativeElement.querySelectorAll('thead th') as NodeListOf<HTMLElement>,
    ).map((th) => th.textContent?.trim());

    expect(encabezados).toContain('Vencimiento');
    expect(encabezados).toContain('Acciones');
    expect(encabezados).not.toContain('Eliminar');
  });

  it('actualiza un lote desde el paso 2 y vuelve a la lista', async () => {
    cargarMedicamentos();
    component.seleccionarProducto(medicamento.id);
    escribirLote(loteCompleto);
    component.agregarLote(formularioVisible());
    component.avanzarAlPaso2();
    fixture.detectChanges();

    const editar: HTMLButtonElement = fixture.nativeElement.querySelector(
      'tbody button.iconEditar',
    );
    expect(editar).toBeTruthy();
    editar.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.isCargandoProducto).toBe(true);
    expect(component.indiceLoteEdicion).toBe(0);
    expect(component.codigoLote).toBe('LOTE-001');
    expect(component.cantidad).toBe(20);
    expect(fixture.nativeElement.querySelector('tbody .selected-row')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('tbody .selected-row').textContent).toContain(
      'Amoxicilina',
    );

    escribirLote({ ...loteCompleto, cantidad: '25', precioCompra: '12' });
    expect(component.cantidad).toBe(25);
    expect(component.precioCompra).toBe(12);
    component.agregarLote(formularioVisible());
    fixture.detectChanges();

    expect(component.isCargandoProducto).toBe(false);
    expect(component.indiceLoteEdicion).toBeNull();
    expect(component.lotes).toHaveLength(1);
    expect(component.lotes[0]).toMatchObject({
      codigoLote: 'LOTE-001',
      cantidad: 25,
      precioCompra: 12,
      precioVenta: 15,
    });
    expect(component.totalCompra).toBe(300);
  });

  it('cancela la edicion del lote y vuelve al paso 2 sin cambios', async () => {
    cargarMedicamentos();
    component.seleccionarProducto(medicamento.id);
    escribirLote(loteCompleto);
    component.agregarLote(formularioVisible());
    component.avanzarAlPaso2();
    fixture.detectChanges();

    component.editarLote(0);
    fixture.detectChanges();
    await fixture.whenStable();
    escribirLote({ ...loteCompleto, cantidad: '99' });

    component.cancelarPaso1(formularioVisible());
    fixture.detectChanges();

    expect(component.isCargandoProducto).toBe(false);
    expect(component.indiceLoteEdicion).toBeNull();
    expect(component.lotes).toEqual([loteVista]);
  });

  it('indica en la tabla el producto al editar un lote de una compra existente', async () => {
    servicioMedicamento.buscarMedicamentoLog.mockReturnValueOnce(of([medicamento]));
    const editFixture = crearFixtureEdicion();
    editFixture.detectChanges();
    await editFixture.whenStable();

    const editar: HTMLButtonElement = editFixture.nativeElement.querySelector(
      'tbody button.iconEditar',
    );
    expect(editar).toBeTruthy();
    editar.click();
    editFixture.detectChanges();
    await editFixture.whenStable();

    const seleccionada: HTMLElement = editFixture.nativeElement.querySelector(
      'tbody .selected-row',
    );
    expect(editFixture.componentInstance.isCargandoProducto).toBe(true);
    expect(seleccionada).not.toBeNull();
    expect(seleccionada.textContent).toContain('Amoxicilina');

    editFixture.destroy();
  });

  it('recalcula el total al quitar un lote de la lista sin salir del paso 2', () => {
    cargarMedicamentos();
    component.seleccionarProducto(medicamento.id);
    escribirLote(loteCompleto);
    component.agregarLote(formularioVisible());

    // Se sigue en el paso 1 para agregar un segundo lote
    component.seleccionarProducto(medicamento.id);
    escribirLote({ ...loteCompleto, nombre: 'LOTE-002', cantidad: '5' });
    component.agregarLote(formularioVisible());
    component.avanzarAlPaso2();
    fixture.detectChanges();

    expect(component.lotes.length).toBe(2);
    expect(component.totalCompra).toBe(250);

    component.eliminarLote(1);
    fixture.detectChanges();

    expect(component.lotes).toEqual([loteVista]);
    expect(component.totalCompra).toBe(200);
    expect(component.isCargandoProducto).toBe(false);
  });

  it('quita el lote con el botón Eliminar de la tabla y vuelve al paso 1 si queda vacía', () => {
    cargarMedicamentos();
    component.seleccionarProducto(medicamento.id);
    escribirLote(loteCompleto);
    component.agregarLote(formularioVisible());
    component.avanzarAlPaso2();
    fixture.detectChanges();

    const eliminar: HTMLButtonElement = fixture.nativeElement.querySelector(
      'tbody button.iconQuitar',
    );
    expect(eliminar).toBeTruthy();

    eliminar.click();
    fixture.detectChanges();

    expect(component.lotes).toEqual([]);
    expect(component.totalCompra).toBe(0);
    expect(component.isCargandoProducto).toBe(true);
  });

  it('ignora índices inexistentes al eliminar un lote', () => {
    cargarMedicamentos();
    component.seleccionarProducto(medicamento.id);
    escribirLote(loteCompleto);
    component.agregarLote(formularioVisible());
    component.avanzarAlPaso2();

    component.eliminarLote(3);
    component.eliminarLote(-1);

    expect(component.lotes).toEqual([loteVista]);
    expect(component.isCargandoProducto).toBe(false);
  });

  // ==================== MODO EDICIÓN ====================

  it('precarga el proveedor y los lotes al editar una compra', () => {
    const editFixture = crearFixtureEdicion();
    const editComponent = editFixture.componentInstance;

    expect(editComponent.esEdicion).toBe(true);
    expect(editComponent.proveedorSeleccionadoId).toBe(proveedor.id);
    expect(editComponent.isCargandoProducto).toBe(false);
    expect(editComponent.lotes).toHaveLength(1);
    expect(editComponent.lotes[0]).toMatchObject({
      esMedicamento: true,
      idItem: medicamento.id,
      codigoLote: 'LOTE-001',
      cantidad: 50,
      fechaVencimiento: '2027-10-16',
      precioCompra: 10,
      precioVenta: 15,
      idLote: 10,
      disponible: 40,
    });
    expect(editComponent.hayCambios).toBe(false);

    const guardar: HTMLButtonElement =
      editFixture.nativeElement.querySelector('button._guardar');
    expect(guardar.disabled).toBe(true);

    editFixture.destroy();
  });

  it('habilita el guardado al cambiar el proveedor y actualiza la compra', async () => {
    servicioProveedor.getProveedores.mockReturnValue(of([proveedor, otroProveedor]));

    const editFixture = crearFixtureEdicion();
    const editComponent = editFixture.componentInstance;
    const emitirActualizado = vi.spyOn(editComponent.actualizado, 'emit');

    editComponent.proveedorSeleccionadoId = otroProveedor.id;
    editFixture.componentRef.changeDetectorRef.detectChanges();

    expect(editComponent.puedeGuardar).toBe(true);

    const formulario: NgForm = editFixture.debugElement
      .query(By.directive(NgForm))
      .injector.get(NgForm);

    await editComponent.guardarCompra(formulario);

    expect(popUp.confirmarToast).toHaveBeenCalledWith(
      '¿Deseas guardar los cambios de esta compra?',
    );
    expect(servicioCompra.actualizarCompra).toHaveBeenCalledWith(1, {
      request: {
        proveedorId: otroProveedor.id,
        lotes: [
          {
            esMedicamento: true,
            idItem: medicamento.id,
            codigoLote: 'LOTE-001',
            cantidad: 50,
            fechaVencimiento: '2027-10-16',
            precioCompra: 10,
            precioVenta: 15,
          },
        ],
      },
      comprobante: null,
    });
    expect(emitirActualizado).toHaveBeenCalled();

    editFixture.destroy();
  });

  it('no actualiza la compra si el usuario cancela la confirmación', async () => {
    servicioProveedor.getProveedores.mockReturnValue(of([proveedor, otroProveedor]));

    const editFixture = crearFixtureEdicion();
    const editComponent = editFixture.componentInstance;
    editComponent.proveedorSeleccionadoId = otroProveedor.id;
    const formulario: NgForm = editFixture.debugElement
      .query(By.directive(NgForm))
      .injector.get(NgForm);
    popUp.confirmarToast.mockResolvedValue(false);

    await editComponent.guardarCompra(formulario);

    expect(popUp.confirmarToast).toHaveBeenCalledWith(
      '¿Deseas guardar los cambios de esta compra?',
    );
    expect(servicioCompra.actualizarCompra).not.toHaveBeenCalled();
    expect(editComponent.guardando).toBe(false);

    editFixture.destroy();
  });

  it('bloquea la eliminación de un lote que ya tiene unidades despachadas', () => {
    const editFixture = crearFixtureEdicion();
    const editComponent = editFixture.componentInstance;

    editComponent.eliminarLote(0);

    expect(editComponent.lotes).toHaveLength(1);
    expect(popUp.advertencia).toHaveBeenCalledWith(
      'No se puede eliminar el lote porque ya tiene unidades despachadas.',
    );

    editFixture.destroy();
  });

  it('permite eliminar un lote cuando no tiene unidades despachadas', () => {
    const compraSinDespachos: detalleCompraResponse = {
      ...compraDetalle,
      lotes: [{ ...compraDetalle.lotes[0], disponible: 50 }],
    };
    const editFixture = crearFixtureEdicion(compraSinDespachos);
    const editComponent = editFixture.componentInstance;

    editComponent.eliminarLote(0);

    expect(editComponent.lotes).toEqual([]);
    expect(editComponent.isCargandoProducto).toBe(true);

    editFixture.destroy();
  });
});
