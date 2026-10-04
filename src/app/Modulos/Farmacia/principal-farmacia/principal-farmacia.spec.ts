import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { rutasFarmacia } from '../rutasFarmacia';
import { ServicioMedicamento } from '../medicamentos/data/servicio-medicamento';
import { CatalogoService } from '../../Catalogos/data/serviceCatalogo';

import { PrincipalFarmacia } from './principal-farmacia';

describe('PrincipalFarmacia', () => {
  let component: PrincipalFarmacia;
  let fixture: ComponentFixture<PrincipalFarmacia>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PrincipalFarmacia],
      providers: [
        provideRouter([{ path: 'farmacia', component: PrincipalFarmacia, children: rutasFarmacia }]),
        { provide: ServicioMedicamento, useValue: { traerMedicamentoLog: () => of([]) } },
        { provide: CatalogoService, useValue: { listar: () => of([]) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PrincipalFarmacia);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('redirige productos a medicamentos con su formulario permanente', async () => {
    const harness = await RouterTestingHarness.create('/farmacia/productos');

    expect(TestBed.inject(Router).url).toBe('/farmacia/medicamentos');
    expect(harness.routeNativeElement?.querySelector('app-medicamentos')).not.toBeNull();
    expect(harness.routeNativeElement?.querySelectorAll('form input, form select').length).toBe(6);
    const opciones = Array.from(harness.routeNativeElement!.querySelectorAll('.option'));
    expect(opciones.map((opcion) => opcion.textContent?.trim())).toContain('Medicamentos');
    expect(opciones.map((opcion) => opcion.textContent?.trim())).toContain('Insumos');
    expect(opciones.map((opcion) => opcion.textContent?.trim())).not.toContain('Productos');
  });

  it('navega entre Insumos y Medicamentos usando sus enlaces independientes', async () => {
    const harness = await RouterTestingHarness.create('/farmacia/insumos');
    expect(harness.routeNativeElement?.querySelector('app-insumos h3')?.textContent).toBe('Agregar insumo');
    expect(harness.routeNativeElement?.querySelectorAll('app-insumos form input, app-insumos form select').length).toBe(2);

    const medicamentos = Array.from(harness.routeNativeElement!.querySelectorAll<HTMLElement>('.option'))
      .find((opcion) => opcion.textContent?.trim() === 'Medicamentos')!;
    medicamentos.click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/farmacia/medicamentos');
    expect(harness.routeNativeElement?.querySelector('app-medicamentos')).not.toBeNull();

    const insumos = Array.from(harness.routeNativeElement!.querySelectorAll<HTMLElement>('.option'))
      .find((opcion) => opcion.textContent?.trim() === 'Insumos')!;
    insumos.click();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/farmacia/insumos');
    expect(harness.routeNativeElement?.querySelector('app-insumos')).not.toBeNull();
  });
});
