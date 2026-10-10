import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TabSwitch } from './tab-switch';

describe('TabSwitch', () => {
  let component: TabSwitch;
  let fixture: ComponentFixture<TabSwitch>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TabSwitch],
    }).compileComponents();

    fixture = TestBed.createComponent(TabSwitch);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it.each([true, false])('selecciona la opcion pulsada sin alternar la ya seleccionada: %s', async (estado) => {
    fixture.componentRef.setInput('mostrarActivos', estado);
    await fixture.whenStable();
    const emitir = vi.spyOn(component.opcionCambiada, 'emit');
    const opciones: NodeListOf<HTMLDivElement> = fixture.nativeElement.querySelectorAll('.miniSubMenu > div');
    const seleccionada = opciones[estado ? 0 : 1];
    const otra = opciones[estado ? 1 : 0];
    seleccionada.click();
    expect(component.mostrarActivos).toBe(estado);
    expect(emitir).not.toHaveBeenCalled();
    otra.click();
    await fixture.whenStable();
    expect(component.mostrarActivos).toBe(!estado);
    expect(emitir).toHaveBeenCalledExactlyOnceWith(!estado);
    expect(otra.classList.contains('op2')).toBe(true);
    otra.click();
    expect(emitir).toHaveBeenCalledTimes(1);
    seleccionada.click();
    expect(component.mostrarActivos).toBe(estado);
    expect(emitir).toHaveBeenLastCalledWith(estado);
  });

  it('no cambia de opcion mientras esta deshabilitado', async () => {
    fixture.componentRef.setInput('disabled', true);
    await fixture.whenStable();
    const emitir = vi.spyOn(component.opcionCambiada, 'emit');
    const contenedor: HTMLDivElement = fixture.nativeElement.querySelector('.miniSubMenu');
    const otra: HTMLDivElement = fixture.nativeElement.querySelectorAll('.miniSubMenu > div')[1];

    otra.click();
    await fixture.whenStable();

    expect(component.mostrarActivos).toBe(true);
    expect(emitir).not.toHaveBeenCalled();
    expect(contenedor.classList.contains('deshabilitado')).toBe(true);
    expect(contenedor.getAttribute('aria-disabled')).toBe('true');
  });

  it('no expone aria-disabled cuando esta habilitado', async () => {
    const contenedor: HTMLDivElement = fixture.nativeElement.querySelector('.miniSubMenu');

    expect(contenedor.classList.contains('deshabilitado')).toBe(false);
    expect(contenedor.getAttribute('aria-disabled')).toBeNull();
  });
});
