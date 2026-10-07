import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Salidas } from './salidas';

describe('Salidas', () => {
  let component: Salidas;
  let fixture: ComponentFixture<Salidas>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Salidas],
    }).compileComponents();

    fixture = TestBed.createComponent(Salidas);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('debe iniciar en la vista de solicitudes', () => {
    fixture.detectChanges();

    expect(component.enDevoluciones()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Detalle de solicitud');
    expect(fixture.nativeElement.textContent).not.toContain('Guardar devolución');
  });

  it('debe cambiar a la vista de devoluciones y volver a la de solicitudes', () => {
    fixture.detectChanges();

    component.seleccionarVista(true);
    fixture.detectChanges();

    expect(component.enDevoluciones()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Detalle de devolución');
    expect(fixture.nativeElement.textContent).toContain('Guardar devolución');

    component.seleccionarVista(false);
    fixture.detectChanges();

    expect(component.enDevoluciones()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Detalle de solicitud');
  });

  it('debe cambiar de vista al hacer clic en las opciones del submenú', () => {
    fixture.detectChanges();

    const opciones = fixture.nativeElement.querySelectorAll(
      '.submenu-detalle .option',
    ) as HTMLElement[];
    expect(opciones.length).toBe(2);

    opciones[1].click();
    fixture.detectChanges();
    expect(component.enDevoluciones()).toBe(true);

    opciones[0].click();
    fixture.detectChanges();
    expect(component.enDevoluciones()).toBe(false);
  });
});
