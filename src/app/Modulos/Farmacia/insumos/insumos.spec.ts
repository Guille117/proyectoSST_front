import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Observable, of } from 'rxjs';
import { PopUps } from '../../../shared/popUps/popUpsService';
import { CatalogoService } from '../../Catalogos/data/serviceCatalogo';
import { Inter_base } from '../../Catalogos/data/nombreInterfaz';
import { Insumo, InsumoRequest, InsumoResponse } from './data/interfazInsumo';
import { ServicioInsumos } from './data/servicio-insumos';

import { Insumos } from './insumos';

describe('Insumos', () => {
  let component: Insumos;
  let fixture: ComponentFixture<Insumos>;
  const servicioInsumos = {
    crearInsumo: vi.fn<(insumo: InsumoRequest) => Observable<InsumoResponse>>(() => of({
      id: 1,
      nombre: 'Guantes',
      marcaId: 2,
      marca: 'Fabricante',
    })),
    listarInsumos: vi.fn<(activo: boolean) => Observable<Insumo[]>>(() => of([])),
    buscarInsumos: vi.fn<(
      filtros: { nombre?: string; marcaId?: number; activo?: boolean },
    ) => Observable<Insumo[]>>(() => of([])),
    obtenerInsumoPorId: vi.fn<(id: number) => Observable<InsumoResponse>>(),
    actualizarInsumo: vi.fn<
      (id: number, insumo: InsumoRequest) => Observable<InsumoResponse>
    >(() => of({ id: 1, nombre: 'Guantes', marcaId: 2, marca: 'Fabricante' })),
    cambiarEstadoInsumo: vi.fn<(id: number) => Observable<void>>(() => of(undefined)),
  };
  const catalogos = {
    listar: vi.fn<(recurso: string) => Observable<Inter_base[]>>(() => of([])),
  };
  const popUp = {
    confirmarToast: vi.fn<() => Promise<boolean>>(() => Promise.resolve(true)),
    exito: vi.fn(),
    errorDesdeBackend: vi.fn(),
  };

  beforeEach(async () => {
    servicioInsumos.crearInsumo.mockClear();
    servicioInsumos.crearInsumo.mockReturnValue(of({
      id: 1,
      nombre: 'Guantes',
      marcaId: 2,
      marca: 'Fabricante',
    }));
    servicioInsumos.listarInsumos.mockReset();
    servicioInsumos.listarInsumos.mockReturnValue(of([]));
    servicioInsumos.buscarInsumos.mockReset();
    servicioInsumos.buscarInsumos.mockReturnValue(of([]));
    servicioInsumos.obtenerInsumoPorId.mockReset();
    servicioInsumos.actualizarInsumo.mockReset();
    servicioInsumos.actualizarInsumo.mockReturnValue(of({
      id: 1,
      nombre: 'Guantes',
      marcaId: 2,
      marca: 'Fabricante',
    }));
    servicioInsumos.cambiarEstadoInsumo.mockReset();
    servicioInsumos.cambiarEstadoInsumo.mockReturnValue(of(undefined));
    catalogos.listar.mockReset();
    catalogos.listar.mockReturnValue(of([]));
    popUp.confirmarToast.mockReset();
    popUp.confirmarToast.mockResolvedValue(true);
    popUp.exito.mockReset();
    popUp.errorDesdeBackend.mockReset();

    await TestBed.configureTestingModule({
      imports: [Insumos],
      providers: [
        { provide: ServicioInsumos, useValue: servicioInsumos },
        { provide: CatalogoService, useValue: catalogos },
        { provide: PopUps, useValue: popUp },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(Insumos);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('crea la vista de insumos con la distribucion de tabla y formulario', () => {
    expect(component).toBeTruthy();
    expect(fixture.nativeElement.querySelector('h3').textContent).toBe('Agregar insumo');
    expect(fixture.nativeElement.querySelector('.trabajoArea > .table-container')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.trabajoArea > .formulario-container')).not.toBeNull();
  });

  it('ofrece solo nombre y fabricante como criterios de busqueda', () => {
    const selector: HTMLSelectElement = fixture.nativeElement.querySelector('.buscador .selector');
    expect(Array.from(selector.options, (opcion) => opcion.textContent)).toEqual(['Nombre', 'Fabricante']);
    expect(fixture.nativeElement.querySelector('.buscador input[type="search"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.btnLupa .bi-search')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-tab-switch').textContent).toContain('Activos');
    expect(fixture.nativeElement.querySelector('app-tab-switch').textContent).toContain('Inactivos');
  });

  it('muestra la columna de detalle sin registros inventados', () => {
    const columnas: NodeListOf<HTMLTableCellElement> = fixture.nativeElement.querySelectorAll('thead th');
    expect(Array.from(columnas, (columna) => columna.textContent)).toEqual([
      'No.', 'Nombre', 'Detalle', 'Fabricante', 'Acciones',
    ]);
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(0);
  });

  it('incluye detalle opcional en el formulario y usa submit para guardar', () => {
    const campos: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('form input, form select');
    expect(Array.from(campos, (campo) => campo.getAttribute('name'))).toEqual([
      'nombre',
      'detalle',
      'fabricante',
    ]);
    const detalle: HTMLInputElement = fixture.nativeElement.querySelector('#detalleInsumo');
    expect(detalle.required).toBe(false);
    const fabricante: HTMLSelectElement = fixture.nativeElement.querySelector('#fabricanteInsumo');
    expect(fabricante.options.length).toBe(1);
    const botones: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('.botones button');
    expect(Array.from(botones, (boton) => boton.textContent)).toEqual(['Cancelar', 'Guardar']);
    expect(Array.from(botones, (boton) => boton.type)).toEqual(['button', 'submit']);
  });

  it('permite guardar sin detalle y lo incluye en el request cuando se proporciona', async () => {
    component.insumo = { nombre: 'Guantes', marcaId: 2, detalle: '' };
    expect(component.formularioValido()).toBe(true);
    await component.guardarInsumo();
    expect(servicioInsumos.crearInsumo).toHaveBeenCalledWith({
      nombre: 'Guantes',
      marcaId: 2,
      detalle: '',
    });

    component.insumo = { nombre: 'Gasas', marcaId: 3, detalle: 'Estériles' };
    expect(component.formularioValido()).toBe(true);
  });

  it('precarga el detalle al editar y lo muestra en la tabla', async () => {
    const respuesta: InsumoResponse = {
      id: 7,
      nombre: 'Guantes',
      marcaId: 2,
      marca: 'Fabricante',
      detalle: 'Desechables',
    };
    servicioInsumos.obtenerInsumoPorId.mockReturnValueOnce(of(respuesta));
    component.preactualizar(respuesta.id);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(component.insumo.detalle).toBe('Desechables');
    expect((fixture.nativeElement.querySelector('#detalleInsumo') as HTMLInputElement).value)
      .toBe('Desechables');

    const insumo: Insumo = {
      id: respuesta.id,
      nombre: respuesta.nombre,
      marca: { idMarca: respuesta.marcaId, nombreMarca: respuesta.marca },
      detalle: respuesta.detalle,
      estado: true,
    };
    servicioInsumos.listarInsumos.mockReturnValueOnce(of([insumo]));
    component.cambiarFiltroActivo(false);
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('tbody tr td:nth-child(3)').textContent.trim())
      .toBe('Desechables');
  });
});