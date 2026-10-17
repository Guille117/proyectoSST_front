import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, of } from 'rxjs';
import { ModalService } from '../../../modal-principal/modal-service';
import { PopUps } from '../../../shared/popUps/popUpsService';
import { CatalogoService } from '../../Catalogos/data/serviceCatalogo';
import { Inter_base } from '../../Catalogos/data/nombreInterfaz';
import { proveedorResponse } from '../proveedores/data/proveedorInterfaz';
import { ProveedorService } from '../proveedores/data/proveedor-service';
import {
  BajaListadoResponse,
  InventarioFiltros,
  InventarioResponse,
} from './data/interfaz-inventario';
import { ServicioInventario } from './data/servicio-inventario';
import { ModalBajaLote } from './modal-baja-lote/modal-baja-lote';

import { Inventario } from './inventario';

describe('Inventario', () => {
  let component: Inventario;
  let fixture: ComponentFixture<Inventario>;

  const servicioInventario = {
    listarInventario: vi.fn<
      (filtros: InventarioFiltros) => Observable<InventarioResponse[]>
    >(() => of([])),
    listarBajas: vi.fn<
      (tipo: 'medicamento' | 'insumo') => Observable<BajaListadoResponse[]>
    >(() => of([])),
    revertirBaja: vi.fn<(id: number) => Observable<void>>(() => of(void 0)),
  };
  const servicioProveedor = {
    getProveedores: vi.fn<(activos: boolean) => Observable<proveedorResponse[]>>(() => of([])),
  };
  const servicioCatalogos = {
    listar: vi.fn<(recurso: string, activos?: boolean) => Observable<Inter_base[]>>(() => of([])),
  };
  const popUp = {
    errorDesdeBackend: vi.fn(),
    error: vi.fn(),
    exito: vi.fn(),
    confirmarToast: vi.fn(async () => true),
  };

  const inventarioMedicamento: InventarioResponse = {
    id: 1,
    tipo: 'MEDICAMENTO',
    idItem: 3,
    codigo: 'MED-3',
    nombre: 'Aspirina',
    descripcion: '150 mg · Ampolla · Pfizer',
    administracion: 'Oral',
    presentacion: 'Ampolla',
    cantidad: 50,
    disponible: 50,
    proveedorId: 1,
    proveedor: 'Distribuidora la Paz',
    codigoLote: 'Tk-028',
    fechaVencimiento: '2028-05-10',
    estado: true,
    idCompra: 1,
    codigoCompra: 'COM-1',
  };

  const inventarioInsumo: InventarioResponse = {
    ...inventarioMedicamento,
    id: 2,
    tipo: 'INSUMO',
    idItem: 1,
    codigo: 'INS-1',
    nombre: 'Jeringa descartable',
    descripcion: 'Bayer · Neojeringa Luer Lock 3 ml',
    administracion: null,
    presentacion: null,
    codigoLote: 'Tk-020',
  };

  const bajaMedicamento: BajaListadoResponse = {
    idBaja: 1,
    producto: 'Aspirina Pfizer Ampolla 150mg',
    lote: 'Tk-028',
    motivo: 'Producto dañado',
    observacion: 'Producto dañado',
    fecha: '2028-05-10T10:00:00',
    usuario: 'admin',
  };

  const bajaInsumo: BajaListadoResponse = {
    idBaja: 2,
    producto: 'Jeringa descartable Bayer Neojeringa Luer Lock 3 ml',
    lote: 'Tk-020',
    motivo: 'Empaque deteriorado',
    observacion: 'Caja abierta',
    fecha: '2028-06-15T09:30:00',
    usuario: 'admin',
  };

  beforeEach(async () => {
    servicioInventario.listarInventario.mockReset();
    servicioInventario.listarInventario.mockReturnValue(of([]));
    servicioInventario.listarBajas.mockReset();
    servicioInventario.listarBajas.mockReturnValue(of([]));
    servicioInventario.revertirBaja.mockReset();
    servicioInventario.revertirBaja.mockReturnValue(of(void 0));
    servicioProveedor.getProveedores.mockReset();
    servicioProveedor.getProveedores.mockReturnValue(of([]));
    servicioCatalogos.listar.mockReset();
    servicioCatalogos.listar.mockReturnValue(of([]));
    popUp.errorDesdeBackend.mockReset();
    popUp.error.mockReset();
    popUp.exito.mockReset();
    popUp.confirmarToast.mockReset();
    popUp.confirmarToast.mockResolvedValue(true);

    await TestBed.configureTestingModule({
      imports: [Inventario],
      providers: [
        { provide: ServicioInventario, useValue: servicioInventario },
        { provide: ProveedorService, useValue: servicioProveedor },
        { provide: CatalogoService, useValue: servicioCatalogos },
        { provide: PopUps, useValue: popUp },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Inventario);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('inicia con el switch en medicamentos y sin estado seleccionado', () => {
    const opciones: NodeListOf<HTMLDivElement> = fixture.nativeElement.querySelectorAll(
      'app-tab-switch .miniSubMenu > div',
    );
    const chips: NodeListOf<HTMLButtonElement> =
      fixture.nativeElement.querySelectorAll('.estado-chip');

    expect(component.isMedicamento).toBe(true);
    expect(opciones[0].classList.contains('op2')).toBe(true);
    expect(opciones[1].classList.contains('op')).toBe(true);
    expect(component.estadoSeleccionado).toBeNull();
    expect(chips.length).toBe(component.estados.length);
    expect(chips[0].textContent).toContain('Todos');
    expect(chips[0].classList.contains('activo')).toBe(true);
    expect(chips[0].querySelector('.punto')).toBeNull();
    expect(chips[1].querySelector('.punto')).toBeTruthy();
  });

  it('consulta el inventario de medicamentos activos al iniciar', () => {
    expect(servicioInventario.listarInventario).toHaveBeenCalledWith({
      tipo: 'medicamento',
      activos: true,
    });
  });

  it('cambia entre medicamentos e insumos con el switch compartido', () => {
    const opciones: NodeListOf<HTMLDivElement> = fixture.nativeElement.querySelectorAll(
      'app-tab-switch .miniSubMenu > div',
    );

    opciones[1].click();
    fixture.detectChanges();

    expect(component.isMedicamento).toBe(false);
    expect(opciones[1].classList.contains('op2')).toBe(true);
    expect(opciones[0].classList.contains('op')).toBe(true);
    expect(servicioInventario.listarInventario).toHaveBeenLastCalledWith({
      tipo: 'insumo',
      activos: true,
    });

    opciones[0].click();
    fixture.detectChanges();

    expect(component.isMedicamento).toBe(true);
    expect(opciones[0].classList.contains('op2')).toBe(true);
  });

  it('selecciona un solo estado y lo limpia al volver a pulsarlo', () => {
    const chips: NodeListOf<HTMLButtonElement> =
      fixture.nativeElement.querySelectorAll('.estado-chip');

    chips[1].click();
    fixture.detectChanges();

    expect(component.estadoSeleccionado).toBe('vencidos');
    expect(chips[1].classList.contains('activo')).toBe(true);
    expect(chips[1].getAttribute('aria-pressed')).toBe('true');
    expect(servicioInventario.listarInventario).toHaveBeenLastCalledWith({
      tipo: 'medicamento',
      activos: true,
      estadoInventario: 'vencidos',
    });

    chips[3].click();
    fixture.detectChanges();

    expect(component.estadoSeleccionado).toBe('stock-bajo');
    expect(chips[1].classList.contains('activo')).toBe(false);
    expect(chips[3].classList.contains('activo')).toBe(true);

    chips[3].click();
    fixture.detectChanges();

    expect(component.estadoSeleccionado).toBeNull();
    expect(chips[3].classList.contains('activo')).toBe(false);
    expect(chips[3].getAttribute('aria-pressed')).toBe('false');
    expect(chips[0].classList.contains('activo')).toBe(true);
  });

  it('vuelve a todos y quita el filtro de estado', () => {
    component.seleccionarEstado('vencidos');
    const chips: NodeListOf<HTMLButtonElement> =
      fixture.nativeElement.querySelectorAll('.estado-chip');

    chips[0].click();
    fixture.detectChanges();

    expect(component.estadoSeleccionado).toBeNull();
    expect(chips[0].classList.contains('activo')).toBe(true);
    expect(chips[0].getAttribute('aria-pressed')).toBe('true');
    expect(servicioInventario.listarInventario).toHaveBeenLastCalledWith({
      tipo: 'medicamento',
      activos: true,
    });
  });

  it('busca por nombre, proveedor y administración', () => {
    component.criterioBusqueda = 'nombre';
    component.textoBusqueda = '  aspi  ';
    component.buscarInventario();

    expect(servicioInventario.listarInventario).toHaveBeenLastCalledWith({
      tipo: 'medicamento',
      activos: true,
      nombre: 'aspi',
    });

    component.criterioBusqueda = 'proveedorId';
    component.proveedorIdBusqueda = 3;
    component.buscarInventario();

    expect(servicioInventario.listarInventario).toHaveBeenLastCalledWith({
      tipo: 'medicamento',
      activos: true,
      proveedorId: 3,
    });

    component.criterioBusqueda = 'viaAdminId';
    component.viaAdminIdBusqueda = 2;
    component.buscarInventario();

    expect(servicioInventario.listarInventario).toHaveBeenLastCalledWith({
      tipo: 'medicamento',
      activos: true,
      viaAdminId: 2,
    });
  });

  it('limpia el filtro de administración al cambiar a insumos', () => {
    component.criterioBusqueda = 'viaAdminId';
    component.viaAdminIdBusqueda = 2;
    component.buscarInventario();

    component.cambiarTipoProducto(false);

    expect(component.isMedicamento).toBe(false);
    expect(component.criterioBusqueda).toBe('nombre');
    expect(component.viaAdminIdBusqueda).toBeNull();
    expect(servicioInventario.listarInventario).toHaveBeenLastCalledWith({
      tipo: 'insumo',
      activos: true,
    });
  });

  it('muestra los datos del inventario y formatea la fecha', () => {
    servicioInventario.listarInventario.mockReturnValue(of([inventarioMedicamento]));

    const fixtureConDatos = TestBed.createComponent(Inventario);
    fixtureConDatos.detectChanges();

    const fila: HTMLElement = fixtureConDatos.nativeElement.querySelector('tbody tr');
    expect(fila.textContent).toContain('MED-3');
    expect(fila.textContent).toContain('Aspirina');
    expect(fila.textContent).toContain('Oral');
    expect(fila.textContent).toContain('Ampolla');
    expect(fila.textContent).toContain('50');
    expect(fila.textContent).toContain('Distribuidora la Paz');
    expect(fila.textContent).toContain('Tk-028');
    expect(fila.textContent).toContain('mayo 10, 2028');

    fixtureConDatos.destroy();
  });

  it('pagina el inventario en bloques de 10 elementos', () => {
    const items: InventarioResponse[] = Array.from({ length: 12 }, (_, indice) => ({
      ...inventarioMedicamento,
      id: 100 + indice,
      codigo: `MED-${indice + 1}`,
    }));
    servicioInventario.listarInventario.mockReturnValue(of(items));

    const fixturePaginacion = TestBed.createComponent(Inventario);
    fixturePaginacion.detectChanges();

    const tabla: HTMLElement = fixturePaginacion.nativeElement.querySelector('table');
    const paginacion: HTMLElement =
      fixturePaginacion.nativeElement.querySelector('app-paginacion');

    expect(tabla.querySelectorAll('tbody tr')).toHaveLength(10);
    expect(paginacion.textContent).toContain('Mostrando 10 de 12 resultados');

    const siguiente: HTMLButtonElement =
      fixturePaginacion.nativeElement.querySelector('app-paginacion button.derecha');
    siguiente.click();
    fixturePaginacion.detectChanges();

    expect(fixturePaginacion.componentInstance.paginaActual).toBe(2);
    expect(tabla.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(paginacion.textContent).toContain('Mostrando 2 de 12 resultados');

    fixturePaginacion.destroy();
  });

  it('aplica colores de vencimiento y stock según los datos de la fila', () => {
    const fechaEnDias = (dias: number): string => {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() + dias);
      const mes = String(fecha.getMonth() + 1).padStart(2, '0');
      const dia = String(fecha.getDate()).padStart(2, '0');
      return `${fecha.getFullYear()}-${mes}-${dia}`;
    };

    const items: InventarioResponse[] = [
      {
        ...inventarioMedicamento,
        id: 10,
        codigo: 'MED-A',
        fechaVencimiento: '2001-05-10',
      },
      {
        ...inventarioMedicamento,
        id: 11,
        codigo: 'MED-B',
        fechaVencimiento: fechaEnDias(10),
      },
      {
        ...inventarioMedicamento,
        id: 12,
        codigo: 'MED-C',
        disponible: 5,
        fechaVencimiento: '2030-05-10',
      },
      {
        ...inventarioMedicamento,
        id: 13,
        codigo: 'MED-D',
        disponible: 0,
        fechaVencimiento: '2030-05-10',
      },
    ];
    servicioInventario.listarInventario.mockReturnValue(of(items));

    const fixtureColores = TestBed.createComponent(Inventario);
    fixtureColores.detectChanges();

    const filas: NodeListOf<HTMLTableRowElement> =
      fixtureColores.nativeElement.querySelectorAll('tbody tr');
    const celdas = (indice: number): NodeListOf<HTMLTableCellElement> =>
      filas[indice].querySelectorAll('td');

    expect(celdas(0)[7].classList.contains('fecha-vencida')).toBe(true);
    expect(celdas(1)[7].classList.contains('fecha-por-vencer')).toBe(true);
    expect(celdas(2)[4].classList.contains('stock-bajo')).toBe(true);
    expect(celdas(3)[4].classList.contains('sin-stock')).toBe(true);
    expect(celdas(0)[4].classList.contains('stock-bajo')).toBe(false);

    fixtureColores.destroy();
  });

  it('suma el disponible por código vigente para decidir el stock bajo', () => {
    const items: InventarioResponse[] = [
      {
        ...inventarioMedicamento,
        id: 20,
        codigo: 'MED-SUM',
        disponible: 10,
        fechaVencimiento: '2030-05-10',
      },
      {
        ...inventarioMedicamento,
        id: 21,
        codigo: 'MED-SUM',
        disponible: 8,
        fechaVencimiento: '2030-05-10',
      },
      {
        ...inventarioMedicamento,
        id: 22,
        codigo: 'MED-ALTO',
        disponible: 15,
        fechaVencimiento: '2030-05-10',
      },
      {
        ...inventarioMedicamento,
        id: 23,
        codigo: 'MED-ALTO',
        disponible: 10,
        fechaVencimiento: '2030-05-10',
      },
      {
        ...inventarioMedicamento,
        id: 24,
        codigo: 'MED-CERO',
        disponible: 0,
        fechaVencimiento: '2030-05-10',
      },
      {
        ...inventarioMedicamento,
        id: 25,
        codigo: 'MED-CERO',
        disponible: 10,
        fechaVencimiento: '2030-05-10',
      },
      {
        ...inventarioMedicamento,
        id: 26,
        codigo: 'MED-MIX',
        disponible: 15,
        fechaVencimiento: '2001-05-10',
      },
      {
        ...inventarioMedicamento,
        id: 27,
        codigo: 'MED-MIX',
        disponible: 10,
        fechaVencimiento: '2030-05-10',
      },
    ];
    servicioInventario.listarInventario.mockReturnValue(of(items));

    const fixtureStock = TestBed.createComponent(Inventario);
    fixtureStock.detectChanges();

    const filas: NodeListOf<HTMLTableRowElement> =
      fixtureStock.nativeElement.querySelectorAll('tbody tr');
    const cantidad = (indice: number): HTMLTableCellElement =>
      filas[indice].querySelectorAll('td')[4];

    expect(cantidad(0).classList.contains('stock-bajo')).toBe(true);
    expect(cantidad(1).classList.contains('stock-bajo')).toBe(true);
    expect(cantidad(2).classList.contains('stock-bajo')).toBe(false);
    expect(cantidad(3).classList.contains('stock-bajo')).toBe(false);
    expect(cantidad(4).classList.contains('sin-stock')).toBe(true);
    expect(cantidad(4).classList.contains('stock-bajo')).toBe(false);
    expect(cantidad(5).classList.contains('stock-bajo')).toBe(true);
    // El lote vencido no suma: el vigente queda con 10 disponibles.
    expect(cantidad(6).classList.contains('stock-bajo')).toBe(false);
    expect(cantidad(7).classList.contains('stock-bajo')).toBe(true);

    fixtureStock.destroy();
  });

  it('abre el modal de baja con el lote seleccionado', () => {
    servicioInventario.listarInventario.mockReturnValue(of([inventarioMedicamento]));

    const fixtureEliminar = TestBed.createComponent(Inventario);
    fixtureEliminar.detectChanges();

    const modalService = TestBed.inject(ModalService);
    const abrirModal = vi.spyOn(modalService, 'open');

    const botonEliminar: HTMLButtonElement =
      fixtureEliminar.nativeElement.querySelector('.iconEliminar');
    expect(botonEliminar).toBeTruthy();

    botonEliminar.click();

    expect(abrirModal).toHaveBeenCalledWith(
      ModalBajaLote,
      expect.objectContaining({
        title: 'Eliminar lote',
        lote: inventarioMedicamento,
        onGuardado: expect.any(Function),
      }),
    );

    fixtureEliminar.destroy();
  });

  it('muestra la tabla de bajas al seleccionar eliminados en medicamentos', () => {
    servicioInventario.listarInventario.mockReturnValue(of([inventarioMedicamento]));
    servicioInventario.listarBajas.mockReturnValue(of([bajaMedicamento]));

    const fixtureBajas = TestBed.createComponent(Inventario);
    fixtureBajas.detectChanges();

    const chips: NodeListOf<HTMLButtonElement> =
      fixtureBajas.nativeElement.querySelectorAll('.estado-chip');
    chips[5].click();
    fixtureBajas.detectChanges();

    expect(servicioInventario.listarBajas).toHaveBeenCalledWith('medicamento');

    const buscador: HTMLElement =
      fixtureBajas.nativeElement.querySelector('.buscador-container');
    expect(buscador).toBeTruthy();
    const criterios = Array.from(
      buscador.querySelectorAll<HTMLOptionElement>('.selector option'),
    ).map((opcion) => opcion.textContent?.trim());
    expect(criterios).toEqual(['Nombre']);

    const tabla: HTMLElement = fixtureBajas.nativeElement.querySelector('table');
    const encabezados = Array.from(
      tabla.querySelectorAll<HTMLTableCellElement>('thead th'),
    ).map((th) => th.textContent?.trim());

    expect(encabezados).toEqual([
      'Medicamento',
      'Lote',
      'Motivo',
      'Observación',
      'Fecha',
      'Usuario',
      'Revertir',
    ]);

    const fila: HTMLElement = tabla.querySelector('tbody tr')!;
    expect(fila.textContent).toContain('Aspirina');
    expect(fila.textContent).toContain('Producto dañado');
    expect(fila.textContent).toContain('mayo 10, 2028');
    expect(fila.textContent).toContain('admin');
    expect(fila.querySelector('.iconRevertir')).toBeTruthy();
    expect(fila.querySelector('.iconEliminar')).toBeNull();

    fixtureBajas.destroy();
  });

  it('filtra las bajas por nombre desde el buscador', () => {
    servicioInventario.listarInventario.mockReturnValue(of([inventarioMedicamento]));
    servicioInventario.listarBajas.mockReturnValue(of([bajaMedicamento]));

    const fixtureBajas = TestBed.createComponent(Inventario);
    fixtureBajas.detectChanges();

    const chips: NodeListOf<HTMLButtonElement> =
      fixtureBajas.nativeElement.querySelectorAll('.estado-chip');
    chips[5].click();
    fixtureBajas.detectChanges();

    fixtureBajas.componentInstance.textoBusqueda = 'aspirina';
    fixtureBajas.componentInstance.buscarInventario();
    fixtureBajas.detectChanges();

    const tabla: HTMLElement = fixtureBajas.nativeElement.querySelector('table');
    const filas: NodeListOf<HTMLTableRowElement> =
      tabla.querySelectorAll('tbody tr');

    expect(filas).toHaveLength(1);
    expect(filas[0].textContent).toContain('Aspirina');
    expect(fixtureBajas.componentInstance.bajas).toHaveLength(1);

    fixtureBajas.destroy();
  });

  it('revierte una baja con confirmación y recarga', async () => {
    servicioInventario.listarInventario.mockReturnValue(of([inventarioMedicamento]));
    servicioInventario.listarBajas.mockReturnValue(of([bajaMedicamento]));

    const fixtureBajas = TestBed.createComponent(Inventario);
    fixtureBajas.detectChanges();

    const chips: NodeListOf<HTMLButtonElement> =
      fixtureBajas.nativeElement.querySelectorAll('.estado-chip');
    chips[5].click();
    fixtureBajas.detectChanges();

    const baja = fixtureBajas.componentInstance.bajas[0];
    await fixtureBajas.componentInstance.revertirBaja(baja);

    expect(popUp.confirmarToast).toHaveBeenCalledWith(
      '¿Deseas revertir la baja de Aspirina Pfizer Ampolla 150mg del lote Tk-028?',
    );
    expect(servicioInventario.revertirBaja).toHaveBeenCalledWith(1);
    expect(popUp.exito).toHaveBeenCalledWith('Baja revertida exitosamente.');

    fixtureBajas.destroy();
  });

  it('solicita y muestra solo las bajas de insumos en eliminados de insumos', () => {
    servicioInventario.listarInventario.mockReturnValue(of([inventarioInsumo]));
    servicioInventario.listarBajas.mockReturnValue(of([bajaInsumo]));

    const fixtureBajas = TestBed.createComponent(Inventario);
    fixtureBajas.detectChanges();
    fixtureBajas.componentInstance.cambiarTipoProducto(false);

    const chips: NodeListOf<HTMLButtonElement> =
      fixtureBajas.nativeElement.querySelectorAll('.estado-chip');
    chips[5].click();
    fixtureBajas.detectChanges();

    expect(servicioInventario.listarBajas).toHaveBeenCalledWith('insumo');

    const tabla: HTMLElement = fixtureBajas.nativeElement.querySelector('table');
    const filas: NodeListOf<HTMLTableRowElement> =
      tabla.querySelectorAll('tbody tr');

    expect(filas).toHaveLength(1);
    expect(filas[0].textContent).toContain('Jeringa descartable Bayer');
    expect(filas[0].textContent).not.toContain('Aspirina');
    expect(filas[0].querySelector('.iconRevertir')).toBeTruthy();

    fixtureBajas.destroy();
  });

  it('muestra descripción en lugar de administración y presentación para insumos', () => {
    servicioInventario.listarInventario.mockReturnValue(of([inventarioInsumo]));

    const fixtureInsumos = TestBed.createComponent(Inventario);
    fixtureInsumos.detectChanges();
    fixtureInsumos.componentInstance.cambiarTipoProducto(false);
    fixtureInsumos.detectChanges();

    const tabla: HTMLElement = fixtureInsumos.nativeElement.querySelector('table');
    const encabezados = Array.from(
      tabla.querySelectorAll<HTMLTableCellElement>('thead th'),
    ).map((th) => th.textContent?.trim());

    expect(encabezados).toContain('Descripción');
    expect(encabezados).not.toContain('Administración');
    expect(encabezados).not.toContain('Presentación');
    expect(encabezados).toContain('Eliminar');

    const fila: HTMLElement = fixtureInsumos.nativeElement.querySelector('tbody tr');
    expect(fila.textContent).toContain('Jeringa descartable');
    expect(fila.textContent).toContain('Bayer · Neojeringa Luer Lock 3 ml');
    expect(fila.querySelector('.iconEliminar')).toBeTruthy();

    fixtureInsumos.destroy();
  });
});
