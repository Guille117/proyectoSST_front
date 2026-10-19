import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError, TimeoutError } from 'rxjs';

import { PopUps } from '../../../../../shared/popUps/popUpsService';
import { CatalogoService } from '../../../../Catalogos/data/serviceCatalogo';
import { MedicamentoCatalogoResponse } from '../data/medicamentoInterfaz';
import { MedicamentoIndicacionService } from '../data/medicamento-service';
import { MedicamentoIndicacion, MedicamentoTratamiento } from './medicamento-indicacion';

describe('MedicamentoIndicacion', () => {
  let component: MedicamentoIndicacion;
  let fixture: ComponentFixture<MedicamentoIndicacion>;

  const catalogo: MedicamentoCatalogoResponse[] = [
    {
      id: 1,
      nombre: 'Amoxicilina',
      codigo: 'MED-1',
      dosis: 500,
      marca: 'Bayer',
      presentacion: 'tabletas de 500 mg',
      viaAdministracion: 'Oral',
      unidadMedida: 'mg',
      disponible: 10,
      estado: true,
    },
    {
      id: 2,
      nombre: 'Amoxicilina',
      codigo: 'MED-2',
      dosis: 500,
      marca: 'Bayer',
      presentacion: 'suspensión inyectable de 500 mg',
      viaAdministracion: 'Intravenosa',
      unidadMedida: 'mg',
      disponible: 5,
      estado: true,
    },
    {
      id: 3,
      nombre: 'Paracetamol',
      codigo: 'MED-3',
      dosis: 500,
      marca: 'Genfar',
      presentacion: 'tabletas de 500 mg',
      viaAdministracion: 'Oral',
      unidadMedida: 'mg',
      disponible: 20,
      estado: true,
    },
    {
      id: 4,
      nombre: 'Ibuprofeno',
      codigo: 'MED-4',
      dosis: 400,
      marca: 'MK',
      presentacion: 'tabletas de 400 mg',
      viaAdministracion: 'Oral',
      unidadMedida: 'mg',
      disponible: 8,
      estado: true,
    },
    {
      id: 5,
      nombre: 'Omeprazol',
      codigo: 'MED-5',
      dosis: 20,
      marca: 'La Santé',
      presentacion: 'cápsulas de 20 mg',
      viaAdministracion: 'Oral',
      unidadMedida: 'mg',
      disponible: 15,
      estado: true,
    },
    {
      id: 6,
      nombre: 'Metoclopramida',
      codigo: 'MED-6',
      dosis: 10,
      marca: 'Genfar',
      presentacion: 'solución inyectable de 10 mg',
      viaAdministracion: 'Intravenosa',
      unidadMedida: 'mg',
      disponible: 3,
      estado: true,
    },
  ];

  const medicamentoService = { buscarCatalogo: vi.fn() };
  const catalogoService = { listarUnidadMedida: vi.fn() };
  const popUps = { error: vi.fn(), errorDesdeBackend: vi.fn() };

  beforeEach(async () => {
    vi.resetAllMocks();
    medicamentoService.buscarCatalogo.mockImplementation((nombre: string) => {
      const termino = nombre.trim().toLowerCase();
      return of(
        termino
          ? catalogo.filter((medicamento) =>
              `${medicamento.nombre} ${medicamento.marca} ${medicamento.presentacion}`
                .toLowerCase()
                .includes(termino),
            )
          : catalogo,
      );
    });
    catalogoService.listarUnidadMedida.mockReturnValue(
      of([{ id: 1, nombre: 'Tabletas', abreviatura: 'tab' }]),
    );

    await TestBed.configureTestingModule({
      imports: [MedicamentoIndicacion],
      providers: [
        { provide: MedicamentoIndicacionService, useValue: medicamentoService },
        { provide: CatalogoService, useValue: catalogoService },
        { provide: PopUps, useValue: popUps },
      ],
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

  const pieDeResultados = (): HTMLElement =>
    elemento<HTMLElement>('.medicamento-resultados tfoot');

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

  it('busca en el catálogo real y muestra la tabla con No., Descripción y Administración', async () => {
    expect(elemento('.medicamento-resultados')).toBeNull();

    await buscar('amoxicilina');

    expect(medicamentoService.buscarCatalogo).toHaveBeenCalledWith('amoxicilina');

    const encabezados = [
      ...elementos<HTMLTableCellElement>('.medicamento-resultados thead th'),
    ].map((encabezado) => encabezado.textContent?.trim());

    expect(encabezados).toEqual(['No.', 'Descripción', 'Existencia', 'Administración']);
    expect(filasResultados().length).toBe(2);
    expect(filasResultados()[0].textContent).toContain('1');
    expect(filasResultados()[0].textContent).toContain('Amoxicilina Bayer tabletas de 500 mg');
    expect(filasResultados()[0].textContent).toContain('Oral');
    expect(filasResultados()[1].textContent).toContain('Intravenosa');
    expect(filasResultados()[1].tabIndex).toBe(0);
  });

  it('reparte los resultados en páginas de cinco medicamentos desde el pie de la tabla', async () => {
    await buscar('');

    expect(medicamentoService.buscarCatalogo).toHaveBeenCalledWith('');
    expect(component.medicamentosEncontrados.length).toBe(6);
    expect(filasResultados().length).toBe(5);
    expect(filasResultados()[0].textContent).toContain('1');
    expect(filasResultados()[4].textContent).toContain('Omeprazol La Santé');
    expect(pieDeResultados().textContent).toContain('Mostrando 5 de 6 resultados');

    await paginaSiguiente();

    expect(filasResultados().length).toBe(1);
    expect(filasResultados()[0].textContent).toContain('6');
    expect(filasResultados()[0].textContent).toContain('Metoclopramida Genfar');
    expect(pieDeResultados().textContent).toContain('Mostrando 1 de 6 resultados');
  });

  it('avisa cuando la búsqueda no encuentra medicamentos en el catálogo', async () => {
    await buscar('aspirina');

    expect(elemento('.medicamento-resultados table')).toBeNull();
    expect(elemento<HTMLElement>('.medicamento-vacio').textContent?.trim()).toBe(
      'No se encontraron medicamentos que coincidan con «aspirina».',
    );
  });

  it('permite indicar un medicamento no registrado con el texto del buscador', async () => {
    await buscar('medicamento no registrado');

    expect(component.hayMedicamentoSeleccionado).toBe(false);

    elemento<HTMLButtonElement>('.medicamento-libre button').click();
    await fixture.whenStable();

    expect(component.medicamentoLibre).toBe('medicamento no registrado');
    expect(component.textoMedicamentoElegido).toContain('No registrado');

    await escribir('#cantidadTratamiento', '1');
    await escribir('#frecuenciaTratamiento', '8');
    await elegir('#duracionTipoTratamiento', 'indefinida');

    let agregado: MedicamentoTratamiento | undefined;
    component.medicamentoAgregado.subscribe((medicamento) => (agregado = medicamento));

    botonGuardar().click();
    await fixture.whenStable();

    expect(agregado).toEqual(
      expect.objectContaining({
        nombre: 'medicamento no registrado',
        medicamentoLogId: null,
        medicamentoLibre: 'medicamento no registrado',
      }),
    );
  });

  it('deja el medicamento elegido en el lugar del buscador y de la tabla', async () => {
    await elegirMedicamento('amoxicilina', 1);

    expect(elemento('.medicamento-resultados')).toBeNull();
    expect(elemento('#medicamentoTratamiento')).toBeNull();
    expect(component.medicamento).toBe('Amoxicilina Bayer suspensión inyectable de 500 mg');
    expect(component.medicamentoElegido?.id).toBe(2);
    expect(elemento<HTMLElement>('.medicamento-elegido-texto').textContent?.trim()).toBe(
      'Amoxicilina Bayer, suspensión inyectable de 500 mg, administración intravenosa',
    );

    await escribir('#cantidadTratamiento', '2');
    await escribir('#frecuenciaTratamiento', '8');
    await elegir('#duracionTipoTratamiento', 'indefinida');

    expect(botonGuardar().disabled).toBe(false);
  });

  it('oculta el resto de campos mientras la tabla de resultados está desplegada', async () => {
    expect(elemento('#cantidadTratamiento')).not.toBeNull();

    await buscar('amoxicilina');

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

    expect(elemento('.medicamento-elegido')).toBeNull();
    expect(elemento<HTMLInputElement>('#medicamentoTratamiento').value).toBe('');
    expect(component.medicamento).toBe('');
    expect(medicamentoService.buscarCatalogo).toHaveBeenLastCalledWith('');
    expect(filasResultados().length).toBe(5);
  });

  it('exige los días del tratamiento cuando el tipo de duración es Días', async () => {
    await elegirMedicamento('omeprazol', 0);
    await escribir('#cantidadTratamiento', '1');
    await escribir('#frecuenciaTratamiento', '8');
    await elegir('#duracionTipoTratamiento', 'dias');

    expect(botonGuardar().disabled).toBe(true);

    await escribir('#duracionCantidadTratamiento', '5');

    expect(botonGuardar().disabled).toBe(false);
  });

  it('protege el formulario mientras la tabla de resultados esté desplegada', async () => {
    let agregado: MedicamentoTratamiento | undefined;
    component.medicamentoAgregado.subscribe((medicamento) => (agregado = medicamento));

    await buscar('omeprazol');
    component.agregarMedicamento();

    expect(agregado).toBeUndefined();
    expect(component.medicamentoElegido).toBeNull();
  });

  it('entrega el medicamento capturado y deja el formulario listo al guardar', async () => {
    let agregado: MedicamentoTratamiento | undefined;
    component.medicamentoAgregado.subscribe((medicamento) => (agregado = medicamento));

    await elegirMedicamento('amoxicilina', 0);
    await escribir('#cantidadTratamiento', '2');
    await elegir('#unidadMedidaTratamiento', 'Tabletas');
    await escribir('#frecuenciaTratamiento', '8');
    await elegir('#duracionTipoTratamiento', 'dias');
    await escribir('#duracionCantidadTratamiento', '7');
    await escribir('#observacionesTratamiento', 'Con el desayuno.');

    botonGuardar().click();
    await fixture.whenStable();

    expect(agregado).toEqual({
      nombre: 'Amoxicilina Bayer tabletas de 500 mg',
      medicamentoLogId: 1,
      medicamentoLibre: '',
      cantidad: 2,
      unidadMedida: 'Tabletas',
      frecuencia: 8,
      duracionTipo: 'dias',
      duracionCantidad: 7,
      observaciones: 'Con el desayuno.',
    });
    expect(component.medicamento).toBe('');
    expect(component.cantidad).toBeNull();
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
    await escribir('#cantidadTratamiento', '2');

    botonCancelar().click();
    await fixture.whenStable();

    expect(cancelado).toBe(true);
    expect(component.medicamentoElegido).toBeNull();
    expect(component.medicamento).toBe('');
    expect(component.cantidad).toBeNull();
  });

  it('avisa cuando el servidor no responde al buscar en el catálogo', async () => {
    medicamentoService.buscarCatalogo.mockReturnValue(throwError(() => new TimeoutError()));

    await buscar('ibuprofeno');

    expect(popUps.error).toHaveBeenCalledWith(
      'Error de comunicación. El servidor no respondió dentro del tiempo esperado.',
    );
  });
});
