import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AgregarCompra } from './agregar-compra';

describe('AgregarCompra', () => {
  let component: AgregarCompra;
  let fixture: ComponentFixture<AgregarCompra>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AgregarCompra],
    }).compileComponents();

    fixture = TestBed.createComponent(AgregarCompra);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('navigates between purchase steps with the step buttons', () => {
    const [stepOne, stepTwo] = fixture.nativeElement.querySelectorAll('button.paso-compra');

    expect(stepOne).toBeInstanceOf(HTMLButtonElement);
    expect(stepOne.classList.contains('activo')).toBe(true);

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
    const expiration: HTMLInputElement = fixture.nativeElement.querySelector('[name="concentracion"]');
    const requiredFields = ['nombre', 'precioCompra', 'precioVenta', 'cantidad'];

    expect(saveButton.disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('label[for="concentracionMedicamento"] .campo-obligatorio')).toBeTruthy();

    for (const name of requiredFields) {
      const input: HTMLInputElement = fixture.nativeElement.querySelector(`[name="${name}"]`);
      input.value = '1';
      input.dispatchEvent(new Event('input'));
    }
    expiration.value = '2027-01-01';
    expiration.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(saveButton.disabled).toBe(false);

    const insumosOption: HTMLElement = fixture.nativeElement.querySelector('app-tab-switch .miniSubMenu .op');
    insumosOption.click();
    fixture.detectChanges();

    expiration.value = '';
    expiration.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(saveButton.disabled).toBe(false);
    expect(fixture.nativeElement.querySelector('label[for="concentracionMedicamento"] .campo-obligatorio')).toBeNull();
  });
});
