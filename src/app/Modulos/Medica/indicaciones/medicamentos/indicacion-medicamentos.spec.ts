import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError, TimeoutError } from 'rxjs';

import { IndicacionMedicamentos } from './indicacion-medicamentos';
import { MedicamentoIndicacionService } from './data/medicamento-service';
import {
  MedicamentoCatalogoResponse,
  MedicamentoIndicacionResponse,
} from './data/medicamentoInterfaz';
import { EpisodioActivoService } from '../../data/episodio-activo-service';
import { AuthService } from '../../../Auth/data/auth-service';
import { CatalogoService } from '../../../Catalogos/data/serviceCatalogo';
import { PopUps } from '../../../../shared/popUps/popUpsService';
import { RegistrosEnfermeriaService } from '../../../Enfermeria/data/registrosEnfermeriaService';

describe('IndicacionMedicamentos', () => {
  let component: IndicacionMedicamentos;
  let fixture: ComponentFixture<IndicacionMedicamentos>;

  const catalogo: MedicamentoCatalogoResponse[] = [
    {
      id: 9,
      nombre: 'Ibuprofeno',
      codigo: 'MED-9',
      dosis: 400,
      marca: 'MK',
      presentacion: 'tabletas de 400 mg',
      viaAdministracion: 'Oral',
      unidadMedida: 'mg',
      disponible: 10,
      estado: true,
    },
  ];

  const indicacion = (
    cambios: Partial<MedicamentoIndicacionResponse> = {},
  ): MedicamentoIndicacionResponse => ({
    id: 30,
    medicamentoLogId: 9,
    medicamento: 'Ibuprofeno',
    medicamentoLibre: null,
    presentacion: 'tabletas de 400 mg',
    cantidad: 2,
    frecuencia: 8,
    duracion: 7,
    tipoDuracion: 'DIAS',
    observaciones: 'Observación',
    episodioId: 1,
    usuarioId: 2,
    usuarioNombre: 'Carlos Méndez',
    fecha: '2026-10-16T11:00:00',
    estado: 'ACTIVO',
    fechaInicio: '2026-10-16T11:00:00',
    ...cambios,
  });

  const servicio = {
    getIndicacionesPorEpisodio: vi.fn(),
    buscarCatalogo: vi.fn(),
    postIndicacion: vi.fn(),
    putIndicacion: vi.fn(),
    cambiarEstado: vi.fn(),
    eliminarIndicacion: vi.fn(),
  };
  const auth = { currentUser: () => ({ id: 2 }) };
  const episodio = {
    obtener: vi.fn<() => number | null>(() => 1),
    guardar: vi.fn(),
    limpiar: vi.fn(),
    esSoloLectura: () => false,
  };
  const popUps = {
    exito: vi.fn(),
    error: vi.fn(),
    errorDesdeBackend: vi.fn(),
    advertencia: vi.fn(),
    confirmarToast: vi.fn(),
  };
  const catalogoService = {
    listarUnidadMedida: vi.fn(),
  };
  const registrosEnfermeria = {
    buscarAplicacionesPorIndicacion: vi.fn(),
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    servicio.getIndicacionesPorEpisodio.mockReturnValue(of([]));
    servicio.buscarCatalogo.mockReturnValue(of(catalogo));
    servicio.postIndicacion.mockReturnValue(of(indicacion()));
    servicio.putIndicacion.mockReturnValue(of(indicacion()));
    servicio.cambiarEstado.mockReturnValue(of(indicacion({ estado: 'FINALIZADO' })));
    servicio.eliminarIndicacion.mockReturnValue(of(void 0));
    catalogoService.listarUnidadMedida.mockReturnValue(of([]));
    registrosEnfermeria.buscarAplicacionesPorIndicacion.mockReturnValue(of([]));
    popUps.confirmarToast.mockResolvedValue(true);
    episodio.obtener.mockReturnValue(1);

    await TestBed.configureTestingModule({
      imports: [IndicacionMedicamentos],
      providers: [
        { provide: MedicamentoIndicacionService, useValue: servicio },
        { provide: CatalogoService, useValue: catalogoService },
        { provide: AuthService, useValue: auth },
        { provide: EpisodioActivoService, useValue: episodio },
        { provide: PopUps, useValue: popUps },
        { provide: RegistrosEnfermeriaService, useValue: registrosEnfermeria },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(IndicacionMedicamentos);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  const elemento = <T extends Element>(selector: string): T =>
    fixture.nativeElement.querySelector(selector);

  const elementos = <T extends Element>(selector: string): NodeListOf<T> =>
    fixture.nativeElement.querySelectorAll(selector);

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

  const botonGuardar = (): HTMLButtonElement =>
    elemento<HTMLButtonElement>('.indicacion-acciones button[type="submit"]');

  const buscarMedicamento = async (texto: string): Promise<void> => {
    await escribir('#medicamentoIndicado', texto);
    elemento<HTMLButtonElement>('.indicacion-buscador .btnLupa').click();
    fixture.detectChanges();
    await fixture.whenStable();
  };

  const elegirMedicamento = async (): Promise<void> => {
    elemento<HTMLTableRowElement>('.fila-seleccionable').click();
    fixture.detectChanges();
    await fixture.whenStable();
  };

  const completarFormulario = async (): Promise<void> => {
    await buscarMedicamento('ibuprofeno');
    await elegirMedicamento();
    await escribir('#cantidadIndicada', '2');
    await escribir('#frecuenciaIndicada', '8');
    await elegir('#duracionTipoIndicada', 'dias');
    await escribir('#duracionCantidadIndicada', '7');
    await escribir('#fechaInicioIndicada', '2026-10-16T11:00');
    await escribir('#observacionesIndicadas', 'Observación');
  };

  const cargarListado = async (respuestas: MedicamentoIndicacionResponse[]): Promise<void> => {
    servicio.getIndicacionesPorEpisodio.mockImplementation((_, estado) =>
      of(estado === 'ACTIVO' ? respuestas : []),
    );
    component.cargarIndicaciones();
    fixture.detectChanges();
    await fixture.whenStable();
  };

  it('carga las indicaciones del episodio para los estados vigentes', () => {
    expect(servicio.getIndicacionesPorEpisodio).toHaveBeenCalledWith(1, 'ACTIVO');
    expect(servicio.getIndicacionesPorEpisodio).toHaveBeenCalledWith(1, 'FINALIZADO');
  });

  it('pide el estado correspondiente al cambiar de filtro', async () => {
    const filtros = [...elementos<HTMLButtonElement>('.indicados-filtro')];

    filtros.find((filtro) => filtro.textContent?.trim() === 'Finalizadas')?.click();
    await fixture.whenStable();
    expect(servicio.getIndicacionesPorEpisodio).toHaveBeenCalledWith(1, 'FINALIZADO');

    filtros.find((filtro) => filtro.textContent?.trim() === 'Eliminadas')?.click();
    await fixture.whenStable();
    expect(servicio.getIndicacionesPorEpisodio).toHaveBeenCalledWith(1, 'ELIMINADO');
  });

  it('no muestra la opción de medicamento no registrado antes de buscar', () => {
    expect(elemento('.medicamento-libre')).toBeNull();
  });

  it('busca el medicamento en el catálogo y muestra sus datos', async () => {
    await buscarMedicamento('ibuprofeno');

    expect(servicio.buscarCatalogo).toHaveBeenCalledWith('ibuprofeno');
    expect(elemento<HTMLElement>('.fila-seleccionable').textContent).toContain(
      'Ibuprofeno MK tabletas de 400 mg',
    );
    expect(elemento<HTMLElement>('.fila-seleccionable').textContent).toContain('Oral');
  });

  it('guarda la indicación con el contrato del backend', async () => {
    await completarFormulario();
    fixture.detectChanges();

    expect(botonGuardar().disabled).toBe(false);
    botonGuardar().click();
    await fixture.whenStable();

    expect(servicio.postIndicacion).toHaveBeenCalledWith({
      medicamentoLogId: 9,
      medicamentoLibre: null,
      presentacion: 'tabletas de 400 mg',
      cantidad: 2,
      frecuencia: 8,
      duracion: 7,
      tipoDuracion: 'DIAS',
      observaciones: 'Observación',
      episodioId: 1,
      usuarioId: 2,
      fechaInicio: '2026-10-16T11:00',
    });
    expect(popUps.exito).toHaveBeenCalled();
    expect(servicio.getIndicacionesPorEpisodio).toHaveBeenCalled();
  });

  it('envía la abreviatura de la unidad de medida elegida', async () => {
    catalogoService.listarUnidadMedida.mockReturnValue(
      of([{ id: 1, nombre: 'Miligramos', abreviatura: 'mg' }]),
    );
    component.cargarUnidadesMedida();
    await fixture.whenStable();

    await completarFormulario();
    await elegir('#unidadMedidaIndicada', 'Miligramos');
    fixture.detectChanges();

    botonGuardar().click();
    await fixture.whenStable();

    expect(servicio.postIndicacion).toHaveBeenCalledWith(
      expect.objectContaining({ presentacion: 'mg' }),
    );
  });

  it('envía gotas cuando se elige esa unidad', async () => {
    await completarFormulario();
    await elegir('#unidadMedidaIndicada', 'Gotas');
    fixture.detectChanges();

    botonGuardar().click();
    await fixture.whenStable();

    expect(servicio.postIndicacion).toHaveBeenCalledWith(
      expect.objectContaining({ presentacion: 'gotas' }),
    );
  });

  it('usa la presentación guardada para la unidad de la cantidad', async () => {
    await cargarListado([indicacion()]);

    expect(elemento<HTMLElement>('.indicacion-card')?.textContent).toContain('2 tabletas');
  });

  it('avisa en la tarjeta cuando el medicamento no está registrado', async () => {
    await cargarListado([
      indicacion({
        medicamentoLogId: null,
        medicamento: 'Aspirina 500 mg',
        medicamentoLibre: 'Aspirina 500 mg',
        presentacion: null,
      }),
    ]);

    const encabezado = elemento<HTMLElement>('.indicacion-card .indicacion-encabezado');

    expect(encabezado?.textContent).toContain('Aspirina 500 mg');
    expect(encabezado?.textContent).toContain('Medicamento no registrado');
  });

  it('ajusta solo la primera palabra de la presentación guardada', async () => {
    await cargarListado([
      indicacion({ presentacion: 'Tabletas de 400 mg', cantidad: 1 }),
    ]);

    expect(elemento<HTMLElement>('.indicacion-card')?.textContent).toContain(
      '1 tableta de 400 mg',
    );
  });

  it('muestra la abreviatura guardada en el card', async () => {
    await cargarListado([indicacion({ presentacion: 'mg', cantidad: 10 })]);

    expect(elemento<HTMLElement>('.indicacion-card')?.textContent).toContain('10 mg');
  });

  it('muestra gotas en el card cuando se guardaron gotas', async () => {
    await cargarListado([indicacion({ presentacion: 'gotas', cantidad: 10 })]);

    expect(elemento<HTMLElement>('.indicacion-card')?.textContent).toContain('10 gotas');
  });

  it('muestra unidad cuando no hay presentación guardada', async () => {
    await cargarListado([indicacion({ presentacion: null, cantidad: 1 })]);

    expect(elemento<HTMLElement>('.indicacion-card')?.textContent).toContain('1 unidad');
  });

  it('muestra la abreviatura de la unidad en el card después de guardar', async () => {
    catalogoService.listarUnidadMedida.mockReturnValue(
      of([{ id: 1, nombre: 'Miligramos', abreviatura: 'mg' }]),
    );
    component.cargarUnidadesMedida();
    await fixture.whenStable();

    servicio.postIndicacion.mockReturnValue(of(indicacion({ presentacion: 'mg' })));
    servicio.getIndicacionesPorEpisodio.mockImplementation((_, estado) =>
      of(estado === 'ACTIVO' ? [indicacion({ presentacion: 'mg' })] : []),
    );

    await completarFormulario();
    await elegir('#unidadMedidaIndicada', 'Miligramos');
    fixture.detectChanges();
    botonGuardar().click();
    await fixture.whenStable();

    expect(elemento<HTMLElement>('.indicacion-card')?.textContent).toContain('2 mg');
  });

  it('carga las unidades de medida del catálogo y agrega Gotas', async () => {
    catalogoService.listarUnidadMedida.mockReturnValue(
      of([
        { id: 1, nombre: 'Miligramos', abreviatura: 'mg' },
        { id: 2, nombre: 'Mililitros', abreviatura: 'ml' },
      ]),
    );

    component.cargarUnidadesMedida();
    await fixture.whenStable();

    expect(component.unidadesMedida).toEqual(['Miligramos', 'Mililitros', 'Gotas']);
  });

  it('no guarda sin un medicamento del catálogo elegido ni texto libre', () => {
    component.agregarIndicacion();

    expect(servicio.postIndicacion).not.toHaveBeenCalled();
    expect(popUps.advertencia).toHaveBeenCalledWith(
      'Busque y seleccione un medicamento del catálogo o indique uno no registrado.',
    );
  });

  it('muestra la existencia y permite seleccionar un medicamento sin stock', async () => {
    servicio.buscarCatalogo.mockReturnValue(of([{ ...catalogo[0], disponible: 0 }]));

    await buscarMedicamento('ibuprofeno');

    expect(elemento<HTMLElement>('.fila-seleccionable').textContent).toContain(
      'Sin existencia',
    );

    await elegirMedicamento();

    expect(component.medicamentoElegido?.disponible).toBe(0);
    expect(component.textoMedicamentoElegido).toContain('Sin existencia');

    await escribir('#cantidadIndicada', '2');
    await escribir('#frecuenciaIndicada', '8');
    await elegir('#duracionTipoIndicada', 'dias');
    await escribir('#duracionCantidadIndicada', '7');
    await escribir('#fechaInicioIndicada', '2026-10-16T11:00');
    botonGuardar().click();
    await fixture.whenStable();

    expect(servicio.postIndicacion).toHaveBeenCalledWith(
      expect.objectContaining({ medicamentoLogId: 9, medicamentoLibre: null }),
    );
  });

  it('permite indicar un medicamento no registrado con texto libre', async () => {
    servicio.buscarCatalogo.mockReturnValue(of([]));

    await buscarMedicamento('Aspirina 500 mg cada 8 horas');
    elemento<HTMLButtonElement>('.medicamento-libre button').click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.medicamentoElegido).toBeNull();
    expect(component.medicamentoLibre).toBe('Aspirina 500 mg cada 8 horas');
    expect(component.textoMedicamentoElegido).toContain('No registrado');

    await escribir('#cantidadIndicada', '1');
    await escribir('#frecuenciaIndicada', '8');
    await elegir('#duracionTipoIndicada', 'dias');
    await escribir('#duracionCantidadIndicada', '7');
    await escribir('#fechaInicioIndicada', '2026-10-16T11:00');
    botonGuardar().click();
    await fixture.whenStable();

    expect(servicio.postIndicacion).toHaveBeenCalledWith({
      medicamentoLogId: null,
      medicamentoLibre: 'Aspirina 500 mg cada 8 horas',
      presentacion: null,
      cantidad: 1,
      frecuencia: 8,
      duracion: 7,
      tipoDuracion: 'DIAS',
      observaciones: null,
      episodioId: 1,
      usuarioId: 2,
      fechaInicio: '2026-10-16T11:00',
    });
  });

  it('edita una indicación no registrada manteniendo el texto libre', async () => {
    const libre = indicacion({
      id: 31,
      medicamentoLogId: null,
      medicamento: 'Aspirina 500 mg',
      medicamentoLibre: 'Aspirina 500 mg',
      presentacion: null,
    });
    await cargarListado([libre]);

    elemento<HTMLButtonElement>('.indicacion-menu-trigger').click();
    fixture.detectChanges();
    elemento<HTMLButtonElement>('.indicacion-menu .iconEditar').click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.medicamentoElegido).toBeNull();
    expect(component.medicamentoLibre).toBe('Aspirina 500 mg');

    botonGuardar().click();
    await fixture.whenStable();

    expect(popUps.confirmarToast).toHaveBeenCalledWith(
      '¿Está seguro de guardar los cambios de la indicación "Aspirina 500 mg"?',
    );
    expect(servicio.putIndicacion).toHaveBeenCalledWith(
      31,
      expect.objectContaining({
        medicamentoLogId: null,
        medicamentoLibre: 'Aspirina 500 mg',
      }),
    );
  });

  it('exige la duración cuando el tipo es DIAS', async () => {
    await buscarMedicamento('ibuprofeno');
    await elegirMedicamento();
    await escribir('#cantidadIndicada', '2');
    await escribir('#frecuenciaIndicada', '8');
    await elegir('#duracionTipoIndicada', 'dias');
    fixture.detectChanges();

    expect(botonGuardar().disabled).toBe(true);
    expect(component.faltaDuracionEnDias).toBe(true);
  });

  it('edita la indicación y la actualiza con PUT', async () => {
    await cargarListado([indicacion()]);

    elemento<HTMLButtonElement>('.indicacion-menu-trigger').click();
    fixture.detectChanges();
    elemento<HTMLButtonElement>('.indicacion-menu .iconEditar').click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.indicacionEnEdicion).toBe(30);
    expect(elemento<HTMLInputElement>('#cantidadIndicada').value).toBe('2');

    await escribir('#observacionesIndicadas', 'Observación actualizada');
    botonGuardar().click();
    await fixture.whenStable();

    expect(popUps.confirmarToast).toHaveBeenCalledWith(
      '¿Está seguro de guardar los cambios de la indicación "Ibuprofeno"?',
    );
    expect(servicio.putIndicacion).toHaveBeenCalledWith(30, {
      medicamentoLogId: 9,
      medicamentoLibre: null,
      presentacion: 'tabletas de 400 mg',
      cantidad: 2,
      frecuencia: 8,
      duracion: 7,
      tipoDuracion: 'DIAS',
      observaciones: 'Observación actualizada',
      episodioId: 1,
      usuarioId: 2,
      fechaInicio: '2026-10-16T11:00',
    });
    expect(popUps.exito).toHaveBeenCalledWith('Indicación actualizada exitosamente.');
  });

  it('preselecciona la unidad de medida al editar una indicación con abreviatura', async () => {
    catalogoService.listarUnidadMedida.mockReturnValue(
      of([{ id: 1, nombre: 'Miligramos', abreviatura: 'mg' }]),
    );
    component.cargarUnidadesMedida();
    await fixture.whenStable();

    await cargarListado([indicacion({ presentacion: 'mg' })]);

    elemento<HTMLButtonElement>('.indicacion-menu-trigger').click();
    fixture.detectChanges();
    elemento<HTMLButtonElement>('.indicacion-menu .iconEditar').click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.unidadMedida).toBe('Miligramos');
  });

  it('no ofrece finalizar la indicación activa', async () => {
    await cargarListado([indicacion()]);

    elemento<HTMLButtonElement>('.indicacion-menu-trigger').click();
    fixture.detectChanges();

    const opciones = [...elementos<HTMLElement>('.indicacion-menu-opcion span')].map(
      (opcion) => opcion.textContent?.trim(),
    );

    expect(opciones).toEqual(['Editar', 'Eliminar']);
    expect(elemento('.indicacion-menu .iconEstado')).toBeNull();
  });

  it('reactiva una indicación finalizada con PATCH', async () => {
    await cargarListado([indicacion({ estado: 'FINALIZADO' })]);

    elemento<HTMLButtonElement>('.indicacion-menu-trigger').click();
    fixture.detectChanges();
    elemento<HTMLButtonElement>('.indicacion-menu .iconEstado').click();
    await fixture.whenStable();

    expect(popUps.confirmarToast).toHaveBeenCalledWith(
      '¿Está seguro de reactivar la indicación "Ibuprofeno"?',
    );
    expect(servicio.cambiarEstado).toHaveBeenCalledWith(30, 'ACTIVO');
    expect(popUps.exito).toHaveBeenCalledWith('Indicación reactivada exitosamente.');
  });

  it('no actualiza la indicación si la confirmación se cancela', async () => {
    popUps.confirmarToast.mockResolvedValue(false);
    await cargarListado([indicacion()]);

    elemento<HTMLButtonElement>('.indicacion-menu-trigger').click();
    fixture.detectChanges();
    elemento<HTMLButtonElement>('.indicacion-menu .iconEditar').click();
    fixture.detectChanges();
    await fixture.whenStable();

    botonGuardar().click();
    await fixture.whenStable();

    expect(servicio.putIndicacion).not.toHaveBeenCalled();
  });

  it('no reactiva la indicación si la confirmación se cancela', async () => {
    popUps.confirmarToast.mockResolvedValue(false);
    await cargarListado([indicacion({ estado: 'FINALIZADO' })]);

    elemento<HTMLButtonElement>('.indicacion-menu-trigger').click();
    fixture.detectChanges();
    elemento<HTMLButtonElement>('.indicacion-menu .iconEstado').click();
    await fixture.whenStable();

    expect(servicio.cambiarEstado).not.toHaveBeenCalled();
  });

  it('elimina la indicación después de confirmarlo', async () => {
    await cargarListado([indicacion()]);

    elemento<HTMLButtonElement>('.indicacion-menu-trigger').click();
    fixture.detectChanges();
    elemento<HTMLButtonElement>('.indicacion-menu .iconQuitar').click();
    await fixture.whenStable();

    expect(popUps.confirmarToast).toHaveBeenCalledWith(
      '¿Está seguro de eliminar la indicación "Ibuprofeno"?',
    );
    expect(servicio.eliminarIndicacion).toHaveBeenCalledWith(30);
    expect(popUps.exito).toHaveBeenCalledWith('Indicación eliminada exitosamente.');
  });

  it('conserva la indicación si la eliminación se cancela', async () => {
    popUps.confirmarToast.mockResolvedValue(false);
    await cargarListado([indicacion()]);

    elemento<HTMLButtonElement>('.indicacion-menu-trigger').click();
    fixture.detectChanges();
    elemento<HTMLButtonElement>('.indicacion-menu .iconQuitar').click();
    await fixture.whenStable();

    expect(servicio.eliminarIndicacion).not.toHaveBeenCalled();
  });

  it('avisa cuando el servidor no responde al cargar el listado', async () => {
    servicio.getIndicacionesPorEpisodio.mockReturnValue(
      throwError(() => new TimeoutError()),
    );

    component.cargarIndicaciones();
    await fixture.whenStable();

    expect(popUps.error).toHaveBeenCalledWith(
      'Error de comunicación. El servidor no respondió dentro del tiempo esperado.',
    );
  });

  it('carga los registros de enfermería al desplegar la tarjeta', async () => {
    registrosEnfermeria.buscarAplicacionesPorIndicacion.mockReturnValue(
      of([
        {
          id: 1,
          indicacionMedicamentoId: 30,
          fechaHoraProgramada: '2026-10-16T08:00:00',
          estado: 'ADMINISTRADO',
          cantidad: 2,
          observacion: 'Administrado sin novedad.',
          usuarioId: 3,
          usuarioNombre: 'Enf. María López',
          fechaRegistro: '2026-10-16T08:05:00',
        },
      ]),
    );
    await cargarListado([indicacion()]);

    elemento<HTMLButtonElement>('.indicacion-meta-toggle').click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(registrosEnfermeria.buscarAplicacionesPorIndicacion).toHaveBeenCalledWith(30);
    expect(elemento<HTMLElement>('.indicacion-registros')?.textContent).toContain(
      'Enf. María López',
    );
    expect(elemento<HTMLElement>('.indicacion-registros')?.textContent).toContain('Administrado');
  });

  it('avisa cuando no hay un episodio activo', async () => {
    episodio.obtener.mockReturnValue(null);

    component.cargarIndicaciones();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(elemento<HTMLElement>('.indicacion-vacio').textContent).toContain(
      'Abra un episodio para consultar sus indicaciones.',
    );
    expect(servicio.getIndicacionesPorEpisodio).toHaveBeenCalledTimes(2);
  });
});
