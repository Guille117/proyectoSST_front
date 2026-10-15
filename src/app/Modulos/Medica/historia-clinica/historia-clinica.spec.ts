import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HistoriaClinica } from './historia-clinica';

describe('HistoriaClinica', () => {
  let component: HistoriaClinica;
  let fixture: ComponentFixture<HistoriaClinica>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HistoriaClinica],
    }).compileComponents();

    fixture = TestBed.createComponent(HistoriaClinica);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  const elemento = <T extends Element>(selector: string): T =>
    fixture.nativeElement.querySelector(selector);

  // Selectores semánticos: los botones usan las clases globales de src/styles/botonesStyle.scss
  const campo = (): HTMLTextAreaElement => elemento<HTMLTextAreaElement>('.historia-campo');
  const botonEditar = (): HTMLButtonElement =>
    elemento<HTMLButtonElement>('.historia-acciones button[type="button"]');
  const botonGuardar = (): HTMLButtonElement =>
    elemento<HTMLButtonElement>('.historia-acciones button[type="submit"]');

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ubica las acciones del cuadro en la fila compartida y con los estilos globales', () => {
    const acciones = elemento<HTMLElement>('.historia-acciones');

    expect(acciones.classList.contains('acciones-formulario')).toBe(true);
    expect(botonEditar().classList.contains('_editar')).toBe(true);
    expect(botonGuardar().classList.contains('_guardar')).toBe(true);
  });

  it('abre la pantalla con el cuadro en modo lectura', () => {
    expect(campo().value).toBe(component.historiaClinica);
    expect(campo().readOnly).toBe(true);
    expect(campo().classList.contains('historia-campo--lectura')).toBe(true);
    expect(botonEditar().disabled).toBe(false);
    expect(botonGuardar().disabled).toBe(true);
  });

  it('habilita la escritura al pulsar Editar', async () => {
    botonEditar().click();
    await fixture.whenStable();

    expect(component.modoEdicion).toBe(true);
    expect(campo().readOnly).toBe(false);
    expect(campo().classList.contains('historia-campo--lectura')).toBe(false);
    expect(botonEditar().disabled).toBe(true);
    expect(botonGuardar().disabled).toBe(false);
  });

  it('conserva lo escrito y cierra la edición al guardar', async () => {
    botonEditar().click();
    await fixture.whenStable();

    campo().value = 'Historia clínica corregida.';
    campo().dispatchEvent(new Event('input'));
    await fixture.whenStable();

    expect(component.historiaClinica).toBe('Historia clínica corregida.');

    botonGuardar().click();
    await fixture.whenStable();

    expect(component.modoEdicion).toBe(false);
    expect(campo().readOnly).toBe(true);
    expect(campo().value).toBe('Historia clínica corregida.');
    expect(botonGuardar().disabled).toBe(true);
  });
});
