import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Observable, of, throwError } from 'rxjs';
import { OpcionOtroComponent } from '../../../shared/opcion-otro/opcion-otro';
import { PopUps } from '../../../shared/popUps/popUpsService';
import { CatalogoService } from '../../Catalogos/data/serviceCatalogo';
import { Camas } from './camas';
import { camaResponseSimple } from './data/interfazCama';
import { ServicioCama } from './data/servicioCama';

describe('Camas', () => {
  let component: Camas;
  let fixture: ComponentFixture<Camas>;
  let servicioCama: Record<string, ReturnType<typeof vi.fn>>;
  let popUp: Record<string, ReturnType<typeof vi.fn>>;
  let catalogos: {
    listar2: ReturnType<typeof vi.fn>;
    crear2: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    servicioCama = {
      crearCama: vi.fn(() => of({})),
      actualizarCama: vi.fn(() => of({})),
      traerReferencias: vi.fn(() =>
        of({ habitacionId: 1, tipoId: 2, areaId: 3, precio: 175 }),
      ),
      listarCamas: vi.fn(() => of([])),
      listarCamasOcupadas: vi.fn(() => of([])),
      buscarCamas: vi.fn(() => of([])),
      cambiarEstadoCama: vi.fn(() => of({})),
      cambiarActivoCama: vi.fn(() => of({})),
    };

    popUp = {
      confirmarToast: vi.fn(() => Promise.resolve(true)),
      exito: vi.fn(),
      error: vi.fn(),
      errorDesdeBackend: vi.fn(),
      formIncompleto: vi.fn(),
    };

    catalogos = {
      listar2: vi.fn(() => of([])),
      crear2: vi.fn((recurso: string) => of({ id: 9, nombre: recurso })),
    };

    await TestBed.configureTestingModule({
      imports: [Camas],
      providers: [
        { provide: ServicioCama, useValue: servicioCama },
        { provide: CatalogoService, useValue: catalogos },
        { provide: PopUps, useValue: popUp },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Camas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  function abrirOtro(id: string): OpcionOtroComponent {
    const select: HTMLSelectElement = fixture.nativeElement.querySelector(`#${id}`);
    const opcionOtro = Array.from(select.options).find(
      (opcion) => opcion.textContent?.trim() === 'Otro',
    );
    select.selectedIndex = opcionOtro?.index ?? -1;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    const componentes = fixture.debugElement.queryAll(By.css('app-opcion-otro'));
    return componentes[componentes.length - 1].componentInstance as OpcionOtroComponent;
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('crea la cama con el precio ingresado', async () => {
    component.camaRequest = { habitacionId: 1, tipoId: 2, areaId: 3 };
    component.precio = 175.5;

    await component.crearCama();

    expect(servicioCama['crearCama']).toHaveBeenCalledWith({
      habitacionId: 1,
      tipoId: 2,
      areaId: 3,
      precio: 175.5,
    });
  });

  it('crea el área pendiente antes de guardar la cama y usa el nuevo id', async () => {
    component.camaRequest = { habitacionId: 1, tipoId: 2, areaId: 0 };
    component.precio = 175;

    const otro = abrirOtro('area');
    otro.nombre = 'Área nueva';
    fixture.detectChanges();
    expect(component.puedeGuardar()).toBe(true);

    await component.crearCama();

    expect(catalogos.crear2).toHaveBeenCalledWith('areas', { nombre: 'Área nueva' });
    expect(servicioCama['crearCama']).toHaveBeenCalledWith({
      habitacionId: 1,
      tipoId: 2,
      areaId: 9,
      precio: 175,
    });
    expect(catalogos.crear2.mock.invocationCallOrder[0])
      .toBeLessThan(servicioCama['crearCama'].mock.invocationCallOrder[0]);
  });

  it('crea las selecciones pendientes en orden antes de guardar la cama', async () => {
    catalogos.crear2.mockImplementation((recurso: string) => {
      const ids: Record<string, number> = { areas: 9, tiposCama: 10, habitaciones: 11 };
      return of({ id: ids[recurso], nombre: recurso });
    });

    const area = abrirOtro('area');
    area.nombre = 'Área nueva';
    const tipo = abrirOtro('tipoCama');
    tipo.nombre = 'Tipo nuevo';
    const habitacion = abrirOtro('habitacion');
    habitacion.nombre = 'Habitación nueva';
    fixture.detectChanges();

    await component.crearCama();

    expect(catalogos.crear2.mock.calls.map(([recurso]) => recurso)).toEqual([
      'areas',
      'tiposCama',
      'habitaciones',
    ]);
    expect(servicioCama['crearCama']).toHaveBeenCalledWith({
      habitacionId: 11,
      tipoId: 10,
      areaId: 9,
      precio: 0,
    });
  });

  it('no guarda la cama si falla la creación de una selección pendiente', async () => {
    catalogos.crear2.mockReturnValueOnce(throwError(() => new Error('fallo')));
    component.camaRequest = { habitacionId: 1, tipoId: 2, areaId: 0 };
    const otro = abrirOtro('area');
    otro.nombre = 'Área nueva';
    fixture.detectChanges();

    await component.crearCama();

    expect(servicioCama['crearCama']).not.toHaveBeenCalled();
    expect(popUp['errorDesdeBackend']).toHaveBeenCalled();
  });

  it('no guarda si la selección pendiente está vacía y avisa al usuario', async () => {
    component.camaRequest = { habitacionId: 1, tipoId: 2, areaId: 0 };
    abrirOtro('area');

    await component.crearCama();

    expect(catalogos.crear2).not.toHaveBeenCalled();
    expect(servicioCama['crearCama']).not.toHaveBeenCalled();
    expect(popUp['formIncompleto']).toHaveBeenCalledWith(
      'Completa el valor de «Área» o cancélalo antes de guardar.',
    );
  });

  it('precarga el precio guardado al editar', () => {
    component.precargarCama(9);

    expect(component.precio).toBe(175);
    expect(component.isEditing).toBe(true);
  });

  it('activa guardar cambios cuando solo cambia el precio', () => {
    component.precargarCama(9);
    component.precio = 200;

    expect(component.puedeGuardar()).toBe(true);
  });

  it('actualiza la cama con el precio ingresado', async () => {
    component.precargarCama(9);
    component.precio = 200;

    await component.actualizarCama();

    expect(servicioCama['actualizarCama']).toHaveBeenCalledWith(9, {
      habitacionId: 1,
      tipoId: 2,
      areaId: 3,
      precio: 200,
    });
  });

  it('muestra el precio real de la cama y un guion cuando no tiene precio', () => {
    expect(component.precioPorDia({ precio: 175.5 } as camaResponseSimple)).toBe('Q 175.50');
    expect(component.precioPorDia({ precio: null } as camaResponseSimple)).toBe('—');
  });
});
