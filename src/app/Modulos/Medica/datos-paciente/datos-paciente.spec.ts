import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DatosPaciente } from './datos-paciente';

describe('DatosPaciente', () => {
  let component: DatosPaciente;
  let fixture: ComponentFixture<DatosPaciente>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DatosPaciente],
    }).compileComponents();

    fixture = TestBed.createComponent(DatosPaciente);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  const elementos = <T extends Element>(selector: string): NodeListOf<T> =>
    fixture.nativeElement.querySelectorAll(selector);

  const elemento = <T extends Element>(selector: string): T =>
    fixture.nativeElement.querySelector(selector);

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // El bloque plegable es el que usan las pantallas del módulo (evaluación clínica, indicaciones
  // médicas): la pestaña lateral lo abre y lo cierra y el chevron del encabezado pliega el cuerpo.
  const pestana = (): HTMLButtonElement => elemento<HTMLButtonElement>('.ficha-pestana');

  const plegar = (): HTMLButtonElement => elemento<HTMLButtonElement>('.ficha-plegar');

  it('en su forma fija muestra el bloque siempre desplegado, sin controles para plegarlo', () => {
    expect(elemento<HTMLElement>('.ficha')).not.toBeNull();
    expect(elemento<HTMLElement>('.ficha--plegable')).toBeNull();
    expect(elemento<HTMLElement>('.ficha-pestana')).toBeNull();
    expect(elemento<HTMLElement>('.ficha-plegar')).toBeNull();
    expect(elemento<HTMLButtonElement>('.ficha button')).toBeNull();
  });

  it('muestra los datos del paciente y de la atención vigente', () => {
    expect(elementos<HTMLElement>('.ficha-datos .ficha-dato').length).toBe(2);
    expect(elementos<HTMLElement>('.ficha-atencion .ficha-atencion_dato').length).toBe(3);
    expect(elemento<HTMLElement>('.motivo-card').textContent).toContain('Dolor abdominal');
    expect(elemento<HTMLElement>('.alergias-card').textContent).toContain('Ninguna conocida');
    expect(elementos<HTMLLIElement>('.ficha-vitales li').length).toBe(4);
  });

  it('abre y cierra el bloque desde la pestaña lateral cuando es plegable', () => {
    // El estado lo fija la pantalla que usa la ficha, como en evaluación clínica o indicaciones
    fixture.componentRef.setInput('plegable', true);
    fixture.componentRef.setInput('abierto', false);
    fixture.detectChanges();

    expect(elemento<HTMLElement>('.ficha')).toBeNull();
    expect(pestana().getAttribute('aria-expanded')).toBe('false');
    expect(pestana().querySelector('.ficha-pestana_texto')?.textContent).toContain(
      'Ver datos del paciente',
    );

    const cambios: boolean[] = [];
    component.abiertoCambia.subscribe((abierto) => cambios.push(abierto));

    pestana().click();

    expect(cambios).toEqual([true]);

    fixture.componentRef.setInput('abierto', true);
    fixture.detectChanges();

    expect(elemento<HTMLElement>('.ficha')).not.toBeNull();
    expect(elemento<HTMLElement>('.ficha--plegable')).not.toBeNull();
    expect(pestana().getAttribute('aria-expanded')).toBe('true');
    expect(pestana().querySelector('i')?.classList.contains('bi-chevron-right')).toBe(true);
    expect(elemento<HTMLElement>('.ficha-pestana_texto')).toBeNull();
  });

  it('pliega el cuerpo de la ficha sin ocultar el título desde el chevron del encabezado', () => {
    fixture.componentRef.setInput('plegable', true);
    fixture.detectChanges();

    expect(plegar().getAttribute('aria-expanded')).toBe('true');
    expect(plegar().querySelector('i')?.classList.contains('bi-chevron-down')).toBe(true);

    const cambios: boolean[] = [];
    component.cuerpoVisibleCambia.subscribe((visible) => cambios.push(visible));

    plegar().click();

    expect(cambios).toEqual([false]);

    fixture.componentRef.setInput('cuerpoVisible', false);
    fixture.detectChanges();

    expect(plegar().getAttribute('aria-expanded')).toBe('false');
    expect(plegar().querySelector('i')?.classList.contains('bi-chevron-up')).toBe(true);
    expect(elemento<HTMLElement>('.ficha-titulo').textContent?.trim()).toBe(
      'Información del paciente',
    );
    expect(elemento<HTMLElement>('.ficha-cuerpo').classList.contains('ficha-cuerpo--plegado')).toBe(
      true,
    );
  });

  it('mantiene el cuerpo desplegado en su forma fija aunque se pida plegarlo', () => {
    fixture.componentRef.setInput('cuerpoVisible', false);
    fixture.detectChanges();

    expect(elemento<HTMLElement>('.ficha-cuerpo').classList.contains('ficha-cuerpo--plegado')).toBe(
      false,
    );
    expect(elemento<HTMLElement>('.ficha-plegar')).toBeNull();
  });

  it('lista las alergias registradas cuando el paciente las tiene', () => {
    // La ficha se dibuja ya con el paciente alérgico, como llegarían sus datos del backend
    const fichaConAlergias = TestBed.createComponent(DatosPaciente);
    fichaConAlergias.componentInstance.alergias = ['Penicilina'];
    fichaConAlergias.detectChanges();

    const raiz = fichaConAlergias.nativeElement as HTMLElement;
    const alergias = raiz.querySelector<HTMLElement>('.alergias-card');
    expect(alergias?.tagName).toBe('UL');
    expect(alergias?.textContent).not.toContain('Ninguna conocida');

    const items = raiz.querySelectorAll<HTMLElement>('.alergias-card li');
    expect(items.length).toBe(1);
    expect(items[0].textContent?.trim()).toBe('Penicilina');
  });
});
