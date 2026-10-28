import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
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
      errorDesdeBackend: vi.fn(),
      formIncompleto: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [Camas],
      providers: [
        { provide: ServicioCama, useValue: servicioCama },
        {
          provide: CatalogoService,
          useValue: { listar2: vi.fn(() => of([])), crear2: vi.fn(() => of({})) },
        },
        { provide: PopUps, useValue: popUp },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Camas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('crea la cama con el precio ingresado', () => {
    component.camaRequest = { habitacionId: 1, tipoId: 2, areaId: 3 };
    component.precio = 175.5;

    component.crearCama();

    expect(servicioCama['crearCama']).toHaveBeenCalledWith({
      habitacionId: 1,
      tipoId: 2,
      areaId: 3,
      precio: 175.5,
    });
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
