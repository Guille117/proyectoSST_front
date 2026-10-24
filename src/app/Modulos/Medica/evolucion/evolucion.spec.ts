import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError, TimeoutError } from 'rxjs';

import { PopUps } from '../../../shared/popUps/popUpsService';
import { AuthService } from '../../Auth/data/auth-service';
import { EpisodioActivoService } from '../data/episodio-activo-service';
import { PacienteService } from '../../Pacientes/paciente/data/paciente-service';
import { PacienteDetalle } from '../../Pacientes/paciente/data/pacienteInterfaz';
import { SignosVitalesService } from '../../Enfermeria/monitoreo/data/signos-vitales-service';
import { EvolucionService } from './data/evolucion-service';
import { EvolucionRequest, EvolucionResponse, EstadoEvolucionApi } from './data/evolucionInterfaz';
import { Evolucion } from './evolucion';

describe('Evolucion', () => {
  let component: Evolucion;
  let fixture: ComponentFixture<Evolucion>;
  let evolucionesMock: EvolucionResponse[] = [];

  const popUps = {
    confirmarToast: vi.fn(),
    exito: vi.fn(),
    error: vi.fn(),
    errorDesdeBackend: vi.fn(),
    advertencia: vi.fn(),
  };

  const servicio = {
    buscarPorEpisodio: vi.fn(),
    crear: vi.fn(),
    actualizar: vi.fn(),
    eliminar: vi.fn(),
  };

  const auth = { currentUser: () => ({ id: 2 }) };
  const episodio = {
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

  const evolucion = (
    id: number,
    estado: EstadoEvolucionApi,
    overrides: Partial<EvolucionResponse> = {},
  ): EvolucionResponse => ({
    id,
    evolucionClinica: 'Paciente con mejoría clínica.',
    planMedico: 'Continuar con el esquema indicado.',
    episodioId: 1,
    usuarioId: 2,
    usuarioNombre: 'Dr. Juan Pérez',
    fecha: '2026-10-12T10:30:00',
    estado,
    ...overrides,
  });

  const reiniciarEvoluciones = (): void => {
    evolucionesMock = [
      evolucion(1, 'ACTIVA', {
        evolucionClinica:
          'Paciente con disminución del dolor abdominal, sin nuevos episodios de vómitos. ' +
          'Presenta mejoría clínica.',
        planMedico:
          'Continuar con el esquema indicado, mantener la hidratación y vigilar la respuesta al ' +
          'tratamiento.',
        fecha: '2026-10-12T10:30:00',
      }),
      evolucion(2, 'ACTIVA', {
        evolucionClinica:
          'Paciente persiste con molestias abdominales. Se realiza valoración de seguimiento y ' +
          'respuesta al tratamiento.',
        planMedico: 'Mantener analgesia, control de signos vitales y valorar nuevos estudios.',
        usuarioNombre: 'Dra. Ana López',
        fecha: '2026-10-11T09:15:00',
      }),
      evolucion(3, 'ELIMINADA', {
        evolucionClinica:
          'Paciente ingresa con dolor abdominal y vómitos. Se inicia hidratación y analgesia.',
        planMedico: 'Solicitar hemograma, control de signos vitales y reevaluar en cuatro horas.',
        fecha: '2026-10-10T08:00:00',
      }),
    ];

    servicio.buscarPorEpisodio.mockImplementation(
      (_episodioId: number, estado: EstadoEvolucionApi) =>
        of(
          evolucionesMock
            .filter((registro) => registro.estado === estado)
            .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()),
        ),
    );
    servicio.crear.mockImplementation((request: EvolucionRequest) => {
      const nueva: EvolucionResponse = {
        ...request,
        id: 4,
        usuarioNombre: 'Dr. Juan Pérez',
        fecha: '2026-10-13T11:00:00',
        estado: 'ACTIVA',
      };
      evolucionesMock = [...evolucionesMock, nueva];
      return of(nueva);
    });
    servicio.actualizar.mockImplementation((id: number, request: EvolucionRequest) => {
      const actualizada: EvolucionResponse = {
        ...evolucionesMock.find((registro) => registro.id === id)!,
        ...request,
        id,
      };
      evolucionesMock = evolucionesMock.map((registro) =>
        registro.id === id ? actualizada : registro,
      );
      return of(actualizada);
    });
    servicio.eliminar.mockImplementation((id: number) => {
      evolucionesMock = evolucionesMock.map((registro) =>
        registro.id === id ? { ...registro, estado: 'ELIMINADA' as const } : registro,
      );
      return of(void 0);
    });
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    reiniciarEvoluciones();
    popUps.confirmarToast.mockResolvedValue(true);
    episodio.obtener.mockReturnValue(1);

    await TestBed.configureTestingModule({
      imports: [Evolucion],
      providers: [
        { provide: EvolucionService, useValue: servicio },
        { provide: EpisodioActivoService, useValue: episodio },
        { provide: PacienteService, useValue: pacienteService },
        { provide: SignosVitalesService, useValue: signosVitalesService },
        { provide: AuthService, useValue: auth },
        { provide: PopUps, useValue: popUps },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Evolucion);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  const elementos = <T extends Element>(selector: string): NodeListOf<T> =>
    fixture.nativeElement.querySelectorAll(selector);

  const elemento = <T extends Element>(selector: string): T =>
    fixture.nativeElement.querySelector(selector);

  // Selectores semánticos: los botones y la fila de acciones usan las clases globales de
  // src/styles/botonesStyle.scss
  const botonGuardar = (): HTMLButtonElement =>
    elemento<HTMLButtonElement>('.evolucion-acciones button[type="submit"]');

  const botonCancelar = (): HTMLButtonElement =>
    elemento<HTMLButtonElement>('.evolucion-acciones button._cancelar');

  const campos = (): NodeListOf<HTMLTextAreaElement> =>
    elementos<HTMLTextAreaElement>('.evolucion-campo');

  const tarjetas = (): NodeListOf<HTMLElement> => elementos<HTMLElement>('.evolucion-card');

  const disparadoresMenu = (): NodeListOf<HTMLButtonElement> =>
    elementos<HTMLButtonElement>('.evolucion-menu-trigger');

  const botonEditarDelMenu = (): HTMLButtonElement =>
    elemento<HTMLButtonElement>('.evolucion-menu .iconEditar');

  const botonEliminarDelMenu = (): HTMLButtonElement =>
    elemento<HTMLButtonElement>('.evolucion-menu .iconQuitar');

  // Filtros del historial: las evoluciones vigentes y las dadas de baja
  const filtrosHistorial = (): NodeListOf<HTMLButtonElement> =>
    elementos<HTMLButtonElement>('.historial-filtro');

  const filtroActivo = (): HTMLButtonElement =>
    elemento<HTMLButtonElement>('.historial-filtro--activo');

  const elegirFiltro = async (etiqueta: string): Promise<void> => {
    const boton = [...filtrosHistorial()].find((filtro) => filtro.textContent?.trim() === etiqueta);

    expect(boton).toBeDefined();
    boton?.click();
    await fixture.whenStable();
  };

  const escribir = async (selector: string, valor: string): Promise<void> => {
    const control = elemento<HTMLTextAreaElement>(selector);
    control.value = valor;
    control.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };

  // Despliega el menú de opciones de la tarjeta ubicada en la posición indicada del historial
  const abrirMenu = async (indice: number): Promise<void> => {
    disparadoresMenu()[indice].click();
    await fixture.whenStable();
  };

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ubica el registro y el historial en los dos paneles del módulo', () => {
    const registro = elemento<HTMLElement>('.panel-registro');
    const historial = elemento<HTMLElement>('.panel-historial');

    expect(elemento<HTMLElement>('.evolucion')).not.toBeNull();
    expect(registro.classList.contains('panel')).toBe(true);
    expect(historial.classList.contains('panel')).toBe(true);
    expect(registro.querySelector<HTMLElement>('.panel-titulo')?.textContent).toContain(
      'Registrar evolución',
    );
    expect(historial.querySelector<HTMLElement>('.panel-titulo')?.textContent).toContain(
      'Historial de evoluciones',
    );
    // El historial ya no muestra la insignia con la cantidad de registros
    expect(elemento('.historial-badge')).toBeNull();
    expect(elemento('.historial-encabezado')).toBeNull();
  });

  it('mantiene el registro antes que el historial', () => {
    const registro = elemento<HTMLElement>('.panel-registro');
    const historial = elemento<HTMLElement>('.panel-historial');

    expect(
      registro.compareDocumentPosition(historial) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('deja el desplazamiento solo para las tarjetas del historial', () => {
    const panel = elemento<HTMLElement>('.panel-historial');
    const filtros = elemento<HTMLElement>('.historial-filtros');
    const lista = elemento<HTMLElement>('.historial-lista');

    // El título y los filtros quedan fuera de la pista que se desplaza
    expect(panel.firstElementChild?.classList.contains('panel-titulo')).toBe(true);
    expect(filtros.closest('.historial-lista')).toBeNull();
    expect(filtros.nextElementSibling?.classList.contains('historial-lista')).toBe(true);
    expect(getComputedStyle(lista).overflowY).toBe('auto');
  });

  it('pide la evolución clínica y el plan médico en cuadros de texto con su límite de caracteres', () => {
    expect(campos().length).toBe(2);
    expect(elementos<HTMLLabelElement>('.evolucion-etiqueta').length).toBe(2);
    expect(campos()[0].id).toBe('evolucionClinica');
    expect(campos()[1].id).toBe('planMedico');
    expect(campos()[0].maxLength).toBe(component.maxCaracteres);
    expect(campos()[1].maxLength).toBe(component.maxCaracteres);
  });

  it('mantiene el guardado inhabilitado hasta capturar la evolución y el plan', async () => {
    expect(botonGuardar().type).toBe('submit');
    expect(botonGuardar().classList.contains('_guardar')).toBe(true);
    expect(botonGuardar().disabled).toBe(true);

    await escribir('#evolucionClinica', 'Paciente con mejoría clínica.');

    expect(component.puedeGuardar).toBe(false);
    expect(botonGuardar().disabled).toBe(true);

    await escribir('#planMedico', 'Continuar con el esquema indicado.');

    expect(component.puedeGuardar).toBe(true);
    expect(botonGuardar().disabled).toBe(false);
  });

  it('ofrece cancelar y guardar la evolución con botones del tamaño normal', () => {
    const acciones = elemento<HTMLElement>('.evolucion-acciones');

    expect(acciones.classList.contains('acciones-formulario')).toBe(true);
    expect(acciones.querySelectorAll('button.btn').length).toBe(2);
    // Mismo orden que en los demás formularios del módulo: cancelar antes de guardar
    expect(acciones.querySelectorAll('button.btn')[0]).toBe(botonCancelar());
    expect(botonCancelar().type).toBe('button');
    expect(botonCancelar().classList.contains('_cancelar')).toBe(true);
    expect(botonCancelar().textContent?.trim()).toBe('Cancelar');
    expect(botonGuardar().textContent?.trim()).toBe('Guardar evolución');
  });

  it('descarta lo capturado al cancelar y deja el registro vacío', async () => {
    await escribir('#evolucionClinica', 'Paciente con dolor abdominal en descenso.');
    await escribir('#planMedico', 'Mantener analgesia y control de signos vitales.');

    expect(component.puedeGuardar).toBe(true);

    botonCancelar().click();
    await fixture.whenStable();

    expect(component.evolucionClinica).toBe('');
    expect(component.planMedico).toBe('');
    expect(campos()[0].value).toBe('');
    expect(campos()[1].value).toBe('');
    expect(botonGuardar().disabled).toBe(true);
  });

  it('abre el historial con el filtro Activas y sus dos opciones de filtrado', () => {
    expect([...filtrosHistorial()].map((filtro) => filtro.textContent?.trim())).toEqual([
      'Activas',
      'Eliminadas',
    ]);
    expect(component.filtroEvolucion).toBe('activas');
    expect(filtroActivo().textContent?.trim()).toBe('Activas');
    expect(filtroActivo().getAttribute('aria-pressed')).toBe('true');
    expect(elementos<HTMLElement>('.historial-filtro[aria-pressed="true"]').length).toBe(1);

    // «Activas» consulta el estado vigente del backend y deja fuera las eliminadas
    expect(servicio.buscarPorEpisodio).toHaveBeenCalledWith(1, 'ACTIVA');
    expect(tarjetas().length).toBe(2);
  });

  it('muestra solo las evoluciones del estado elegido', async () => {
    await elegirFiltro('Eliminadas');

    expect(component.filtroEvolucion).toBe('eliminadas');
    expect(filtroActivo().textContent?.trim()).toBe('Eliminadas');
    expect(servicio.buscarPorEpisodio).toHaveBeenCalledWith(1, 'ELIMINADA');
    expect(tarjetas().length).toBe(1);
    expect(tarjetas()[0].textContent).toContain('Paciente ingresa con dolor abdominal');
    // La tarjeta de una evolución dada de baja lleva su acento gris
    expect(tarjetas()[0].classList.contains('evolucion-card--eliminada')).toBe(true);

    await elegirFiltro('Activas');

    expect(tarjetas().length).toBe(2);
    expect(elemento('.evolucion-card--eliminada')).toBeNull();
  });

  it('lista cada evolución como una tarjeta del historial con su acento de color', () => {
    expect(tarjetas().length).toBe(component.evolucionesFiltradas.length);
    expect(disparadoresMenu().length).toBe(component.evolucionesFiltradas.length);
    // El botón de editar solo vive dentro del menú, no suelto en la tarjeta
    expect(elementos<HTMLButtonElement>('.evolucion-card button.iconEditar').length).toBe(0);
    expect(elemento('.evolucion-menu')).toBeNull();

    component.evolucionesFiltradas.forEach((evolucion, indice) => {
      const tarjeta = tarjetas()[indice];

      expect(tarjeta.classList.contains(`evolucion-card--${evolucion.tono}`)).toBe(true);
      // La tarjeta se titula con el registro clínico y deja la fecha, la hora y el médico en el pie
      expect(tarjeta.querySelector<HTMLElement>('.evolucion-titulo')?.textContent?.trim()).toBe(
        'Evolución clínica',
      );

      const pie = tarjeta.querySelector<HTMLElement>('.evolucion-meta');

      expect(pie?.textContent).toContain(evolucion.fecha);
      expect(pie?.textContent).toContain(evolucion.hora);
      expect(pie?.textContent).toContain(evolucion.medico);
      expect([...(pie?.querySelectorAll('i') ?? [])].map((icono) => icono.className)).toEqual([
        'bi bi-calendar3',
        'bi bi-clock',
        'bi bi-person',
      ]);
      expect(
        tarjeta
          .querySelector<HTMLElement>('.evolucion-menu-trigger i')
          ?.classList.contains('bi-three-dots-vertical'),
      ).toBe(true);
    });
  });

  it('muestra en cada tarjeta la evolución clínica y el plan médico con su rótulo', () => {
    component.evolucionesFiltradas.forEach((evolucion, indice) => {
      const tarjeta = tarjetas()[indice];
      const rotulos = tarjeta.querySelectorAll<HTMLElement>('.evolucion-detalle-etiqueta');

      // El texto de la evolución clínica va bajo el título de la tarjeta y el plan médico con su rótulo
      expect(rotulos.length).toBe(1);
      expect(rotulos[0].textContent?.trim()).toBe('Plan médico');
      expect(tarjeta.querySelector<HTMLElement>('.evolucion-clinica')?.textContent).toContain(
        evolucion.evolucionClinica,
      );
      expect(tarjeta.querySelector<HTMLElement>('.evolucion-plan')?.textContent).toContain(
        evolucion.planMedico,
      );
    });
  });

  it('no ofrece el ojo de ver ni el enlace de la evolución completa en las tarjetas', () => {
    expect(elemento('.evolucion-card .bi-eye')).toBeNull();
    expect(elemento('.evolucion-card .historial-enlace')).toBeNull();
    expect(elemento('.historial-punto')).toBeNull();
    expect(tarjetas()[0].textContent).not.toContain('Ver evolución completa');
  });

  it('despliega el menú de opciones de la tarjeta pulsada y lo repliega al volver a pulsarla', async () => {
    await abrirMenu(0);

    expect(component.menuEvolucionAbierta).toBe(component.evoluciones[0].id);
    expect(tarjetas()[0].querySelector('.evolucion-menu')).not.toBeNull();
    expect(tarjetas()[0].classList.contains('evolucion-card--menu-abierto')).toBe(true);
    expect(disparadoresMenu()[0].getAttribute('aria-expanded')).toBe('true');
    expect(elementos('.evolucion-menu').length).toBe(1);
    // El menú ofrece editar y eliminar la evolución
    expect(elemento<HTMLElement>('.evolucion-menu').textContent).toContain('Editar');
    expect(elemento<HTMLElement>('.evolucion-menu').textContent).toContain('Eliminar');

    await abrirMenu(0);

    expect(component.menuEvolucionAbierta).toBeNull();
    expect(elemento('.evolucion-menu')).toBeNull();
    expect(disparadoresMenu()[0].getAttribute('aria-expanded')).toBe('false');
  });

  it('mantiene un solo menú abierto a la vez', async () => {
    await abrirMenu(0);
    await abrirMenu(1);

    expect(component.menuEvolucionAbierta).toBe(component.evoluciones[1].id);
    expect(elementos('.evolucion-menu').length).toBe(1);
    expect(tarjetas()[1].querySelector('.evolucion-menu')).not.toBeNull();
  });

  it('cierra el menú al pulsar fuera de la tarjeta que lo tiene abierto', async () => {
    await abrirMenu(0);

    // El panel del historial no está dentro de ninguna tarjeta
    elemento<HTMLElement>('.panel-historial').dispatchEvent(new Event('click', { bubbles: true }));
    await fixture.whenStable();

    expect(component.menuEvolucionAbierta).toBeNull();
    expect(elemento('.evolucion-menu')).toBeNull();
  });

  it('mantiene el menú abierto al pulsar dentro de la misma tarjeta', async () => {
    await abrirMenu(0);

    tarjetas()[0]
      .querySelector('.evolucion-titulo')
      ?.dispatchEvent(new Event('click', { bubbles: true }));
    await fixture.whenStable();

    expect(component.menuEvolucionAbierta).toBe(component.evoluciones[0].id);
    expect(elementos('.evolucion-menu').length).toBe(1);
  });

  it('carga en el registro la evolución elegida al editar', async () => {
    const elegida = component.evoluciones[1];

    await abrirMenu(1);
    botonEditarDelMenu().click();
    await fixture.whenStable();

    expect(component.evolucionEnEdicion).toBe(elegida.id);
    expect(component.evolucionClinica).toBe(elegida.evolucionClinica);
    expect(component.planMedico).toBe(elegida.planMedico);
    expect(campos()[0].value).toBe(elegida.evolucionClinica);
    expect(campos()[1].value).toBe(elegida.planMedico);
    expect(tarjetas()[1].classList.contains('evolucion-card--edicion')).toBe(true);
    // El menú se cierra al elegir la opción
    expect(elemento('.evolucion-menu')).toBeNull();
  });

  it('guarda los cambios sobre la misma tarjeta y conserva fecha, hora, médico y color', async () => {
    const elegida = component.evoluciones[1];
    const total = component.evoluciones.length;

    await abrirMenu(1);
    botonEditarDelMenu().click();
    await fixture.whenStable();

    await escribir('#evolucionClinica', 'Paciente estable, sin dolor abdominal.');
    await escribir('#planMedico', 'Alta con control en consulta externa.');

    botonGuardar().click();
    await fixture.whenStable();

    expect(popUps.confirmarToast).toHaveBeenCalledWith(
      `¿Está seguro de guardar los cambios de la evolución del ${elegida.fecha}?`,
    );
    expect(servicio.actualizar).toHaveBeenCalledWith(2, {
      evolucionClinica: 'Paciente estable, sin dolor abdominal.',
      planMedico: 'Alta con control en consulta externa.',
      episodioId: 1,
      usuarioId: 2,
    });
    expect(component.evoluciones.length).toBe(total);
    expect(tarjetas()[1].textContent).toContain('Paciente estable, sin dolor abdominal.');
    expect(tarjetas()[1].textContent).toContain(elegida.fecha);
    expect(tarjetas()[1].textContent).toContain(elegida.hora);
    expect(tarjetas()[1].textContent).toContain(elegida.medico);
    expect(tarjetas()[1].classList.contains(`evolucion-card--${elegida.tono}`)).toBe(true);

    // El registro queda libre y ninguna tarjeta sigue marcada como edición
    expect(component.evolucionEnEdicion).toBeNull();
    expect(component.evolucionClinica).toBe('');
    expect(elemento('.evolucion-card--edicion')).toBeNull();
  });

  it('vuelve a agregar al inicio del historial después de cancelar la edición', async () => {
    await abrirMenu(0);
    botonEditarDelMenu().click();
    await fixture.whenStable();

    expect(component.evolucionEnEdicion).toBe(component.evoluciones[0].id);

    botonCancelar().click();
    await fixture.whenStable();

    expect(component.evolucionEnEdicion).toBeNull();
    expect(elemento('.evolucion-card--edicion')).toBeNull();

    const total = component.evoluciones.length;

    await escribir('#evolucionClinica', 'Nueva evolución de control.');
    await escribir('#planMedico', 'Continuar con el plan indicado.');

    botonGuardar().click();
    await fixture.whenStable();

    expect(component.evoluciones.length).toBe(total + 1);
    expect(tarjetas()[0].textContent).toContain('Nueva evolución de control.');
  });

  it('da de baja la evolución confirmada en el popup y la deja entre las eliminadas', async () => {
    const eliminada = component.evoluciones[0];
    const restante = component.evoluciones[1];
    const vigentes = component.evolucionesFiltradas.length;

    await abrirMenu(0);
    botonEliminarDelMenu().click();
    await fixture.whenStable();

    expect(popUps.confirmarToast).toHaveBeenCalledWith(
      `¿Está seguro de eliminar la evolución del ${eliminada.fecha}?`,
    );
    expect(servicio.eliminar).toHaveBeenCalledWith(eliminada.id);
    expect(component.menuEvolucionAbierta).toBeNull();
    // La baja es lógica: el registro sigue consultable con el filtro de eliminadas
    expect(tarjetas().length).toBe(vigentes - 1);
    expect(tarjetas()[0].textContent).toContain(restante.medico);

    await elegirFiltro('Eliminadas');

    expect(tarjetas().length).toBe(2);
    expect(tarjetas()[0].textContent).toContain(eliminada.evolucionClinica);
    expect(tarjetas()[0].classList.contains('evolucion-card--eliminada')).toBe(true);
  });

  it('conserva la evolución si la confirmación se cancela', async () => {
    popUps.confirmarToast.mockResolvedValue(false);
    const vigentes = component.evolucionesFiltradas.length;

    await abrirMenu(0);
    botonEliminarDelMenu().click();
    await fixture.whenStable();

    expect(servicio.eliminar).not.toHaveBeenCalled();
    expect(component.evolucionesFiltradas.length).toBe(vigentes);
    expect(tarjetas().length).toBe(vigentes);
    expect(component.evolucionesFiltradas.every((evolucion) => evolucion.estado === 'activa')).toBe(
      true,
    );
  });

  it('libera el registro cuando se elimina la evolución que estaba en edición', async () => {
    const elegida = component.evoluciones[1];
    const vigentes = component.evolucionesFiltradas.length;

    await abrirMenu(1);
    botonEditarDelMenu().click();
    await fixture.whenStable();

    expect(component.evolucionEnEdicion).toBe(elegida.id);

    await abrirMenu(1);
    botonEliminarDelMenu().click();
    await fixture.whenStable();

    expect(component.evolucionEnEdicion).toBeNull();
    expect(component.evolucionClinica).toBe('');
    expect(component.planMedico).toBe('');
    // La evolución dada de baja sale del listado de activas
    expect(tarjetas().length).toBe(vigentes - 1);
    expect(tarjetas()[0].textContent).toContain(component.evoluciones[0].medico);
  });

  it('guarda la evolución escrita al inicio del historial y limpia el formulario', async () => {
    const total = component.evoluciones.length;
    // La evolución registrada antes de guardar pasa a ser la segunda tarjeta del historial
    const anterior = component.evolucionesFiltradas[0].evolucionClinica;

    await escribir('#evolucionClinica', 'Sin fiebre y con tolerancia a la vía oral.');
    await escribir('#planMedico', 'Alta con control en consulta externa.');

    botonGuardar().click();
    await fixture.whenStable();

    expect(servicio.crear).toHaveBeenCalledWith({
      evolucionClinica: 'Sin fiebre y con tolerancia a la vía oral.',
      planMedico: 'Alta con control en consulta externa.',
      episodioId: 1,
      usuarioId: 2,
    });
    expect(component.evoluciones.length).toBe(total + 1);
    expect(tarjetas().length).toBe(total + 1);
    expect(tarjetas()[0].textContent).toContain('Sin fiebre y con tolerancia a la vía oral.');
    expect(tarjetas()[1].textContent).toContain(anterior);

    // La captura queda limpia y el guardado vuelve a quedar inhabilitado
    expect(component.evolucionClinica).toBe('');
    expect(component.planMedico).toBe('');
    expect(campos()[0].value).toBe('');
    expect(campos()[1].value).toBe('');
    expect(botonGuardar().disabled).toBe(true);
  });

  it('asigna a la evolución nueva uno de los acentos de color de las tarjetas', async () => {
    await escribir('#evolucionClinica', 'Evolución de control.');
    await escribir('#planMedico', 'Plan de seguimiento.');

    botonGuardar().click();
    await fixture.whenStable();

    expect(['verde', 'azul', 'naranja', 'morado']).toContain(component.evoluciones[0].tono);
    expect(
      tarjetas()[0].classList.contains(`evolucion-card--${component.evoluciones[0].tono}`),
    ).toBe(true);
  });

  it('no registra la evolución cuando falta la evolución clínica o el plan médico', async () => {
    const total = component.evoluciones.length;

    await escribir('#evolucionClinica', '   ');
    await escribir('#planMedico', 'Continuar con el tratamiento.');

    botonGuardar().click();
    await fixture.whenStable();

    expect(servicio.crear).not.toHaveBeenCalled();
    expect(component.evoluciones.length).toBe(total);

    // El envío del formulario vacío tampoco registra nada
    component.limpiarFormulario();
    component.guardarEvolucion();
    await fixture.whenStable();

    expect(servicio.crear).not.toHaveBeenCalled();
    expect(component.evoluciones.length).toBe(total);
  });

  it('avisa cuando el paciente aún no tiene evoluciones registradas', async () => {
    component.evoluciones = [];
    fixture.detectChanges();
    await fixture.whenStable();

    expect(tarjetas().length).toBe(0);
    expect(elemento('.evolucion-card')).toBeNull();
    expect(elementos<HTMLButtonElement>('.evolucion-menu-trigger').length).toBe(0);
    expect(elemento<HTMLElement>('.historial-vacio').textContent).toContain(
      'Aún no hay evoluciones registradas',
    );
  });

  it('avisa cuando el filtro de eliminadas no tiene evoluciones', async () => {
    // Sin evoluciones dadas de baja el listado queda vacío con su propio aviso
    evolucionesMock = evolucionesMock.filter((evolucion) => evolucion.estado === 'ACTIVA');

    await elegirFiltro('Eliminadas');

    expect(tarjetas().length).toBe(0);
    expect(elemento<HTMLElement>('.historial-vacio').textContent).toContain(
      'No hay evoluciones eliminadas',
    );
  });

  it('libera la edición cuando el filtro elegido deja fuera la evolución cargada', async () => {
    await abrirMenu(1);
    botonEditarDelMenu().click();
    await fixture.whenStable();

    expect(component.evolucionEnEdicion).toBe(component.evoluciones[1].id);

    await elegirFiltro('Eliminadas');

    expect(filtroActivo().textContent?.trim()).toBe('Eliminadas');
    expect(component.evolucionEnEdicion).toBeNull();
    expect(component.evolucionClinica).toBe('');
    expect(component.planMedico).toBe('');
    expect(elemento('.evolucion-card--edicion')).toBeNull();
    expect(botonGuardar().disabled).toBe(true);
  });

  it('vuelve a las activas al guardar para dejar a la vista la evolución registrada', async () => {
    await elegirFiltro('Eliminadas');

    await escribir('#evolucionClinica', 'Evolución registrada desde el filtro de eliminadas.');
    await escribir('#planMedico', 'Continuar con el plan indicado.');

    botonGuardar().click();
    await fixture.whenStable();

    expect(component.filtroEvolucion).toBe('activas');
    expect(filtroActivo().textContent?.trim()).toBe('Activas');
    expect(tarjetas()[0].textContent).toContain(
      'Evolución registrada desde el filtro de eliminadas.',
    );
  });

  it('avisa cuando no hay un episodio activo', async () => {
    episodio.obtener.mockReturnValue(null);

    component.cargarEvoluciones();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.sinEpisodioActivo).toBe(true);
    expect(tarjetas().length).toBe(0);
    expect(elemento<HTMLElement>('.historial-vacio').textContent).toContain(
      'Abra un episodio para consultar sus evoluciones.',
    );
  });

  it('avisa cuando el servidor no responde al cargar el historial', async () => {
    servicio.buscarPorEpisodio.mockReturnValue(throwError(() => new TimeoutError()));

    component.cargarEvoluciones();
    await fixture.whenStable();

    expect(popUps.error).toHaveBeenCalledWith(
      'Error de comunicación. El servidor no respondió dentro del tiempo esperado.',
    );
  });

  // Ficha con los datos del paciente: el mismo bloque compartido que usan evaluación clínica e
  // indicaciones médicas
  const botonPestanaPaciente = (): HTMLButtonElement =>
    elemento<HTMLButtonElement>('.ficha-pestana');

  const fichaPaciente = (): HTMLElement | null =>
    fixture.nativeElement.querySelector('app-datos-paciente .ficha');

  it('reutiliza el bloque de datos del paciente de las demás pantallas del módulo', () => {
    // La pantalla no duplica la ficha: se dibuja el bloque compartido, cerrado y con su pestaña
    expect(elemento<HTMLElement>('app-datos-paciente')).not.toBeNull();
    expect(elemento<HTMLElement>('app-datos-paciente .ficha-pestana')).not.toBeNull();
    expect(fichaPaciente()).toBeNull();
  });

  it('abre la ficha del paciente con la pestaña lateral y reserva su espacio', async () => {
    expect(component.pacienteAbierto).toBe(false);
    expect(botonPestanaPaciente().getAttribute('aria-expanded')).toBe('false');
    expect(elemento<HTMLElement>('.evolucion').classList.contains('evolucion--ficha-abierta')).toBe(
      false,
    );

    botonPestanaPaciente().click();
    await fixture.whenStable();

    const rejilla = elemento<HTMLElement>('.evolucion');
    expect(component.pacienteAbierto).toBe(true);
    expect(botonPestanaPaciente().getAttribute('aria-expanded')).toBe('true');
    expect(rejilla.classList.contains('evolucion--ficha-abierta')).toBe(true);

    const ficha = fichaPaciente();
    expect(ficha).not.toBeNull();

    botonPestanaPaciente().click();
    await fixture.whenStable();

    expect(component.pacienteAbierto).toBe(false);
    expect(fichaPaciente()).toBeNull();
    expect(rejilla.classList.contains('evolucion--ficha-abierta')).toBe(false);
  });

  it('oculta el registro y las acciones cuando el episodio es solo lectura', async () => {
    episodio.esSoloLectura = () => true;
    fixture.detectChanges();
    await fixture.whenStable();

    expect(elemento('.evolucion-form')).toBeNull();
    expect(elemento('.evolucion-menu-trigger')).toBeNull();
  });
});
