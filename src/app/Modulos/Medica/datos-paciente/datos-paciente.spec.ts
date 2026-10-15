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

  it('muestra el bloque siempre desplegado, sin controles para plegarlo', () => {
    expect(elemento<HTMLElement>('.ficha')).not.toBeNull();
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
});
