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
import { PopUps } from '../../../../shared/popUps/popUpsService';

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
      estado: true,
    },
  ];

  const indicacion = (
    cambios: Partial<MedicamentoIndicacionResponse> = {},
  ): MedicamentoIndicacionResponse => ({
    id: 30,
    medicamentoLogId: 9,
    medicamento: 'Ibuprofeno',
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
  };
  const popUps = {
    exito: vi.fn(),
    error: vi.fn(),
    errorDesdeBackend: vi.fn(),
    advertencia: vi.fn(),
    confirmarToast: vi.fn(),
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    servicio.getIndicacionesPorEpisodio.mockReturnValue(of([]));
    servicio.buscarCatalogo.mockReturnValue(of(catalogo));
    servicio.postIndicacion.mockReturnValue(of(indicacion()));
    servicio.putIndicacion.mockReturnValue(of(indicacion()));
    servicio.cambiarEstado.mockReturnValue(of(indicacion({ estado: 'FINALIZADO' })));
    servicio.eliminarIndicacion.mockReturnValue(of(void 0));
    popUps.confirmarToast.mockResolvedValue(true);
    episodio.obtener.mockReturnValue(1);

    await TestBed.configureTestingModule({
      imports: [IndicacionMedicamentos],
      providers: [
        { provide: MedicamentoIndicacionService, useValue: servicio },
        { provide: AuthService, useValue: auth },
        { provide: EpisodioActivoService, useValue: episodio },
        { provide: PopUps, useValue: popUps },
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
      cantidad: 2,
      frecuencia: 8,
      duracion: 7,
      tipoDuracion: 'DIAS',
      observaciones: 'Observación',
      episodioId: 1,
      usuarioId: 2,
    });
    expect(popUps.exito).toHaveBeenCalled();
    expect(servicio.getIndicacionesPorEpisodio).toHaveBeenCalled();
  });

  it('no guarda sin un medicamento del catálogo elegido', () => {
    component.agregarIndicacion();

    expect(servicio.postIndicacion).not.toHaveBeenCalled();
    expect(popUps.advertencia).toHaveBeenCalledWith(
      'Busque y seleccione un medicamento del catálogo.',
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

    expect(servicio.putIndicacion).toHaveBeenCalledWith(30, {
      medicamentoLogId: 9,
      cantidad: 2,
      frecuencia: 8,
      duracion: 7,
      tipoDuracion: 'DIAS',
      observaciones: 'Observación actualizada',
      episodioId: 1,
      usuarioId: 2,
    });
    expect(popUps.exito).toHaveBeenCalledWith('Indicación actualizada exitosamente.');
  });

  it('finaliza la indicación activa con PATCH', async () => {
    await cargarListado([indicacion()]);

    elemento<HTMLButtonElement>('.indicacion-menu-trigger').click();
    fixture.detectChanges();
    elemento<HTMLButtonElement>('.indicacion-menu .iconEstado').click();
    await fixture.whenStable();

    expect(servicio.cambiarEstado).toHaveBeenCalledWith(30, 'FINALIZADO');
    expect(popUps.exito).toHaveBeenCalledWith('Indicación finalizada exitosamente.');
  });

  it('reactiva una indicación finalizada con PATCH', async () => {
    await cargarListado([indicacion({ estado: 'FINALIZADO' })]);

    elemento<HTMLButtonElement>('.indicacion-menu-trigger').click();
    fixture.detectChanges();
    elemento<HTMLButtonElement>('.indicacion-menu .iconEstado').click();
    await fixture.whenStable();

    expect(servicio.cambiarEstado).toHaveBeenCalledWith(30, 'ACTIVO');
    expect(popUps.exito).toHaveBeenCalledWith('Indicación reactivada exitosamente.');
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
