import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MedicamentoIndicacion, MedicamentoTratamiento } from './medicamento-indicacion';

describe('MedicamentoIndicacion', () => {
  let component: MedicamentoIndicacion;
  let fixture: ComponentFixture<MedicamentoIndicacion>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MedicamentoIndicacion],
    }).compileComponents();

    fixture = TestBed.createComponent(MedicamentoIndicacion);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  const elementos = <T extends Element>(selector: string): NodeListOf<T> =>
    fixture.nativeElement.querySelectorAll(selector);

  const elemento = <T extends Element>(selector: string): T =>
    fixture.nativeElement.querySelector(selector);

  // Tabla de resultados de la búsqueda: la lupa del buscador, sus filas y su pie
  const botonBuscar = (): HTMLButtonElement =>
    elemento<HTMLButtonElement>('.medicamento-buscador .btnLupa');

  const filasResultados = (): NodeListOf<HTMLTableRowElement> =>
    elementos<HTMLTableRowElement>('.medicamento-resultados tbody tr.fila-seleccionable');

  const pieDeResultados = (): HTMLElement => elemento<HTMLElement>('.medicamento-resultados tfoot');

  const botonGuardar = (): HTMLButtonElement =>
    elemento<HTMLButtonElement>('.medicamento-acciones button[type="submit"]');

  const botonCancelar = (): HTMLButtonElement =>
    elemento<HTMLButtonElement>('.medicamento-acciones button[type="button"]');

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

  const buscar = async (texto: string): Promise<void> => {
    await escribir('#medicamentoTratamiento', texto);
    botonBuscar().click();
    await fixture.whenStable();
  };

  const paginaSiguiente = async (): Promise<void> => {
    elemento<HTMLButtonElement>('.medicamento-resultados tfoot .derecha').click();
    await fixture.whenStable();
  };

  const elegirMedicamento = async (texto: string, fila: number): Promise<void> => {
    await buscar(texto);
    filasResultados()[fila].click();
    await fixture.whenStable();
  };

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('presenta la tarjeta de medicamentos con el buscador y el resto de campos', () => {
    expect(elemento<HTMLElement>('.panel-titulo').textContent?.trim()).toBe('Medicamentos');
    expect(elemento('.medicamento-buscador .btnLupa')).not.toBeNull();
    expect(elemento('#cantidadTratamiento')).not.toBeNull();
    expect(elemento('#frecuenciaTratamiento')).not.toBeNull();
    expect(elemento('#duracionCantidadTratamiento')).not.toBeNull();
    expect(elemento('#duracionTipoTratamiento')).not.toBeNull();
    expect(elemento('#observacionesTratamiento')).not.toBeNull();
    expect(botonGuardar().classList.contains('_guardar')).toBe(true);
    expect(botonCancelar().classList.contains('_cancelar')).toBe(true);
    // Sin medicamento elegido todavía no hay nada que guardar
    expect(botonGuardar().disabled).toBe(true);
  });

  it('muestra la tabla de resultados con No., Descripción y Administración al buscar', async () => {
    expect(elemento('.medicamento-resultados')).toBeNull();

    await buscar('amoxicilina');

    const encabezados = [
      ...elementos<HTMLTableCellElement>('.medicamento-resultados thead th'),
    ].map((encabezado) => encabezado.textContent?.trim());

    expect(encabezados).toEqual(['No.', 'Descripción', 'Administración']);
    expect(filasResultados().length).toBe(2);
    expect(filasResultados()[0].textContent).toContain('1');
    expect(filasResultados()[0].textContent).toContain('Amoxicilina Bayer tabletas de 500 mg');
    expect(filasResultados()[0].textContent).toContain('Oral');
    expect(filasResultados()[1].textContent).toContain('Intravenosa');
    // Cada fila se elige con el ratón o con el teclado
    expect(filasResultados()[1].tabIndex).toBe(0);
  });

  it('reparte los resultados en páginas de cinco medicamentos desde el pie de la tabla', async () => {
    // La búsqueda sin texto lista el catálogo completo, de cinco en cinco
    await buscar('');

    expect(component.medicamentosEncontrados.length).toBe(8);
    expect(filasResultados().length).toBe(5);
    expect(filasResultados()[0].textContent).toContain('1');
    expect(filasResultados()[4].textContent).toContain('Omeprazol La Santé');
    expect(pieDeResultados().textContent).toContain('Mostrando 5 de 8 resultados');
    expect(pieDeResultados().textContent).toContain('Seleccione un medicamento');

    await paginaSiguiente();

    // La página siguiente continúa la numeración y solo muestra los tres que quedan
    expect(filasResultados().length).toBe(3);
    expect(filasResultados()[0].textContent).toContain('6');
    expect(filasResultados()[0].textContent).toContain('Metoclopramida Genfar');
    expect(pieDeResultados().textContent).toContain('Mostrando 3 de 8 resultados');
  });

  it('avisa cuando la búsqueda no encuentra medicamentos en el catálogo', async () => {
    await buscar('aspirina');

    expect(elemento('.medicamento-resultados table')).toBeNull();
    expect(elemento<HTMLElement>('.medicamento-vacio').textContent?.trim()).toBe(
      'No se encontraron medicamentos que coincidan con «aspirina».',
    );
  });

  it('deja el medicamento elegido en el lugar del buscador y de la tabla', async () => {
    await elegirMedicamento('amoxicilina', 1);

    // La tabla con su buscador desaparecen y en su sitio queda el medicamento elegido
    expect(elemento('.medicamento-resultados')).toBeNull();
    expect(elemento('#medicamentoTratamiento')).toBeNull();
    expect(component.medicamento).toBe('Amoxicilina Bayer suspensión inyectable de 500 mg');
    expect(component.medicamentoElegido?.id).toBe(2);
    expect(elemento<HTMLElement>('.medicamento-elegido-texto').textContent?.trim()).toBe(
      'Amoxicilina Bayer, suspensión inyectable de 500 mg, administración intravenosa',
    );
    expect(botonGuardar().disabled).toBe(false);
  });

  it('oculta el resto de campos mientras la tabla de resultados está desplegada', async () => {
    expect(elemento('#cantidadTratamiento')).not.toBeNull();

    await buscar('amoxicilina');

    // Solo quedan el buscador y su tabla: la captura espera al medicamento elegido
    expect(elemento<HTMLInputElement>('#medicamentoTratamiento').value).toBe('amoxicilina');
    expect(elemento('.medicamento-resultados')).not.toBeNull();
    expect(elemento('#cantidadTratamiento')).toBeNull();
    expect(elemento('#frecuenciaTratamiento')).toBeNull();
    expect(elemento('#duracionCantidadTratamiento')).toBeNull();
    expect(elemento('#duracionTipoTratamiento')).toBeNull();
    expect(elemento('#observacionesTratamiento')).toBeNull();
    expect(botonGuardar().disabled).toBe(true);

    filasResultados()[0].click();
    await fixture.whenStable();

    expect(elemento('#cantidadTratamiento')).not.toBeNull();
    expect(elemento('#frecuenciaTratamiento')).not.toBeNull();
    expect(elemento('#duracionCantidadTratamiento')).not.toBeNull();
    expect(elemento('#duracionTipoTratamiento')).not.toBeNull();
    expect(elemento('#observacionesTratamiento')).not.toBeNull();
  });

  it('vuelve al buscador al cambiar el medicamento elegido', async () => {
    await elegirMedicamento('amoxicilina', 0);

    elemento<HTMLButtonElement>('.medicamento-elegido-cambiar').click();
    await fixture.whenStable();

    // El medicamento elegido suelta su sitio y la búsqueda vuelve con el catálogo completo
    expect(elemento('.medicamento-elegido')).toBeNull();
    expect(elemento<HTMLInputElement>('#medicamentoTratamiento').value).toBe('');
    expect(component.medicamento).toBe('');
    expect(filasResultados().length).toBe(5);
  });

  it('exige los días del tratamiento cuando el tipo de duración es Días', async () => {
    await elegirMedicamento('omeprazol', 0);
    await elegir('#duracionTipoTratamiento', 'dias');

    // Con la duración en días sin resolver el medicamento todavía no se puede guardar
    expect(botonGuardar().disabled).toBe(true);

    await escribir('#duracionCantidadTratamiento', '5');

    expect(botonGuardar().disabled).toBe(false);
  });

  it('protege el formulario mientras la tabla de resultados esté desplegada', async () => {
    let agregado: MedicamentoTratamiento | undefined;
    component.medicamentoAgregado.subscribe((medicamento) => (agregado = medicamento));

    await buscar('omeprazol');
    component.agregarMedicamento();

    // Aunque se envíe el formulario, el texto escrito es solo la búsqueda
    expect(agregado).toBeUndefined();
    expect(component.medicamentoElegido).toBeNull();
  });

  it('entrega el medicamento capturado y deja el formulario listo al guardar', async () => {
    let agregado: MedicamentoTratamiento | undefined;
    component.medicamentoAgregado.subscribe((medicamento) => (agregado = medicamento));

    await elegirMedicamento('amoxicilina', 0);
    await escribir('#cantidadTratamiento', '500 mg');
    await escribir('#frecuenciaTratamiento', '8');
    await elegir('#duracionTipoTratamiento', 'dias');
    await escribir('#duracionCantidadTratamiento', '7');
    await escribir('#observacionesTratamiento', 'Con el desayuno.');

    botonGuardar().click();
    await fixture.whenStable();

    expect(agregado).toEqual({
      nombre: 'Amoxicilina Bayer tabletas de 500 mg',
      cantidad: '500 mg',
      frecuencia: 8,
      duracionTipo: 'dias',
      duracionCantidad: 7,
      observaciones: 'Con el desayuno.',
    });
    // El formulario vuelve al buscador para capturar el siguiente medicamento
    expect(component.medicamento).toBe('');
    expect(component.cantidad).toBe('');
    expect(component.frecuencia).toBeNull();
    expect(component.duracionTipo).toBe('');
    expect(component.duracionCantidad).toBeNull();
    expect(component.observaciones).toBe('');
    expect(elemento('.medicamento-elegido')).toBeNull();
    expect(elemento<HTMLInputElement>('#medicamentoTratamiento').value).toBe('');
  });

  it('descarta la captura y avisa a la pantalla que la abrió al cancelar', async () => {
    let cancelado = false;
    component.cancelado.subscribe(() => (cancelado = true));

    await elegirMedicamento('ibuprofeno', 0);
    await escribir('#cantidadTratamiento', '400 mg');

    botonCancelar().click();
    await fixture.whenStable();

    expect(cancelado).toBe(true);
    expect(component.medicamentoElegido).toBeNull();
    expect(component.medicamento).toBe('');
    expect(component.cantidad).toBe('');
  });
});
