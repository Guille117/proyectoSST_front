import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Diagnostico } from './diagnostico';
import { PopUps } from '../../../shared/popUps/popUpsService';

describe('Diagnostico', () => {
  let component: Diagnostico;
  let fixture: ComponentFixture<Diagnostico>;
  const popUps = {
    confirmarToast: vi.fn(),
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    popUps.confirmarToast.mockResolvedValue(true);

    await TestBed.configureTestingModule({
      imports: [Diagnostico],
      providers: [{ provide: PopUps, useValue: popUps }],
    }).compileComponents();

    fixture = TestBed.createComponent(Diagnostico);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  const elementos = <T extends Element>(selector: string): NodeListOf<T> =>
    fixture.nativeElement.querySelectorAll(selector);

  const elemento = <T extends Element>(selector: string): T =>
    fixture.nativeElement.querySelector(selector);

  // Selectores semánticos: los botones usan las clases globales de src/styles/botonesStyle.scss
  const campo = (): HTMLInputElement => elemento<HTMLInputElement>('#diagnostico');
  const botonAgregar = (): HTMLButtonElement =>
    elemento<HTMLButtonElement>('.adicionales-encabezado button');
  const botonGuardar = (): HTMLButtonElement =>
    elemento<HTMLButtonElement>('.diagnostico-acciones button[type="submit"]');
  const filas = (): NodeListOf<HTMLTableRowElement> => elementos<HTMLTableRowElement>('tbody tr');

  const escribir = async (descripcion: string): Promise<void> => {
    campo().value = descripcion;
    campo().dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ubica las acciones del formulario en la fila compartida y con los estilos globales', () => {
    const acciones = elemento<HTMLElement>('.diagnostico-acciones');

    expect(acciones.classList.contains('acciones-formulario')).toBe(true);
    expect(botonGuardar().classList.contains('_guardar')).toBe(true);
  });

  it('abre la pantalla con el tipo Principal seleccionado y los adicionales registrados', () => {
    expect(campo().value).toBe(component.diagnostico);
    expect(component.tipoSeleccionado.id).toBe('principal');
    expect(elementos<HTMLButtonElement>('.tipo-opcion').length).toBe(3);
    expect(elemento<HTMLButtonElement>('.tipo-opcion--activo').textContent).toContain('Principal');

    expect(filas().length).toBe(2);
    expect(filas()[0].textContent).toContain('Secundario');
    expect(filas()[0].textContent).toContain('Deshidratación leve');
  });

  it('agrega el diagnóstico escrito con el tipo seleccionado', async () => {
    await escribir('Deshidratación moderada');

    elementos<HTMLButtonElement>('.tipo-opcion')[1].click();
    await fixture.whenStable();

    botonAgregar().click();
    await fixture.whenStable();

    expect(filas().length).toBe(3);
    expect(filas()[2].textContent).toContain('Secundario');
    expect(filas()[2].textContent).toContain('Deshidratación moderada');
    expect(component.diagnostico).toBe('');
    expect(campo().value).toBe('');
  });

  it('no agrega nada cuando el campo está vacío', async () => {
    await escribir('   ');

    botonAgregar().click();
    await fixture.whenStable();

    expect(filas().length).toBe(2);
    expect(component.diagnostico).toBe('   ');
  });

  it('carga la fila elegida en el formulario y la reemplaza al agregarla', async () => {
    elementos<HTMLButtonElement>('tbody .iconEditar')[1].click();
    await fixture.whenStable();

    expect(component.diagnosticoEnEdicion).toBe(2);
    expect(campo().value).toBe('Hipertensión arterial');
    expect(component.tipoSeleccionado.id).toBe('asociado');
    expect(filas()[1].classList.contains('selected-row')).toBe(true);

    await escribir('Hipertensión arterial en control');

    botonAgregar().click();
    await fixture.whenStable();

    expect(filas().length).toBe(2);
    expect(filas()[1].textContent).toContain('Hipertensión arterial en control');
    expect(filas()[1].classList.contains('selected-row')).toBe(false);
    expect(component.diagnosticoEnEdicion).toBeNull();
  });

  it('elimina el diagnóstico adicional confirmado', async () => {
    elementos<HTMLButtonElement>('tbody .iconQuitar')[0].click();
    await fixture.whenStable();

    expect(popUps.confirmarToast).toHaveBeenCalledWith(
      expect.stringContaining('Deshidratación leve'),
    );
    expect(filas().length).toBe(1);
    expect(filas()[0].textContent).toContain('Hipertensión arterial');
  });

  it('conserva el diagnóstico adicional si la confirmación se cancela', async () => {
    popUps.confirmarToast.mockResolvedValue(false);

    elementos<HTMLButtonElement>('tbody .iconQuitar')[0].click();
    await fixture.whenStable();

    expect(filas().length).toBe(2);
  });

  it('deshabilita Guardar y muestra el estado vacío cuando no queda ningún diagnóstico', async () => {
    for (let indice = 0; indice < 2; indice++) {
      elementos<HTMLButtonElement>('tbody .iconQuitar')[0].click();
      await fixture.whenStable();
    }

    await escribir('   ');

    expect(filas().length).toBe(1);
    expect(elemento<HTMLElement>('.tabla-vacia').textContent).toContain('Aún no hay diagnósticos');
    expect(component.hayDiagnostico).toBe(false);
    expect(botonGuardar().disabled).toBe(true);
  });

  it('cancela la captura y deja el formulario listo para un diagnóstico nuevo', async () => {
    elementos<HTMLButtonElement>('tbody .iconEditar')[0].click();
    await fixture.whenStable();

    elemento<HTMLButtonElement>('.diagnostico-acciones button[type="button"]').click();
    await fixture.whenStable();

    expect(campo().value).toBe('');
    expect(component.tipoSeleccionado.id).toBe('principal');
    expect(component.diagnosticoEnEdicion).toBeNull();
    expect(filas().length).toBe(2);
  });
});
