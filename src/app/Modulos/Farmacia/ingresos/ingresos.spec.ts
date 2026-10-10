import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { PopUps } from '../../../shared/popUps/popUpsService';
import { ServicioInsumos } from '../insumos/data/servicio-insumos';
import { ServicioMedicamento } from '../medicamentos/data/servicio-medicamento';

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
  const popUp = {
    errorDesdeBackend: vi.fn(),
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
    popUp.errorDesdeBackend.mockReset();

    await TestBed.configureTestingModule({
      imports: [Ingresos],
      providers: [
        { provide: ServicioMedicamento, useValue: servicioMedicamento },
        { provide: ServicioInsumos, useValue: servicioInsumos },
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

  it('returns to ingresos when canceling a purchase', () => {
    const registerButton: HTMLButtonElement =
      fixture.nativeElement.querySelector('.btn._principal');
    registerButton.click();
    fixture.detectChanges();

    const cancelButton: HTMLButtonElement = fixture.nativeElement.querySelector('button._cancelar');
    cancelButton.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-agregar-compra')).toBeNull();
    expect(fixture.nativeElement.querySelector('.detalle-compra')).toBeTruthy();
  });
});
