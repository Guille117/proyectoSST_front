import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';

import { Atencion } from './atencion';
import { PacienteService } from '../../Pacientes/paciente/data/paciente-service';
import { PacienteDetalle, PacienteResumido } from '../../Pacientes/paciente/data/pacienteInterfaz';
import { SignosVitalesService } from '../../Enfermeria/monitoreo/data/signos-vitales-service';
import { SignosVitalesResponse } from '../../Enfermeria/monitoreo/data/signosVitalesInterfaz';
import { AltaService } from '../alta/data/alta-service';
import { EpisodioActivoService } from '../data/episodio-activo-service';
import { PopUps } from '../../../shared/popUps/popUpsService';

describe('Atencion', () => {
  let component: Atencion;
  let fixture: ComponentFixture<Atencion>;
  let respuesta: Subject<PacienteResumido[]>;

  const pacientes: PacienteResumido[] = [
    {
      pacienteId: 1,
      codigoExpediente: 'EXP-001',
      episodioId: 101,
      ultimoEpisodioId: 101,
      fechaHoraIngreso: '2026-10-10T08:30:00',
      nombreCompleto: 'Juan Pérez',
      cui: '1234567890123',
      sexo: 'MASCULINO',
      telefono: '70000001',
      tipoTratamiento: 'HOSPITALIZACION',
      estado: true,
    },
    {
      pacienteId: 2,
      codigoExpediente: 'EXP-002',
      episodioId: 102,
      ultimoEpisodioId: 102,
      fechaHoraIngreso: '2026-10-10T09:00:00',
      nombreCompleto: 'María López',
      cui: null,
      sexo: 'FEMENINO',
      telefono: '70000002',
      tipoTratamiento: 'EMERGENCIA',
      estado: true,
    },
    {
      pacienteId: 3,
      codigoExpediente: 'EXP-003',
      episodioId: 103,
      ultimoEpisodioId: 103,
      fechaHoraIngreso: '2026-10-10T10:00:00',
      nombreCompleto: 'Carlos Méndez',
      cui: '9876543210123',
      sexo: 'MASCULINO',
      telefono: '70000003',
      tipoTratamiento: 'HOSPITALIZACION',
      estado: true,
    },
    {
      pacienteId: 4,
      codigoExpediente: 'EXP-004',
      episodioId: 104,
      ultimoEpisodioId: 104,
      fechaHoraIngreso: '2026-10-10T11:00:00',
      nombreCompleto: 'Ana Rodríguez',
      cui: null,
      sexo: 'FEMENINO',
      telefono: '70000004',
      tipoTratamiento: 'EMERGENCIA',
      estado: true,
    },
  ];

  const pacienteEgresado: PacienteResumido = {
    pacienteId: 5,
    codigoExpediente: 'EXP-005',
    episodioId: null,
    ultimoEpisodioId: 201,
    fechaHoraIngreso: null,
    nombreCompleto: 'Luis Ramírez',
    cui: null,
    sexo: 'MASCULINO',
    telefono: '70000005',
    tipoTratamiento: 'HOSPITALIZACION',
    estado: true,
  };

  const detallePaciente: PacienteDetalle = {
    pacienteId: 1,
    codigoExpediente: 'EXP-001',
    nombreCompleto: 'Juan Pérez',
    nombres: 'Juan',
    apellidos: 'Pérez',
    cui: '1234567890123',
    fechaNacimiento: '1981-01-01',
    edad: 45,
    sexo: 'MASCULINO',
    telefono: '70000001',
    email: null,
    estadoCivil: 'CASADO',
    direccion: 'Casa',
    ocupacion: 'Comerciante',
    estado: true,
    episodioId: 101,
    tipoAtencion: 'HOSPITALIZACION',
    descripcion: 'Gastroenteritis aguda',
    fechaHoraIngreso: '2026-10-10T08:30:00',
    medicoId: 5,
    medicoNombre: 'Dr. Juan Pérez',
    camaId: 70,
    camaCodigo: 'A-105',
    responsable: {
      id: 40,
      cui: '9876543210123',
      nombres: 'Rosa',
      apellidos: 'Pérez',
      fechaNacimiento: '1970-01-01',
      sexo: 'FEMENINO',
      telefono: '87654321',
      parentescoId: 7,
      parentescoNombre: 'Madre',
      direccion: 'Casa',
    },
    referencia: null,
    alergias: [{ id: 2, nombre: 'Penicilina' }],
    enfermedades: [{ id: 1, nombre: 'Diabetes' }],
  };

  const detalleDe = (pacienteId: number): PacienteDetalle => {
    const resumen = pacientes.find((item) => item.pacienteId === pacienteId);

    return {
      ...detallePaciente,
      pacienteId,
      codigoExpediente: resumen?.codigoExpediente ?? detallePaciente.codigoExpediente,
      nombreCompleto: resumen?.nombreCompleto ?? detallePaciente.nombreCompleto,
      sexo: resumen?.sexo ?? detallePaciente.sexo,
      episodioId: resumen?.episodioId ?? detallePaciente.episodioId,
      tipoAtencion: resumen?.tipoTratamiento ?? detallePaciente.tipoAtencion,
      camaCodigo: resumen?.tipoTratamiento === 'EMERGENCIA' ? null : detallePaciente.camaCodigo,
      medicoNombre: pacienteId === 1 ? 'Dr. Juan Pérez' : 'Dr. Carlos Ruiz',
    };
  };

  const signoVital: SignosVitalesResponse = {
    id: 1,
    sistolica: 120,
    diastolica: 80,
    frecuenciaCardiaca: 82,
    frecuenciaRespiratoria: 18,
    temperatura: 37.2,
    saturacion: 97,
    observacion: null,
    episodioId: 101,
    usuarioId: 5,
    usuarioNombre: 'Enf. Ana López',
    fecha: '2026-10-10T09:00:00',
    eliminado: false,
  };

  const altaReciente = {
    altaId: 1,
    tipoAlta: 'INDICACION_MEDICA',
    fechaHoraEgreso: '2026-10-18T09:30:00',
    diagnosticoEgreso: 'Neumonía resuelta',
    condicionEgresoNombre: 'Mejorado',
    observacionEgreso: 'Control en 7 días',
    responsableRetiro: null,
    motivoRetiro: null,
    riesgosRetiro: [],
    institucionNombre: null,
    motivoReferencia: null,
    indicacionesTraslado: null,
    episodioId: 201,
    pacienteId: 5,
    codigoExpediente: 'EXP-005',
    nombreCompleto: 'Luis Ramírez',
    cui: null,
    sexo: 'MASCULINO',
    telefono: '70000005',
    tipoAtencion: 'HOSPITALIZACION',
    edad: 61,
  };

  const servicio = {
    listarPacientes: vi.fn(),
    obtenerPaciente: vi.fn((pacienteId: number) => of(detalleDe(pacienteId))),
  };
  const servicioSignos = { buscarPorEpisodio: vi.fn(() => of([signoVital])) };
  const servicioAltas = { recientes: vi.fn(() => of([altaReciente])) };
  const episodioActivo = {
    guardar: vi.fn(),
    guardarPaciente: vi.fn(),
    limpiar: vi.fn(),
    obtener: vi.fn(),
    esSoloLectura: () => false,
  };
  const popUps = {
    advertencia: vi.fn(),
    error: vi.fn(),
    exito: vi.fn(),
    errorDesdeBackend: vi.fn(),
    confirmarToast: vi.fn(),
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    respuesta = new Subject<PacienteResumido[]>();
    servicio.listarPacientes.mockReturnValue(respuesta.asObservable());
    servicio.obtenerPaciente.mockImplementation((pacienteId: number) => of(detalleDe(pacienteId)));
    servicioSignos.buscarPorEpisodio.mockReturnValue(of([signoVital]));
    servicioAltas.recientes.mockReturnValue(of([altaReciente]));

    await TestBed.configureTestingModule({
      imports: [Atencion],
      providers: [
        { provide: PacienteService, useValue: servicio },
        { provide: SignosVitalesService, useValue: servicioSignos },
        { provide: AltaService, useValue: servicioAltas },
        { provide: EpisodioActivoService, useValue: episodioActivo },
        { provide: PopUps, useValue: popUps },
        provideRouter([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Atencion);
    component = fixture.componentInstance;
  });

  /** Carga el listado con la respuesta del backend y espera a que la pantalla quede estable. */
  const render = async (): Promise<void> => renderCon(pacientes);

  const renderCon = async (lista: PacienteResumido[]): Promise<void> => {
    fixture.detectChanges();
    respuesta.next(lista);
    respuesta.complete();
    fixture.detectChanges();
    await fixture.whenStable();
  };

  const tarjetas = (): HTMLElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('.paciente-card'));

  const elemento = <T extends Element>(selector: string): T =>
    fixture.nativeElement.querySelector(selector);

  const elementos = <T extends Element>(selector: string): NodeListOf<T> =>
    fixture.nativeElement.querySelectorAll(selector);

  const pulsarFiltro = (etiqueta: string): void => {
    const chip = Array.from(elementos<HTMLElement>('.chip')).find(
      (boton) => (boton.textContent ?? '').trim() === etiqueta,
    );
    chip?.click();
    fixture.detectChanges();
  };

  /** Hojas de estilo del componente tal como se inyectan en el documento durante las pruebas. */
  const estilos = (): string =>
    Array.from(document.querySelectorAll('style'))
      .map((hoja) => hoja.textContent ?? '')
      .join('\n')
      .replace(/\s+/g, '');

  /** Declaraciones de una regla del componente, sin espacios, para comprobar sus valores. */
  const regla = (selector: string): string => {
    const hoja = estilos();
    const inicio = hoja.indexOf(selector);

    return inicio < 0 ? '' : hoja.slice(inicio, hoja.indexOf('}', inicio));
  };

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('muestra el aviso de carga mientras espera la respuesta', () => {
    fixture.detectChanges();

    expect(component.cargando).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Cargando pacientes');
  });

  it('selecciona el primer paciente de la lista y muestra su información', async () => {
    await render();

    expect(component.pacienteSeleccionado?.nombre).toBe('Juan Pérez');
    expect(component.pacienteSeleccionado?.expediente).toBe('EXP-001');

    const pantalla: string = fixture.nativeElement.textContent;
    expect(pantalla).toContain('Juan Pérez');
    expect(pantalla).toContain('Gastroenteritis aguda');
    expect(pantalla).toContain('Cama A-105');
    expect(pantalla).toContain('Últimos signos vitales');
  });

  it('carga el detalle real del paciente y sus últimos signos vitales', async () => {
    await render();

    expect(servicio.obtenerPaciente).toHaveBeenCalledWith(1);
    expect(servicioSignos.buscarPorEpisodio).toHaveBeenCalledWith(101);

    const pantalla: string = fixture.nativeElement.textContent;
    expect(pantalla).toContain('Dr. Juan Pérez');
    expect(pantalla).toContain('A-105');
    expect(pantalla).toContain('Gastroenteritis aguda');
    expect(pantalla).toContain('Penicilina');
    expect(pantalla).toContain('Diabetes');
    expect(pantalla).toContain('120/80');
    expect(pantalla).toContain('82');
    expect(pantalla).toContain('37.2');
    expect(pantalla).toContain('97');
  });

  it('avisa si falla el detalle y ofrece reintentar', async () => {
    const registrado = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    servicio.obtenerPaciente.mockReturnValue(throwError(() => new Error('fallo del servidor')));

    await render();

    expect(fixture.nativeElement.textContent).toContain('fallo del servidor');
    const reintentar = elemento<HTMLButtonElement>('.aviso-error .btns');
    expect(reintentar).not.toBeNull();

    servicio.obtenerPaciente.mockImplementation((pacienteId: number) => of(detalleDe(pacienteId)));
    reintentar.click();
    fixture.detectChanges();
    await fixture.whenStable();

    expect(servicio.obtenerPaciente).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.textContent).toContain('Dr. Juan Pérez');
    expect(registrado).toHaveBeenCalled();
  });

  it('lista los pacientes recibidos y titula los filtros sin contadores', async () => {
    await render();

    expect(tarjetas().length).toBe(4);

    // Los botones de filtro no repiten el número de pacientes de cada grupo
    const etiquetas = Array.from(elementos<HTMLElement>('.chip')).map((chip) =>
      (chip.textContent ?? '').trim(),
    );
    expect(etiquetas).toEqual(['Todos', 'Emergencia', 'Hospitalización', 'Altas recientes']);
  });

  it('consulta y muestra las altas de las últimas 48 horas', async () => {
    await render();

    pulsarFiltro('Altas recientes');
    await fixture.whenStable();

    expect(servicioAltas.recientes).toHaveBeenCalledWith(48);
    expect(component.filtroActivo).toBe('altasRecientes');
    expect(tarjetas().length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Luis Ramírez');
    expect(fixture.nativeElement.textContent).toContain('Neumonía resuelta');
    expect(elementos<HTMLElement>('.paciente-ubicacion').length).toBe(0);
  });

  it('avisa si fallan las altas recientes y ofrece reintentar', async () => {
    const registrado = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    servicioAltas.recientes.mockReturnValue(throwError(() => new Error('fallo del servidor')));
    await render();

    pulsarFiltro('Altas recientes');
    await fixture.whenStable();

    expect(component.errorAltas).toBe(true);
    expect(fixture.nativeElement.textContent).toContain(
      'No se pudieron cargar las altas recientes.',
    );
    expect(elemento('.lista-aviso--error .btn')).not.toBeNull();
    expect(registrado).toHaveBeenCalled();
  });

  it('muestra los datos del egreso y abre su último episodio en solo lectura', async () => {
    await render();
    pulsarFiltro('Altas recientes');
    await fixture.whenStable();
    tarjetas()[0].click();
    fixture.detectChanges();

    const pantalla: string = fixture.nativeElement.textContent;
    expect(pantalla).toContain('Información del egreso');
    expect(pantalla).toContain('Alta médica');
    expect(pantalla).toContain('Mejorado');
    expect(pantalla).toContain('Control en 7 días');
    expect(elemento<HTMLElement>('.acciones ._guardar')?.textContent).toContain(
      'Abrir último episodio',
    );

    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    component.abrirUltimoEpisodio();

    expect(episodioActivo.guardar).toHaveBeenCalledWith(201, true);
    expect(navegar).toHaveBeenCalledWith(['/medica', 'evaluacion']);
  });

  it('filtra los pacientes por tipo de atención', async () => {
    await render();

    const chips = Array.from(fixture.nativeElement.querySelectorAll('.chip')) as HTMLElement[];
    chips[1].click();
    fixture.detectChanges();

    expect(component.filtroActivo).toBe('emergencia');
    expect(tarjetas().length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('María López');
    expect(fixture.nativeElement.textContent).not.toContain('Juan Pérez');
  });

  it('oculta a los egresados en los filtros de atención', async () => {
    await renderCon([...pacientes, pacienteEgresado]);

    expect(tarjetas().length).toBe(4);
    expect(fixture.nativeElement.textContent).not.toContain('Luis Ramírez');
  });

  it('busca egresados y ofrece abrir su último episodio', async () => {
    await renderCon([...pacientes, pacienteEgresado]);

    const buscador = fixture.nativeElement.querySelector('.inputB') as HTMLInputElement;
    buscador.value = 'luis';
    buscador.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(tarjetas().length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('EXP-005');
    expect(elemento<HTMLElement>('.acciones')?.textContent).toContain('Abrir último episodio');

    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    elemento<HTMLButtonElement>('.acciones ._guardar').click();
    await fixture.whenStable();

    expect(episodioActivo.guardar).toHaveBeenCalledWith(201, true);
    expect(navegar).toHaveBeenCalledWith(['/medica', 'evaluacion']);
  });

  it('cambia el paciente del panel al elegir otra tarjeta', async () => {
    await render();

    tarjetas()[1].click();
    fixture.detectChanges();

    expect(component.pacienteSeleccionado?.nombre).toBe('María López');
    // La emergencia no muestra destino: ni box en la tarjeta ni dato de cama en el detalle
    expect(fixture.nativeElement.textContent).not.toContain('Box');
    expect(elementos<HTMLElement>('.paciente-ubicacion').length).toBe(2);
    expect(elementos<HTMLElement>('.bloque-atencion .dato').length).toBe(3);
  });

  it('busca pacientes por el nombre escrito en el buscador', async () => {
    await render();

    const buscador = fixture.nativeElement.querySelector('.inputB') as HTMLInputElement;
    buscador.value = 'carlos';
    buscador.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    expect(tarjetas().length).toBe(1);
    expect(component.pacienteSeleccionado?.nombre).toBe('Carlos Méndez');
  });

  it('abre el episodio del paciente en la evaluación clínica', async () => {
    await render();

    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    component.abrirEpisodio();

    expect(episodioActivo.guardar).toHaveBeenCalledWith(101);
    expect(navegar).toHaveBeenCalledWith(['/medica', 'evaluacion']);
  });

  it('abre el expediente del paciente seleccionado', async () => {
    await render();

    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    component.abrirExpediente();

    expect(navegar).toHaveBeenCalledWith(['/expediente', 1]);
  });

  // La pantalla sigue la referencia de diseño: los pacientes se reparten en una matriz de tarjetas
  // cuadradas y el detalle del paciente se lee en bloques de color y columnas de datos.
  it('coloca las tarjetas en una matriz de tres columnas', async () => {
    await render();

    const lista = elemento<HTMLElement>('.pacientes-lista');
    expect(getComputedStyle(lista).display).toBe('grid');
    expect(getComputedStyle(lista).gridTemplateColumns).toBe('repeat(3, minmax(0, 1fr))');
    expect(getComputedStyle(lista).overflowY).toBe('auto');

    const dibujadas = tarjetas();
    expect(dibujadas.length).toBe(4);
    dibujadas.forEach((tarjeta) => expect(tarjeta.parentElement).toBe(lista));

    expect(regla('.pacientes-lista[')).toContain(
      'grid-template-columns:repeat(3,minmax(0,1fr))',
    );
    expect(regla('.paciente-card[')).toContain('border-left:7pxsolidvar(--acento-card)');
  });

  it('acentúa la tarjeta según el tipo de atención y el estado del paciente', async () => {
    await render();

    const dibujadas = tarjetas();

    // El primer paciente queda seleccionado por defecto y conserva el acento de la hospitalización
    expect(dibujadas[0].classList.contains('paciente-card--activa')).toBe(true);
    expect(dibujadas[0].getAttribute('aria-pressed')).toBe('true');

    // La emergencia y la atención pendiente se distinguen por el acento de la tarjeta
    expect(dibujadas[1].classList.contains('paciente-card--emergencia')).toBe(true);
    expect(regla('.paciente-card--emergencia')).toContain('--acento-card:#ef4444');
    expect(regla('.paciente-tipo[')).toContain('color:var(--acento-card)');
    expect(dibujadas[2].classList.contains('paciente-card--pendiente')).toBe(true);
    expect(regla('.paciente-card--pendiente')).toContain('--acento-card:#f59e0b');

    // El estado no se repite con una etiqueta: en la tarjeta lo dice el acento del borde
    expect(elementos<HTMLElement>('.atencion-estado').length).toBe(0);
  });

  it('muestra en cada tarjeta el nombre, sus datos y el destino', async () => {
    await render();

    const tarjeta = tarjetas()[0];
    expect(tarjeta.querySelector('.paciente-nombre')?.textContent).toContain('Juan Pérez');
    expect(tarjeta.querySelector('.paciente-meta')?.textContent).toContain(
      'EXP-001|45 años|Masculino',
    );
    expect(tarjeta.querySelector('.paciente-tipo')?.textContent).toContain('Hospitalización');
    expect(tarjeta.querySelector('.paciente-ubicacion')?.textContent).toContain('Cama A-105');

    // El resumen del listado no trae diagnóstico: no se inventa en la tarjeta
    expect(tarjeta.querySelector('.paciente-diagnostico')).toBeNull();
  });

  it('muestra la cama solo en las atenciones con hospitalización', async () => {
    await render();

    const dibujadas = tarjetas();

    // Hospitalización: la cama acompaña al tipo de atención
    expect(dibujadas[0].querySelector('.paciente-ubicacion')?.textContent).toContain('Cama A-105');

    // Emergencia: ni box en la tarjeta ni dato de cama en el detalle
    expect(dibujadas[1].querySelector('.paciente-ubicacion')).toBeNull();
    expect(elementos<HTMLElement>('.bloque-atencion .dato').length).toBe(4);

    dibujadas[1].click();
    fixture.detectChanges();

    expect(elementos<HTMLElement>('.bloque-atencion .dato').length).toBe(3);
    expect(elemento<HTMLElement>('.bloque-atencion').textContent).not.toContain('Cama');
    expect(elementos<HTMLElement>('.paciente-ubicacion').length).toBe(2);
  });

  it('distingue el filtro activo con el azul secundario y deja el resto neutro', async () => {
    await render();

    // El filtro activo va relleno con el azul secundario del módulo
    const activo = regla('.chip.activo');
    expect(activo).toContain('background:var(--azulSecundario)');
    expect(activo).toContain('color:#fff');

    // El resto de filtros se dibuja como una píldora neutra
    const base = regla('.chip[');
    expect(base).toContain('border:1pxsolid#e2e8f0');
    expect(base).toContain('color:#334155');
  });

  it('presenta el detalle con la estructura del módulo de pacientes', async () => {
    await render();

    const identidad = elemento<HTMLElement>('.panel-seleccionado .paciente');
    expect(identidad.querySelector('h2')?.textContent).toContain('Juan Pérez');
    expect(identidad.querySelector('.paciente-meta')?.textContent).toContain(
      'EXP-001|45 años|Masculino',
    );
    expect(identidad.querySelector('.estado')?.textContent).toContain('Activo');

    expect(elementos<HTMLElement>('.bloques-paralelos').length).toBe(2);
    expect(elementos<HTMLElement>('.bloque--responsable').length).toBe(2);
    expect(elemento<HTMLElement>('.motivo-visita')?.textContent).toContain('Gastroenteritis aguda');
    expect(elemento<HTMLElement>('.bloque-alergias')?.textContent).toContain('Penicilina');
    expect(elemento<HTMLElement>('.bloque-enfermedades')?.textContent).toContain('Diabetes');
    expect(elemento<HTMLElement>('.signos-datos')?.textContent).toContain('120/80');
  });

  it('deja las acciones del paciente alineadas a la derecha', async () => {
    await render();

    const acciones = elemento<HTMLElement>('.acciones');
    expect(acciones).not.toBeNull();
    expect(acciones.textContent).toContain('Abrir expediente');
    expect(acciones.textContent).toContain('Abrir episodio actual');
  });

  it('avisa del fallo y ofrece reintentar sin dejar la pantalla vacía', async () => {
    const registrado = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const fallo = new Subject<PacienteResumido[]>();
    servicio.listarPacientes.mockReturnValue(fallo.asObservable());

    fixture.detectChanges();
    fallo.error(new Error('fallo del servidor'));
    fixture.detectChanges();

    const pantalla: string = fixture.nativeElement.textContent;
    expect(component.errorCarga).toBe(true);
    expect(component.cargando).toBe(false);
    expect(pantalla).toContain('No se pudieron cargar los pacientes');
    expect(fixture.nativeElement.querySelector('.lista-aviso--error .btn')).not.toBeNull();
    expect(registrado).toHaveBeenCalled();
  });
});
