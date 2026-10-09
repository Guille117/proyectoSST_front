import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Inventario } from './inventario';

describe('Inventario', () => {
  let component: Inventario;
  let fixture: ComponentFixture<Inventario>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Inventario],
    }).compileComponents();

    fixture = TestBed.createComponent(Inventario);
    component = fixture.componentInstance;
    await fixture.whenStable();
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
    expect(fixture.nativeElement.querySelector('.estado-chip.activo')).toBeNull();
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

    opciones[0].click();
    fixture.detectChanges();

    expect(component.isMedicamento).toBe(true);
    expect(opciones[0].classList.contains('op2')).toBe(true);
  });

  it('selecciona un solo estado y lo limpia al volver a pulsarlo', () => {
    const chips: NodeListOf<HTMLButtonElement> =
      fixture.nativeElement.querySelectorAll('.estado-chip');

    chips[0].click();
    fixture.detectChanges();

    expect(component.estadoSeleccionado).toBe('vencidos');
    expect(chips[0].classList.contains('activo')).toBe(true);
    expect(chips[0].getAttribute('aria-pressed')).toBe('true');

    chips[2].click();
    fixture.detectChanges();

    expect(component.estadoSeleccionado).toBe('stock-bajo');
    expect(chips[0].classList.contains('activo')).toBe(false);
    expect(chips[2].classList.contains('activo')).toBe(true);

    chips[2].click();
    fixture.detectChanges();

    expect(component.estadoSeleccionado).toBeNull();
    expect(chips[2].classList.contains('activo')).toBe(false);
    expect(chips[2].getAttribute('aria-pressed')).toBe('false');
  });
});
