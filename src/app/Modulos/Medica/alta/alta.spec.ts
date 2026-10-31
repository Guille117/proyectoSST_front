import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError, TimeoutError } from 'rxjs';

import { PopUps } from '../../../shared/popUps/popUpsService';
import { AuthService } from '../../Auth/data/auth-service';
import { CatalogoService } from '../../Catalogos/data/serviceCatalogo';
import { EpisodioActivoService } from '../data/episodio-activo-service';
import { PacienteService } from '../../Pacientes/paciente/data/paciente-service';
import { PacienteDetalle } from '../../Pacientes/paciente/data/pacienteInterfaz';
import { SignosVitalesService } from '../../Enfermeria/monitoreo/data/signos-vitales-service';
import { Alta } from './alta';
import { AltaResponse } from './data/altaInterfaz';
import { AltaService } from './data/alta-service';

describe('Alta', () => {
  let component: Alta;
  let fixture: ComponentFixture<Alta>;

  const condiciones = [{ id: 2, nombre: 'Estable', estado: true }];
  const instituciones = [
    { id: 1, nombre: 'IGGS - Sololá', telefono: '', direccion: 'Barrio el carmen' },
  ];

  const formatearFecha = (fecha: Date): string =>
    `${`${fecha.getDate()}`.padStart(2, '0')}/${`${fecha.getMonth() + 1}`.padStart(
      2,
      '0',
    )}/${fecha.getFullYear()}`;

  const fechaEgreso = new Date(Date.now() - 60 * 60 * 1000);
  const fechaEgresoTexto = formatearFecha(fechaEgreso);

  const altaVigente: AltaResponse = {
    id: 30,
    tipoAlta: 'INDICACION_MEDICA',
    diagnosticoEgreso: 'Diagnóstico guardado',
    condicionEgresoId: 2,
    condicionEgresoNombre: 'Estable',
    observacionEgreso: 'Observación guardada',
    fechaHoraEgreso: fechaEgreso.toISOString(),
    episodioId: 1,
    usuarioId: 2,
    usuarioNombre: 'Carlos Méndez',
    estado: 'VIGENTE',
    responsableRetiro: null,
    motivoRetiro: null,
    riesgosRetiro: [],
    institucionId: null,
    institucionNombre: null,
    motivoReferencia: null,
    indicacionesTraslado: null,
    tratamientos: [
      {
        tipo: 'MEDICAMENTO',
        nombre: 'Ibuprofeno',
        medicamentoLogId: 1,
        medicamentoLibre: null,
        cantidad: 2,
        unidadMedida: 'tabletas',
        frecuencia: 8,
        duracionTipo: 'DIAS',
        duracion: 7,
        observaciones: 'Con alimentos',
      },
      {
        tipo: 'CUIDADO',
        nombre: 'Cambio de posición',
        medicamentoLogId: null,
        medicamentoLibre: null,
        cantidad: null,
        unidadMedida: null,
        frecuencia: 4,
        duracionTipo: 'TIEMPO_INDEFINIDO',
        duracion: null,
        observaciones: null,
      },
    ],
  };

  const altaService = {
    buscarPorEpisodio: vi.fn(),
    crear: vi.fn(),
    actualizar: vi.fn(),
    anular: vi.fn(),
  };
  const catalogoService = {
    listar: vi.fn(),
    listarUnidadMedida: vi.fn(() => of([])),
  };
  const episodioActivo = {
    obtener: vi.fn<() => number | null>(() => 1),
    pacienteId: vi.fn(() => 1),
    guardar: vi.fn(),
    guardarPaciente: vi.fn(),
    limpiar: vi.fn(),
    esSoloLectura: () => false,
  };

  const pacienteDetalle = {
    nombreCompleto: 'Juan Pérez',
    codigoExpediente: 'EXP-0241',
    tipoAtencion: 'HOSPITALIZACION',
    fechaHoraIngreso: '2026-10-10T08:30:00',
    camaCodigo: 'A-105',
    descripcion: 'Dolor abdominal y vómitos',
    alergias: [],
  } as unknown as PacienteDetalle;

  const pacienteService = {
    obtenerPaciente: vi.fn(() => of(pacienteDetalle)),
    listarPacientes: vi.fn(() => of([])),
  };

  const signosVitalesService = { buscarPorEpisodio: vi.fn(() => of([])) };
  const auth = { currentUser: () => ({ id: 2 }) };
  const popUps = {
    confirmarToast: vi.fn(),
    exito: vi.fn(),
    error: vi.fn(),
    errorDesdeBackend: vi.fn(),
    advertencia: vi.fn(),
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    catalogoService.listar.mockImplementation((recurso: string) => {
      if (recurso === 'condicionesEgreso') return of(condiciones);
      if (recurso === 'instituciones') return of(instituciones);
      return of([]);
    });
    catalogoService.listarUnidadMedida.mockReturnValue(of([]));
    altaService.buscarPorEpisodio.mockReturnValue(of([]));
    altaService.crear.mockReturnValue(of(altaVigente));
    altaService.actualizar.mockReturnValue(of(altaVigente));
    altaService.anular.mockReturnValue(of(void 0));
    episodioActivo.obtener.mockReturnValue(1);
    popUps.confirmarToast.mockResolvedValue(true);

    await TestBed.configureTestingModule({
      imports: [Alta],
      providers: [
        { provide: AltaService, useValue: altaService },
        { provide: CatalogoService, useValue: catalogoService },
        { provide: EpisodioActivoService, useValue: episodioActivo },
        { provide: PacienteService, useValue: pacienteService },
        { provide: SignosVitalesService, useValue: signosVitalesService },
        { provide: AuthService, useValue: auth },
        { provide: PopUps, useValue: popUps },
      ],
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
    elemento<HTMLButtonElement>('.egreso-acciones button[type="submit"]');

  const botonAnular = (): HTMLButtonElement =>
    elemento<HTMLButtonElement>('.egreso-acciones button._eliminar');

  const irASeccion = async (titulo: string): Promise<void> => {
    const boton = [...elementos<HTMLButtonElement>('.panel-secciones .tarjeta')].find((tarjeta) =>
      tarjeta.textContent?.includes(titulo),
    );

    expect(boton).toBeDefined();
    boton?.click();
    await fixture.whenStable();
  };

  const cargarAltaVigente = async (): Promise<void> => {
    altaService.buscarPorEpisodio.mockReturnValue(of([altaVigente]));
    component.cargarAlta();
    fixture.detectChanges();
    await fixture.whenStable();
  };

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('carga las condiciones e instituciones desde el catálogo', () => {
    expect(catalogoService.listar).toHaveBeenCalledWith('condicionesEgreso', true);
    expect(catalogoService.listar).toHaveBeenCalledWith('instituciones', true);

    const opciones = [...elementos<HTMLOptionElement>('#condicionEgreso option')].map((opcion) =>
      opcion.textContent?.trim(),
    );

    expect(opciones).toEqual(['Seleccione la condición de egreso', 'Estable', 'Otro']);
  });

  it('muestra los campos propios de cada sección', async () => {
    await irASeccion('Retiro voluntario');

    expect(elemento('#responsableRetiro')).not.toBeNull();
    expect(elemento('#motivoRetiro')).not.toBeNull();
    expect(elemento('#institucionReferencia')).toBeNull();

    await irASeccion('Referencia / traslado');

    expect(elemento('#institucionReferencia')).not.toBeNull();
    expect(elemento('#motivoReferencia')).not.toBeNull();
    expect(elemento('#responsableRetiro')).toBeNull();
  });

  it('carga el alta vigente del episodio y rellena el registro', async () => {
    await cargarAltaVigente();

    expect(component.altaExistente?.id).toBe(30);
    expect(component.seccionActiva).toBe('indicacion-medica');
    expect(component.diagnosticoEgreso).toBe('Diagnóstico guardado');
    expect(component.condicionEgreso).toBe('2');
    expect(component.tratamientoMedicamentos.length).toBe(1);
    expect(component.tratamientoCuidados.length).toBe(1);
    expect(elemento<HTMLInputElement>('#diagnosticoEgreso').value).toBe('Diagnóstico guardado');
    expect(botonAnular()).not.toBeNull();
    expect(botonAnular().textContent?.trim()).toBe('Anular alta');
  });

  it('registra un alta nueva sin pedir confirmación', async () => {
    await escribir('#diagnosticoEgreso', 'Nuevo diagnóstico');
    await elegir('#condicionEgreso', '2');

    component.registrarMedicamento({
      nombre: 'Ibuprofeno',
      medicamentoLogId: 9,
      medicamentoLibre: '',
      cantidad: 2,
      unidadMedida: 'tabletas',
      frecuencia: 8,
      duracionTipo: 'dias',
      duracionCantidad: 7,
      observaciones: 'Con alimentos',
    });

    botonGuardar().click();
    await fixture.whenStable();

    expect(popUps.confirmarToast).not.toHaveBeenCalled();
    expect(altaService.crear).toHaveBeenCalledWith({
      tipoAlta: 'INDICACION_MEDICA',
      diagnosticoEgreso: 'Nuevo diagnóstico',
      condicionEgresoId: 2,
      observacionEgreso: null,
      episodioId: 1,
      usuarioId: 2,
      responsableRetiro: null,
      motivoRetiro: null,
      riesgosRetiro: [],
      institucionId: null,
      motivoReferencia: null,
      indicacionesTraslado: null,
      tratamientos: [
        {
          tipo: 'MEDICAMENTO',
          nombre: 'Ibuprofeno',
          medicamentoLogId: 9,
          medicamentoLibre: null,
          cantidad: 2,
          unidadMedida: 'tabletas',
          frecuencia: 8,
          duracionTipo: 'DIAS',
          duracion: 7,
          observaciones: 'Con alimentos',
        },
      ],
    });
    expect(episodioActivo.limpiar).toHaveBeenCalled();
    expect(popUps.exito).toHaveBeenCalledWith('Alta registrada exitosamente.');
  });

  it('muestra el error cuando el alta no se puede guardar', async () => {
    altaService.crear.mockReturnValue(throwError(() => new Error('Fallo el alta')));
    await escribir('#diagnosticoEgreso', 'Nuevo diagnóstico');

    component.registrarMedicamento({
      nombre: 'Ibuprofeno',
      medicamentoLogId: 9,
      medicamentoLibre: '',
      cantidad: 2,
      unidadMedida: 'tabletas',
      frecuencia: 8,
      duracionTipo: 'dias',
      duracionCantidad: 7,
      observaciones: '',
    });

    botonGuardar().click();
    await fixture.whenStable();

    expect(popUps.errorDesdeBackend).toHaveBeenCalledWith(
      expect.any(Error),
      'No se pudo guardar el alta. Intente nuevamente.',
    );
  });

  it('guarda un medicamento no registrado en el tratamiento', async () => {
    await escribir('#diagnosticoEgreso', 'Diagnóstico');

    component.registrarMedicamento({
      nombre: 'Aspirina',
      medicamentoLogId: null,
      medicamentoLibre: 'Aspirina',
      cantidad: 1,
      unidadMedida: '',
      frecuencia: 8,
      duracionTipo: 'indefinida',
      duracionCantidad: null,
      observaciones: '',
    });

    botonGuardar().click();
    await fixture.whenStable();

    expect(altaService.crear).toHaveBeenCalledWith(
      expect.objectContaining({
        tratamientos: [
          expect.objectContaining({
            tipo: 'MEDICAMENTO',
            medicamentoLogId: null,
            medicamentoLibre: 'Aspirina',
          }),
        ],
      }),
    );
    expect(popUps.exito).toHaveBeenCalledWith('Alta registrada exitosamente.');
  });

  it('actualiza el alta vigente después de confirmarlo', async () => {
    await cargarAltaVigente();
    await escribir('#diagnosticoEgreso', 'Diagnóstico actualizado');

    botonGuardar().click();
    await fixture.whenStable();

    expect(popUps.confirmarToast).toHaveBeenCalledWith(
      `¿Está seguro de guardar los cambios del alta del ${fechaEgresoTexto}?`,
    );
    expect(altaService.actualizar).toHaveBeenCalledWith(
      30,
      expect.objectContaining({
        diagnosticoEgreso: 'Diagnóstico actualizado',
        episodioId: 1,
        usuarioId: 2,
      }),
    );
    expect(episodioActivo.limpiar).toHaveBeenCalled();
    expect(popUps.exito).toHaveBeenCalledWith('Alta actualizada exitosamente.');
  });

  it('no actualiza el alta si la confirmación se cancela', async () => {
    await cargarAltaVigente();
    popUps.confirmarToast.mockResolvedValue(false);
    await escribir('#diagnosticoEgreso', 'Diagnóstico actualizado');

    botonGuardar().click();
    await fixture.whenStable();

    expect(altaService.actualizar).not.toHaveBeenCalled();
  });

  it('anula el alta después de confirmarlo y reabre el episodio', async () => {
    await cargarAltaVigente();

    botonAnular().click();
    await fixture.whenStable();

    expect(popUps.confirmarToast).toHaveBeenCalledWith(
      `¿Está seguro de anular el alta del ${fechaEgresoTexto}?`,
    );
    expect(altaService.anular).toHaveBeenCalledWith(30);
    expect(episodioActivo.guardar).toHaveBeenCalledWith(1);
    expect(component.altaExistente).toBeNull();
    expect(component.diagnosticoEgreso).toBe('');
    expect(popUps.exito).toHaveBeenCalledWith('Alta anulada exitosamente.');
  });

  it('no anula el alta si la confirmación se cancela', async () => {
    await cargarAltaVigente();
    popUps.confirmarToast.mockResolvedValue(false);

    botonAnular().click();
    await fixture.whenStable();

    expect(altaService.anular).not.toHaveBeenCalled();
    expect(component.altaExistente?.id).toBe(30);
  });

  it('no registra el alta cuando falta el diagnóstico', async () => {
    await component.guardarEgreso();
    await fixture.whenStable();

    expect(altaService.crear).not.toHaveBeenCalled();
    expect(popUps.advertencia).toHaveBeenCalledWith('El diagnóstico de egreso es obligatorio.');
  });

  it('exige el solicitante y el motivo en el retiro voluntario', async () => {
    await irASeccion('Retiro voluntario');
    await escribir('#diagnosticoEgreso', 'Diagnóstico de retiro');

    await component.guardarEgreso();
    await fixture.whenStable();

    expect(altaService.crear).not.toHaveBeenCalled();
    expect(popUps.advertencia).toHaveBeenCalledWith('Seleccione el solicitante del retiro.');

    await elegir('#responsableRetiro', 'paciente');
    await component.guardarEgreso();
    await fixture.whenStable();

    expect(popUps.advertencia).toHaveBeenCalledWith('El motivo del retiro es obligatorio.');

    await escribir('#motivoRetiro', 'Decisión de la familia');
    await component.guardarEgreso();
    await fixture.whenStable();

    expect(altaService.crear).toHaveBeenCalledWith(
      expect.objectContaining({
        tipoAlta: 'RETIRO_VOLUNTARIO',
        responsableRetiro: 'PACIENTE',
        motivoRetiro: 'Decisión de la familia',
      }),
    );
  });

  it('exige la institución y el motivo en la referencia o traslado', async () => {
    await irASeccion('Referencia / traslado');
    await escribir('#diagnosticoEgreso', 'Diagnóstico de traslado');

    await component.guardarEgreso();
    await fixture.whenStable();

    expect(altaService.crear).not.toHaveBeenCalled();
    expect(popUps.advertencia).toHaveBeenCalledWith('Seleccione la institución de referencia.');

    await elegir('#institucionReferencia', '1');
    await component.guardarEgreso();
    await fixture.whenStable();

    expect(popUps.advertencia).toHaveBeenCalledWith('El motivo de referencia es obligatorio.');

    await escribir('#motivoReferencia', 'Requiere valoración por especialidad');
    await component.guardarEgreso();
    await fixture.whenStable();

    expect(altaService.crear).toHaveBeenCalledWith(
      expect.objectContaining({
        tipoAlta: 'REFERENCIA_TRASLADO',
        institucionId: 1,
        motivoReferencia: 'Requiere valoración por especialidad',
      }),
    );
  });

  it('avisa cuando no hay un episodio activo', async () => {
    episodioActivo.obtener.mockReturnValue(null);

    component.cargarAlta();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.sinEpisodioActivo).toBe(true);
    expect(elemento<HTMLElement>('.egreso-aviso').textContent).toContain(
      'Abra un episodio para registrar el alta.',
    );
  });

  it('avisa cuando el servidor no responde al cargar el alta', async () => {
    altaService.buscarPorEpisodio.mockReturnValue(throwError(() => new TimeoutError()));

    component.cargarAlta();
    await fixture.whenStable();

    expect(popUps.error).toHaveBeenCalledWith(
      'Error de comunicación. El servidor no respondió dentro del tiempo esperado.',
    );
  });

  it('oculta anular cuando pasaron más de 5 horas desde el alta', async () => {
    episodioActivo.esSoloLectura = () => false;
    altaService.buscarPorEpisodio.mockReturnValue(
      of([
        {
          ...altaVigente,
          fechaHoraEgreso: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        },
      ]),
    );

    component.cargarAlta();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.puedeAnularAlta).toBe(false);
    expect(botonAnular()).toBeNull();
  });

  it('permite anular dentro de las 5 horas aunque el episodio sea solo lectura', async () => {
    episodioActivo.esSoloLectura = () => true;
    await cargarAltaVigente();

    expect(botonAnular()).not.toBeNull();
    expect(elemento<HTMLInputElement>('#diagnosticoEgreso').disabled).toBe(true);
  });
});
