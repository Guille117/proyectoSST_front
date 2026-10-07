import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Ingresos } from './ingresos';

describe('Ingresos', () => {
  let component: Ingresos;
  let fixture: ComponentFixture<Ingresos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Ingresos],
    }).compileComponents();

    fixture = TestBed.createComponent(Ingresos);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('replaces the ingresos view with AgregarCompra when registering a purchase', () => {
    const registerButton: HTMLButtonElement = fixture.nativeElement.querySelector('.btn._principal');

    registerButton.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-agregar-compra')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.detalle-compra')).toBeNull();
  });

  it('returns to ingresos when canceling a purchase', () => {
    const registerButton: HTMLButtonElement = fixture.nativeElement.querySelector('.btn._principal');
    registerButton.click();
    fixture.detectChanges();

    const cancelButton: HTMLButtonElement = fixture.nativeElement.querySelector('button._cancelar');
    cancelButton.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('app-agregar-compra')).toBeNull();
  expect(fixture.nativeElement.querySelector('.detalle-compra')).toBeTruthy();
  });
});
