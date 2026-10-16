import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Alta } from './alta';

describe('Alta', () => {
  let component: Alta;
  let fixture: ComponentFixture<Alta>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Alta],
    }).compileComponents();

    fixture = TestBed.createComponent(Alta);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  const elementos = <T extends Element>(selector: string): NodeListOf<T> =>
    fixture.nativeElement.querySelectorAll(selector);

  const elemento = <T extends Element>(selector: string): T =>
    fixture.nativeElement.querySelector(selector);

  // Registro del egreso: el botón que abre el tratamiento y el propio panel del registro
  const botonAgregarTratamiento = (): HTMLButtonElement =>
    elemento<HTMLButtonElement>('.egreso-acciones button._principal');

  const escribir = async (selector: string, valor: string): Promise<void> => {
    const control = elemento<HTMLInputElement>(selector);
    control.value = valor;
    control.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };

  const elegir = async (selector: string, valor: string): Promise<void> => {
    const control = elemento<HTMLSelectElement>(selector);
    control.value = valor;
    control.dispatchEvent(new Event('change'));
    await fixture.whenStable();
  };

  /** Abre la tarjeta de medicamentos con el botón Agregar tratamiento del registro del egreso. */
  const abrirTratamiento = async (): Promise<void> => {
    botonAgregarTratamiento().click();
    await fixture.whenStable();
  };

  /** Busca en el catálogo de la tarjeta y elige la fila indicada de los resultados. */
  const elegirMedicamento = async (texto: string, fila: number): Promise<void> => {
    await escribir('#medicamentoTratamiento', texto);
    elemento<HTMLButtonElement>('.medicamento-buscador .btnLupa').click();
    await fixture.whenStable();

    elementos<HTMLTableRowElement>('.medicamento-resultados tbody tr.fila-seleccionable')[
      fila
    ].click();
    await fixture.whenStable();
  };

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('oculta el registro del egreso y muestra la tarjeta de medicamentos al agregar el tratamiento', async () => {
    expect(elemento('.panel-registro')).not.toBeNull();

    await abrirTratamiento();

    // El registro del egreso deja su sitio a la tarjeta de medicamentos
    expect(elemento('.panel-registro')).toBeNull();
    expect(elemento('.panel-tratamiento .panel-titulo').textContent?.trim()).toBe('Medicamentos');
    expect(elemento('#medicamentoTratamiento')).not.toBeNull();
    expect(elemento('#cantidadTratamiento')).not.toBeNull();
    expect(component.mostrandoMedicamentos).toBe(true);
  });

  it('devuelve el registro del egreso al cancelar la captura del tratamiento', async () => {
    await abrirTratamiento();

    elemento<HTMLButtonElement>('.medicamento-acciones button._cancelar').click();
    await fixture.whenStable();

    // Sin medicamentos agregados el tratamiento sigue vacío y vuelve el registro del egreso
    expect(component.tratamiento.length).toBe(0);
    expect(component.mostrandoMedicamentos).toBe(false);
    expect(elemento('.panel-registro')).not.toBeNull();
    expect(elemento('.panel-tratamiento')).toBeNull();
  });

  it('suma al tratamiento el medicamento capturado en la tarjeta y vuelve al registro', async () => {
    await abrirTratamiento();
    await elegirMedicamento('amoxicilina', 0);
    await escribir('#cantidadTratamiento', '500 mg');
    await escribir('#frecuenciaTratamiento', '8');
    await elegir('#duracionTipoTratamiento', 'dias');
    await escribir('#duracionCantidadTratamiento', '7');

    elemento<HTMLButtonElement>('.medicamento-acciones button._guardar').click();
    await fixture.whenStable();

    expect(component.tratamiento.length).toBe(1);
    expect(elemento('.panel-registro')).not.toBeNull();
    expect(elemento<HTMLElement>('.tratamiento-titulo').textContent?.trim()).toBe(
      'Tratamiento indicado (1)',
    );
    expect(elemento<HTMLElement>('.tratamiento-nombre').textContent?.trim()).toBe(
      'Amoxicilina Bayer tabletas de 500 mg',
    );
    const detalle = elemento<HTMLElement>('.tratamiento-detalle').textContent ?? '';
    expect(detalle).toContain('500 mg');
    expect(detalle).toContain('Cada 8 horas');
    expect(detalle).toContain('7 días');
  });

  it('quita del tratamiento el medicamento pulsado', async () => {
    await abrirTratamiento();
    await elegirMedicamento('ibuprofeno', 0);
    elemento<HTMLButtonElement>('.medicamento-acciones button._guardar').click();
    await fixture.whenStable();

    expect(component.tratamiento.length).toBe(1);

    elemento<HTMLButtonElement>('.tratamiento-quitar').click();
    await fixture.whenStable();

    expect(component.tratamiento.length).toBe(0);
    expect(elemento('.tratamiento-lista')).toBeNull();
  });
});
