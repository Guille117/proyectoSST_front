import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError, TimeoutError } from 'rxjs';

import { Evaluacion } from './evaluacion';
import { EPISODIO_ID_TEMPORAL } from './data/constantes-clinicas';
import { ExamenFisicoService } from './data/examen-fisico-service';
import { ExamenFisicoResponse, ParteCuerpoResponse } from './data/examenFisicoInterfaz';
import { HistoriaClinicaService } from './data/historia-clinica-service';
import { AuthService } from '../../Auth/data/auth-service';
import { PopUps } from '../../../shared/popUps/popUpsService';

describe('Evaluacion', () => {
  let component: Evaluacion;
  let fixture: ComponentFixture<Evaluacion>;

  // La pantalla consulta el backend al montarse: se simulan sus dependencias.
  const examenFisicoService = {
    getPartesCuerpo: vi.fn(),
    getExamenesPorEpisodio: vi.fn(),
    postExamen: vi.fn(),
    putExamen: vi.fn(),
    cambiarEstado: vi.fn(),
  };
  const historiaClinicaService = { getHistoriasPorEpisodio: vi.fn() };
  const authService = { currentUser: vi.fn() };
  const popUps = {
    exito: vi.fn(),
    error: vi.fn(),
    errorDesdeBackend: vi.fn(),
    confirmarToast: vi.fn(),
  };

  const partesCuerpo: ParteCuerpoResponse[] = [
    { id: 3, nombre: 'Tórax', estado: true },
    { id: 4, nombre: 'Abdomen', estado: true },
  ];

  const examen = (
    id: number,
    parteCuerpoId: number,
    parteCuerpoNombre: string,
    descripcion: string,
  ): ExamenFisicoResponse => ({
    id,
    descripcion,
    episodioId: EPISODIO_ID_TEMPORAL,
    parteCuerpoId,
    parteCuerpoNombre,
    usuarioId: 2,
    usuarioNombre: 'Carlos Mendez',
    fecha: '2026-10-16T10:15:00',
    estado: true,
  });

  beforeEach(async () => {
    vi.resetAllMocks();
    examenFisicoService.getPartesCuerpo.mockReturnValue(of(partesCuerpo));
    examenFisicoService.getExamenesPorEpisodio.mockReturnValue(of([]));
    examenFisicoService.postExamen.mockReturnValue(
      of(examen(20, 3, 'Tórax', 'Ruidos cardiacos normales')),
    );
    examenFisicoService.putExamen.mockReturnValue(
      of(examen(21, 3, 'Tórax', 'Dolor a la palpación')),
    );
    examenFisicoService.cambiarEstado.mockReturnValue(
      of(examen(21, 3, 'Tórax', 'Ruidos cardiacos normales')),
    );
    popUps.confirmarToast.mockResolvedValue(true);
    historiaClinicaService.getHistoriasPorEpisodio.mockReturnValue(of([]));
    authService.currentUser.mockReturnValue({ id: 2 });

    await TestBed.configureTestingModule({
      imports: [Evaluacion],
      providers: [
        { provide: ExamenFisicoService, useValue: examenFisicoService },
        { provide: HistoriaClinicaService, useValue: historiaClinicaService },
        { provide: AuthService, useValue: authService },
        { provide: PopUps, useValue: popUps },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Evaluacion);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  const elementos = <T extends Element>(selector: string): NodeListOf<T> =>
    fixture.nativeElement.querySelectorAll(selector);

  const elemento = <T extends Element>(selector: string): T =>
    fixture.nativeElement.querySelector(selector);

  // Selectores semánticos: los botones usan las clases globales de src/styles/botonesStyle.scss, las
  // tarjetas del panel de secciones las de src/styles/tarjetaStyle.scss y la parte del cuerpo del
  // examen físico se elige en el selector .parte-cuerpo-select
  const selectParte = (): HTMLSelectElement => elemento<HTMLSelectElement>('.parte-cuerpo-select');

  /** Elige una opción del selector de partes del cuerpo como lo haría el usuario. */
  const elegirParte = async (indice: number): Promise<void> => {
    const select = selectParte();
    select.selectedIndex = indice;
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
  };

  const campoHallazgo = (): HTMLTextAreaElement => elemento<HTMLTextAreaElement>('.hallazgo-campo');

  const botonCancelar = (): HTMLButtonElement =>
    elemento<HTMLButtonElement>('.hallazgo-acciones ._cancelar');

  /** El formulario ya no lleva botón "Editar": la edición se dispara desde el menú de la tarjeta. */
  const botonEditarInline = (): HTMLButtonElement | null =>
    elemento<HTMLButtonElement>('.hallazgo-acciones ._editar');

  const botonGuardar = (): HTMLButtonElement =>
    elemento<HTMLButtonElement>('.hallazgo-acciones ._guardar');

  /** Tarjetas de hallazgos registrados, sin contar el esqueleto de carga. */
  const tarjetasHallazgo = (): HTMLElement[] =>
    Array.from(elementos<HTMLElement>('.hallazgo-card:not(.hallazgo-card--cargando)'));

  const botonMenuHallazgo = (indice = 0): HTMLButtonElement =>
    tarjetasHallazgo()[indice].querySelector<HTMLButtonElement>('.hallazgo-menu-trigger')!;

  const menuHallazgo = (indice = 0): HTMLElement | null =>
    tarjetasHallazgo()[indice].querySelector<HTMLElement>('.hallazgo-menu');

  const botonEditarHallazgo = (indice = 0): HTMLButtonElement | null =>
    tarjetasHallazgo()[indice].querySelector<HTMLButtonElement>('.hallazgo-menu .iconEditar');

  const botonEliminarHallazgo = (indice = 0): HTMLButtonElement | null =>
    tarjetasHallazgo()[indice].querySelector<HTMLButtonElement>('.hallazgo-menu .iconQuitar');

  /** Abre el menú de opciones de la tarjeta indicada. */
  const abrirMenuHallazgo = async (indice = 0): Promise<void> => {
    botonMenuHallazgo(indice).click();
    await fixture.whenStable();
  };

  /** Carga en el formulario la tarjeta indicada desde el menú de opciones. */
  const pulsarEditarHallazgo = async (indice = 0): Promise<void> => {
    const boton = botonEditarHallazgo(indice);
    if (!boton) throw new Error('La opción "Editar" del menú de la tarjeta no está disponible');
    boton.click();
    await fixture.whenStable();
  };

  /** Remonta la pantalla después de cambiar los datos simulados: la carga arranca al crearla. */
  const remontar = async (): Promise<void> => {
    fixture.destroy();

    fixture = TestBed.createComponent(Evaluacion);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  };

  const escribir = async (texto: string): Promise<void> => {
    campoHallazgo().value = texto;
    campoHallazgo().dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(examenFisicoService.getPartesCuerpo).toHaveBeenCalledExactlyOnceWith(true);
    expect(examenFisicoService.getExamenesPorEpisodio).toHaveBeenCalledExactlyOnceWith(
      EPISODIO_ID_TEMPORAL,
      true,
    );
  });

  it('ubica las acciones del hallazgo en la fila compartida y con los estilos globales', () => {
    const acciones = elemento<HTMLElement>('.hallazgo-acciones');

    expect(acciones.classList.contains('acciones-formulario')).toBe(true);
    expect(botonGuardar().classList.contains('_guardar')).toBe(true);
    expect(botonCancelar().classList.contains('_cancelar')).toBe(true);
  });

  it('muestra las tres secciones con la de examen físico activa', () => {
    const secciones = elementos<HTMLButtonElement>('.tarjeta');

    expect(secciones.length).toBe(3);
    expect(elementos<HTMLElement>('.tarjeta .tarjeta_icono i').length).toBe(3);
    expect(elemento<HTMLButtonElement>('.tarjeta--activa').textContent).toContain('Examen físico');
  });

  it('asigna a cada sección un icono acorde', () => {
    const iconos = elementos<HTMLElement>('.tarjeta .tarjeta_icono i');

    expect(iconos.length).toBe(3);
    expect(iconos[0].classList.contains('bi-journal-medical')).toBe(true);
    expect(iconos[1].classList.contains('bi-heart-pulse')).toBe(true);
    expect(iconos[2].classList.contains('bi-clipboard2-check')).toBe(true);
  });

  it('cambia de sección al pulsarla', async () => {
    elementos<HTMLButtonElement>('.tarjeta')[0].click();
    await fixture.whenStable();

    expect(component.seccionActiva).toBe('historia-clinica');
    expect(elemento<HTMLButtonElement>('.tarjeta--activa').textContent).toContain(
      'Historia clínica',
    );
    expect(elemento<HTMLButtonElement>('.tarjeta--activa').getAttribute('aria-pressed')).toBe(
      'true',
    );
  });

  it('muestra el panel de la sección activa en el área central', async () => {
    // La pantalla abre en el examen físico
    expect(elemento('.hallazgo-form')).not.toBeNull();
    expect(elemento('app-historia-clinica')).toBeNull();
    expect(elemento('app-diagnostico')).toBeNull();

    elementos<HTMLButtonElement>('.tarjeta')[0].click();
    await fixture.whenStable();

    expect(elemento('app-historia-clinica .historia-campo')).not.toBeNull();
    expect(elemento('.hallazgo-form')).toBeNull();

    elementos<HTMLButtonElement>('.tarjeta')[2].click();
    await fixture.whenStable();

    expect(elemento('app-diagnostico .diagnostico-form')).not.toBeNull();
    expect(elemento('app-historia-clinica')).toBeNull();

    elementos<HTMLButtonElement>('.tarjeta')[1].click();
    await fixture.whenStable();

    expect(elemento('.hallazgo-form')).not.toBeNull();
    expect(elemento('app-diagnostico')).toBeNull();
  });

  it('mantiene las secciones y los hallazgos fuera del panel que cambia', async () => {
    // El carril de secciones no vive dentro del área central que cambia de contenido
    expect(elementos<HTMLElement>('.panel-secciones .tarjeta').length).toBe(3);
    expect(elemento<HTMLElement>('.panel-hallazgos')?.closest('.panel-seccion')).toBeNull();

    elementos<HTMLButtonElement>('.tarjeta')[0].click();
    await fixture.whenStable();

    expect(elementos<HTMLElement>('.panel-secciones .tarjeta').length).toBe(3);
    expect(elemento('app-historia-clinica')?.closest('.panel-secciones')).toBeNull();
  });

  it('oculta los hallazgos registrados fuera del examen físico', async () => {
    // El examen físico es la única sección que registra hallazgos
    expect(component.mostrarHallazgos).toBe(true);
    expect(elemento<HTMLElement>('.panel-hallazgos')).not.toBeNull();

    elementos<HTMLButtonElement>('.tarjeta')[0].click();
    await fixture.whenStable();

    expect(component.mostrarHallazgos).toBe(false);
    expect(elemento('.panel-hallazgos')).toBeNull();
    expect(elemento('.hallazgo-card')).toBeNull();
    expect(elemento('.hallazgos-vacio')).toBeNull();
    expect(
      elemento<HTMLElement>('.evaluacion').classList.contains('evaluacion--sin-hallazgos'),
    ).toBe(true);

    elementos<HTMLButtonElement>('.tarjeta')[2].click();
    await fixture.whenStable();

    expect(elemento('.panel-hallazgos')).toBeNull();
    expect(elemento('.hallazgo-card--cargando')).toBeNull();

    elementos<HTMLButtonElement>('.tarjeta')[1].click();
    await fixture.whenStable();

    expect(elemento<HTMLElement>('.panel-hallazgos')).not.toBeNull();
    expect(
      elemento<HTMLElement>('.evaluacion').classList.contains('evaluacion--sin-hallazgos'),
    ).toBe(false);
  });

  it('muestra el bloque de datos del paciente en historia clínica y diagnóstico', async () => {
    const bloque = (): HTMLElement => elemento<HTMLElement>('app-datos-paciente');

    // El examen físico usa la ficha plegable: el bloque compartido arranca cerrado y con su pestaña
    expect(bloque().querySelector('.ficha-pestana')).not.toBeNull();
    expect(bloque().querySelector('.ficha')).toBeNull();

    elementos<HTMLButtonElement>('.tarjeta')[0].click();
    await fixture.whenStable();

    // Historia clínica y diagnóstico muestran siempre los datos: el bloque se dibuja desplegado y
    // sin pestaña, porque no hay nada que abrir
    expect(bloque().querySelector('.ficha')).not.toBeNull();
    expect(bloque().querySelector('.ficha-pestana')).toBeNull();
    expect(component.seccionConDatosPaciente).toBe(true);
    expect(component.pacienteAbierto).toBe(false);
    expect(
      elemento<HTMLElement>('.evaluacion').classList.contains('evaluacion--datos-paciente'),
    ).toBe(true);

    elementos<HTMLButtonElement>('.tarjeta')[2].click();
    await fixture.whenStable();

    expect(bloque().querySelector('.ficha')).not.toBeNull();
  });

  it('vuelve a la ficha plegable al regresar al examen físico', async () => {
    elementos<HTMLButtonElement>('.tarjeta')[2].click();
    await fixture.whenStable();

    elementos<HTMLButtonElement>('.tarjeta')[1].click();
    await fixture.whenStable();

    // Vuelve la ficha plegable: el bloque se cierra y reaparece su pestaña lateral
    expect(elemento<HTMLElement>('app-datos-paciente .ficha')).toBeNull();
    expect(elemento('.ficha-pestana')).not.toBeNull();
    expect(
      elemento<HTMLElement>('.evaluacion').classList.contains('evaluacion--datos-paciente'),
    ).toBe(false);
  });

  it('lista las partes del cuerpo del catálogo y selecciona la primera', () => {
    const opciones = Array.from(selectParte().options);

    expect(opciones.length).toBe(2);
    expect(opciones[0].textContent?.trim()).toBe('Tórax');
    expect(opciones[1].textContent?.trim()).toBe('Abdomen');
    expect(selectParte().selectedIndex).toBe(0);
    expect(component.parteSeleccionadaId).toBe(3);
  });

  it('avisa y deja la captura sin guardar cuando el catálogo de partes del cuerpo llega vacío', async () => {
    examenFisicoService.getPartesCuerpo.mockReturnValue(of([]));
    await remontar();

    expect(component.partesCuerpo.length).toBe(0);
    expect(component.parteSeleccionadaId).toBeNull();
    expect(selectParte().options.length).toBe(1);
    expect(selectParte().options[0].textContent?.trim()).toBe('Sin partes del cuerpo disponibles');
    expect(botonGuardar().disabled).toBe(true);
    expect(elemento<HTMLElement>('.examen-ayuda').textContent).toContain(
      'No hay partes del cuerpo disponibles',
    );
  });

  it('arranca con el formulario vacío, sin botón Editar y con Guardar deshabilitado', () => {
    expect(component.modoEdicion).toBe(false);
    expect(component.hallazgoActual).toBe('');
    expect(campoHallazgo().readOnly).toBe(false);
    expect(botonEditarInline()).toBeNull();
    expect(botonGuardar().disabled).toBe(true);
  });

  it('no precarga el hallazgo registrado: este se corrige desde la tarjeta', async () => {
    examenFisicoService.getExamenesPorEpisodio.mockReturnValue(
      of([examen(21, 3, 'Tórax', 'Ruidos cardiacos normales')]),
    );
    await remontar();

    // El registro aparece en la lista, pero el formulario sigue vacío
    expect(tarjetasHallazgo().length).toBe(1);
    expect(component.hallazgoActual).toBe('');
    expect(component.modoEdicion).toBe(false);
    expect(campoHallazgo().readOnly).toBe(false);
    expect(botonGuardar().disabled).toBe(true);
  });

  it('cambia de parte del cuerpo manteniendo el formulario vacío', async () => {
    examenFisicoService.getExamenesPorEpisodio.mockReturnValue(
      of([examen(21, 4, 'Abdomen', 'Inspección abdominal')]),
    );
    await remontar();

    expect(component.parteSeleccionadaId).toBe(3);
    expect(component.hallazgoActual).toBe('');

    await elegirParte(1);

    expect(component.parteSeleccionadaId).toBe(4);
    expect(selectParte().selectedIndex).toBe(1);
    expect(component.modoEdicion).toBe(false);
    expect(component.hallazgoActual).toBe('');
  });

  it('crea el hallazgo del episodio cuando la parte no tenía ninguno', async () => {
    await escribir('Ruidos cardiacos normales');

    botonGuardar().click();
    await fixture.whenStable();

    expect(examenFisicoService.postExamen).toHaveBeenCalledExactlyOnceWith({
      descripcion: 'Ruidos cardiacos normales',
      episodioId: EPISODIO_ID_TEMPORAL,
      parteCuerpoId: 3,
      usuarioId: 2,
    });
    expect(examenFisicoService.putExamen).not.toHaveBeenCalled();
    expect(component.modoEdicion).toBe(false);
    expect(component.hallazgos.length).toBe(1);
    expect(elemento<HTMLElement>('.hallazgo-card').textContent).toContain(
      'Ruidos cardiacos normales',
    );
    expect(popUps.exito).toHaveBeenCalled();
  });

  it('actualiza el hallazgo cargado desde la tarjeta cuando se edita', async () => {
    examenFisicoService.getExamenesPorEpisodio.mockReturnValue(
      of([examen(21, 3, 'Tórax', 'Ruidos cardiacos normales')]),
    );
    await remontar();
    await abrirMenuHallazgo();
    await pulsarEditarHallazgo();

    expect(component.modoEdicion).toBe(true);
    expect(component.hallazgoActual).toBe('Ruidos cardiacos normales');
    // Guardar sigue bloqueado hasta que haya un cambio real
    expect(botonGuardar().disabled).toBe(true);

    await escribir('Dolor a la palpación');
    expect(botonGuardar().disabled).toBe(false);

    botonGuardar().click();
    await fixture.whenStable();

    expect(popUps.confirmarToast).toHaveBeenCalled();
    expect(examenFisicoService.putExamen).toHaveBeenCalledExactlyOnceWith(21, {
      descripcion: 'Dolor a la palpación',
      episodioId: EPISODIO_ID_TEMPORAL,
      parteCuerpoId: 3,
      usuarioId: 2,
    });
    expect(examenFisicoService.postExamen).not.toHaveBeenCalled();
    expect(component.hallazgos.length).toBe(1);
    expect(component.hallazgoActual).toBe('');
    expect(component.modoEdicion).toBe(false);
    expect(popUps.exito).toHaveBeenCalled();
  });

  it('no actualiza el hallazgo si se cancela la confirmación del cambio', async () => {
    examenFisicoService.getExamenesPorEpisodio.mockReturnValue(
      of([examen(21, 3, 'Tórax', 'Ruidos cardiacos normales')]),
    );
    await remontar();
    await abrirMenuHallazgo();
    await pulsarEditarHallazgo();
    await escribir('Dolor a la palpación');
    popUps.confirmarToast.mockResolvedValue(false);

    botonGuardar().click();
    await fixture.whenStable();

    expect(popUps.confirmarToast).toHaveBeenCalled();
    expect(examenFisicoService.putExamen).not.toHaveBeenCalled();
    expect(component.hallazgoActual).toBe('Dolor a la palpación');
  });

  it('permite cambiar la parte del cuerpo al editar y guarda la parte elegida', async () => {
    examenFisicoService.getExamenesPorEpisodio.mockReturnValue(
      of([examen(21, 3, 'Tórax', 'Ruidos cardiacos normales')]),
    );
    await remontar();
    await abrirMenuHallazgo();
    await pulsarEditarHallazgo();

    // El selector sigue habilitado durante la edición
    expect(selectParte().disabled).toBe(false);

    await elegirParte(1);
    expect(component.parteSeleccionadaId).toBe(4);
    expect(botonGuardar().disabled).toBe(false);

    botonGuardar().click();
    await fixture.whenStable();

    expect(examenFisicoService.putExamen).toHaveBeenCalledExactlyOnceWith(21, {
      descripcion: 'Ruidos cardiacos normales',
      episodioId: EPISODIO_ID_TEMPORAL,
      parteCuerpoId: 4,
      usuarioId: 2,
    });
  });

  it('mantiene Guardar deshabilitado mientras la descripción está vacía', async () => {
    await escribir('   ');

    expect(botonGuardar().disabled).toBe(true);

    botonGuardar().click();
    await fixture.whenStable();

    expect(examenFisicoService.postExamen).not.toHaveBeenCalled();
    expect(examenFisicoService.putExamen).not.toHaveBeenCalled();
  });

  it('avisa cuando no se puede identificar al usuario de la sesión', async () => {
    authService.currentUser.mockReturnValue(null);

    await escribir('Ruidos cardiacos normales');
    botonGuardar().click();
    await fixture.whenStable();

    expect(examenFisicoService.postExamen).not.toHaveBeenCalled();
    expect(popUps.error).toHaveBeenCalled();
  });

  it('conserva lo escrito cuando el guardado falla', async () => {
    examenFisicoService.postExamen.mockReturnValue(throwError(() => new Error('fallo')));

    await escribir('Ruidos cardiacos normales');
    botonGuardar().click();
    await fixture.whenStable();

    expect(component.hallazgoActual).toBe('Ruidos cardiacos normales');
    expect(campoHallazgo().readOnly).toBe(false);
    expect(popUps.errorDesdeBackend).toHaveBeenCalled();
    expect(popUps.exito).not.toHaveBeenCalled();
  });

  it('informa de forma específica cuando el servidor no responde a tiempo', async () => {
    examenFisicoService.postExamen.mockReturnValue(throwError(() => new TimeoutError()));

    await escribir('Ruidos cardiacos normales');
    botonGuardar().click();
    await fixture.whenStable();

    expect(popUps.error).toHaveBeenCalledWith(
      'Error de comunicación. El servidor no respondió dentro del tiempo esperado.',
    );
    expect(popUps.errorDesdeBackend).not.toHaveBeenCalled();
  });

  it('cancelar descarta la captura en curso sin tocar los hallazgos registrados', async () => {
    examenFisicoService.getExamenesPorEpisodio.mockReturnValue(
      of([examen(21, 4, 'Abdomen', 'Inspección abdominal')]),
    );
    await remontar();
    await escribir('Texto sin guardar');

    botonCancelar().click();
    await fixture.whenStable();

    expect(component.hallazgoActual).toBe('');
    expect(component.hallazgos.length).toBe(1);
  });

  it('refleja el contador de caracteres y el límite de la captura', () => {
    const texto = 'Abdomen sin dolor a la palpación.';
    component.hallazgoActual = texto;
    fixture.detectChanges();

    expect(elemento<HTMLElement>('.contador-caracteres').textContent?.trim()).toBe(
      `${texto.length}/2000`,
    );
    expect(campoHallazgo().getAttribute('maxlength')).toBe('2000');
  });

  it('bloquea las acciones mientras hay una consulta en curso', async () => {
    component.cargando = true;
    fixture.detectChanges();
    // El campo deshabilitado de un control con ngModel lo aplica Angular en el siguiente microtask
    // ([disabled] es el input isDisabled de NgModel, que delega el estado al control del formulario)
    await fixture.whenStable();

    expect(selectParte().disabled).toBe(true);
    expect(botonCancelar().disabled).toBe(true);
    expect(botonGuardar().disabled).toBe(true);
    expect(elemento<HTMLElement>('.hallazgo-card--cargando')).not.toBeNull();
  });

  it('mantiene la lectura sin hallazgos cuando falla la carga inicial', async () => {
    examenFisicoService.getExamenesPorEpisodio.mockReturnValue(
      throwError(() => new Error('fallo')),
    );
    await remontar();

    expect(component.modoEdicion).toBe(false);
    expect(component.hallazgos.length).toBe(0);
    expect(popUps.errorDesdeBackend).toHaveBeenCalled();
  });

  it('muestra los hallazgos registrados del episodio en la lista', async () => {
    examenFisicoService.getExamenesPorEpisodio.mockReturnValue(
      of([examen(21, 3, 'Tórax', 'Inspección general')]),
    );
    await remontar();

    const registrados = elementos<HTMLElement>('.hallazgo-card:not(.hallazgo-card--cargando)');

    expect(registrados.length).toBe(1);
    expect(registrados[0].textContent).toContain('Tórax');
    expect(registrados[0].textContent).toContain('Carlos Mendez');
    expect(registrados[0].textContent).toContain('16-10-2026');
    expect(registrados[0].textContent).toContain('10:15 AM');
    expect(elementos<HTMLElement>('.hallazgo-card--cargando').length).toBe(0);
    expect(elemento<HTMLElement>('.hallazgos-vacio')).toBeNull();
  });

  it('muestra el esqueleto de carga mientras se consultan los hallazgos', () => {
    component.cargando = true;
    fixture.detectChanges();

    expect(elemento<HTMLElement>('.hallazgo-card--cargando')).not.toBeNull();
    expect(elementos<HTMLElement>('.hallazgo-card:not(.hallazgo-card--cargando)').length).toBe(0);
    expect(elemento<HTMLElement>('.hallazgos-vacio')).toBeNull();
  });

  it('muestra el estado vacío cuando el paciente aún no tiene hallazgos', () => {
    expect(elemento<HTMLElement>('.hallazgo-card')).toBeNull();
    expect(elemento<HTMLElement>('.hallazgos-vacio')).not.toBeNull();
  });

  // Menú de opciones de la tarjeta de hallazgo: editar y eliminar
  it('despliega el menú de la tarjeta con las opciones Editar y Eliminar', async () => {
    examenFisicoService.getExamenesPorEpisodio.mockReturnValue(
      of([examen(21, 3, 'Tórax', 'Ruidos cardiacos normales')]),
    );
    await remontar();

    expect(menuHallazgo()).toBeNull();

    await abrirMenuHallazgo();

    expect(component.menuHallazgoAbierto).toBe(21);
    expect(botonMenuHallazgo().getAttribute('aria-expanded')).toBe('true');
    expect(menuHallazgo()?.textContent).toContain('Editar');
    expect(menuHallazgo()?.textContent).toContain('Eliminar');
    expect(botonEditarHallazgo()).not.toBeNull();
    expect(botonEliminarHallazgo()).not.toBeNull();
  });

  it('cierra el menú al volver a pulsar el botón de tres puntos', async () => {
    examenFisicoService.getExamenesPorEpisodio.mockReturnValue(
      of([examen(21, 3, 'Tórax', 'Ruidos cardiacos normales')]),
    );
    await remontar();
    await abrirMenuHallazgo();

    await abrirMenuHallazgo();

    expect(component.menuHallazgoAbierto).toBeNull();
    expect(menuHallazgo()).toBeNull();
  });

  it('cierra el menú al pulsar fuera de la tarjeta', async () => {
    examenFisicoService.getExamenesPorEpisodio.mockReturnValue(
      of([examen(21, 3, 'Tórax', 'Ruidos cardiacos normales')]),
    );
    await remontar();
    await abrirMenuHallazgo();
    expect(menuHallazgo()).not.toBeNull();

    elemento<HTMLElement>('.examen-titulo').click();
    await fixture.whenStable();

    expect(component.menuHallazgoAbierto).toBeNull();
    expect(menuHallazgo()).toBeNull();
  });

  it('elimina el hallazgo tras confirmar en el popup', async () => {
    examenFisicoService.getExamenesPorEpisodio.mockReturnValue(
      of([
        examen(21, 3, 'Tórax', 'Ruidos cardiacos normales'),
        examen(22, 4, 'Abdomen', 'Inspección abdominal'),
      ]),
    );
    await remontar();
    await abrirMenuHallazgo();

    botonEliminarHallazgo()!.click();
    await fixture.whenStable();

    expect(popUps.confirmarToast).toHaveBeenCalled();
    expect(examenFisicoService.cambiarEstado).toHaveBeenCalledExactlyOnceWith(21);
    expect(component.hallazgos.length).toBe(1);
    expect(tarjetasHallazgo().length).toBe(1);
    expect(popUps.exito).toHaveBeenCalled();
  });

  it('no elimina el hallazgo si se cancela la confirmación', async () => {
    popUps.confirmarToast.mockResolvedValue(false);
    examenFisicoService.getExamenesPorEpisodio.mockReturnValue(
      of([examen(21, 3, 'Tórax', 'Ruidos cardiacos normales')]),
    );
    await remontar();
    await abrirMenuHallazgo();

    botonEliminarHallazgo()!.click();
    await fixture.whenStable();

    expect(examenFisicoService.cambiarEstado).not.toHaveBeenCalled();
    expect(component.hallazgos.length).toBe(1);
  });

  // Ficha del paciente y secciones colapsadas: datos y comportamiento simulados (fase de diseño)
  const botonPestanaPaciente = (): HTMLButtonElement =>
    elemento<HTMLButtonElement>('.ficha-pestana');

  const botonPlegarFicha = (): HTMLButtonElement => elemento<HTMLButtonElement>('.ficha-plegar');

  const ficha = (): HTMLElement | null => fixture.nativeElement.querySelector('.ficha');

  it('abre la ficha del paciente con la pestaña lateral', async () => {
    expect(component.pacienteAbierto).toBe(false);
    expect(ficha()).toBeNull();
    expect(botonPestanaPaciente().getAttribute('aria-expanded')).toBe('false');

    botonPestanaPaciente().click();
    await fixture.whenStable();

    expect(component.pacienteAbierto).toBe(true);
    expect(botonPestanaPaciente().getAttribute('aria-expanded')).toBe('true');

    const fichaAbierta = elemento<HTMLElement>('.ficha');
    expect(elemento<HTMLElement>('.ficha-titulo').textContent?.trim()).toBe(
      'Información del paciente',
    );
    expect(fichaAbierta.textContent).toContain('EXP-0241');
    expect(fichaAbierta.textContent).toContain('Juan Pérez');
    expect(fichaAbierta.textContent).toContain('Hospitalización');
    expect(fichaAbierta.textContent).toContain('10-10-2026');
    expect(fichaAbierta.textContent).toContain('A-105');
    expect(fichaAbierta.textContent).toContain('Dolor abdominal y vómitos');
    expect(fichaAbierta.textContent).toContain('Ninguna conocida');
    // El bloque no lleva botón de cierre: se cierra con la pestaña lateral y solo conserva el
    // control que pliega su cuerpo.
    expect(elementos<HTMLElement>('.ficha button').length).toBe(1);
  });

  it('muestra la atención vigente y los últimos signos vitales', async () => {
    botonPestanaPaciente().click();
    await fixture.whenStable();

    const atencion = elementos<HTMLElement>('.ficha-atencion_dato');
    expect(atencion.length).toBe(3);
    expect(atencion[0].textContent).toContain('Tipo de atención');
    expect(atencion[0].textContent).toContain('Hospitalización');
    expect(atencion[1].textContent).toContain('Fecha de ingreso');
    expect(atencion[1].textContent).toContain('10-10-2026');
    expect(atencion[2].textContent).toContain('Cama');
    expect(atencion[2].textContent).toContain('A-105');

    const vitales = elementos<HTMLElement>('.ficha-vitales li');
    expect(Array.from(vitales).map((signo) => signo.textContent?.trim())).toEqual([
      'PA 120/80',
      'FC 82',
      'Temp 37.2 °C',
      'SpO2 97%',
    ]);
  });

  it('colapsa las secciones al abrir la ficha y las expande al cerrarla', async () => {
    botonPestanaPaciente().click();
    await fixture.whenStable();

    const secciones = elemento<HTMLElement>('.panel-secciones');
    expect(secciones.classList.contains('panel-secciones--rail')).toBe(true);
    // El colapso es solo visual: las tres secciones, sus iconos y sus textos siguen en el DOM
    expect(elementos<HTMLElement>('.panel-secciones .tarjeta').length).toBe(3);
    expect(elementos<HTMLElement>('.panel-secciones .tarjeta_icono i').length).toBe(3);
    expect(elementos<HTMLElement>('.panel-secciones .tarjeta_texto').length).toBe(3);
    expect(elemento<HTMLButtonElement>('.panel-secciones .tarjeta').getAttribute('title')).toBe(
      'Historia clínica',
    );
    expect(
      elemento<HTMLButtonElement>('.panel-secciones .tarjeta').getAttribute('aria-label'),
    ).toBe('Historia clínica');

    botonPestanaPaciente().click();
    await fixture.whenStable();

    expect(component.pacienteAbierto).toBe(false);
    expect(ficha()).toBeNull();
    expect(
      elemento<HTMLElement>('.panel-secciones').classList.contains('panel-secciones--rail'),
    ).toBe(false);
    expect(
      elemento<HTMLButtonElement>('.panel-secciones .tarjeta').getAttribute('title'),
    ).toBeNull();
    expect(
      elemento<HTMLButtonElement>('.panel-secciones .tarjeta').getAttribute('aria-label'),
    ).toBeNull();
  });

  it('marca el contenedor como ficha abierta para reservar el espacio del bloque de datos', async () => {
    const rejilla = (): HTMLElement => elemento<HTMLElement>('.evaluacion');

    expect(rejilla().classList.contains('evaluacion--ficha-abierta')).toBe(false);

    botonPestanaPaciente().click();
    await fixture.whenStable();

    expect(rejilla().classList.contains('evaluacion--ficha-abierta')).toBe(true);

    botonPestanaPaciente().click();
    await fixture.whenStable();

    expect(rejilla().classList.contains('evaluacion--ficha-abierta')).toBe(false);
  });

  it('delega la pestaña y el bloque de datos en el componente compartido', async () => {
    botonPestanaPaciente().click();
    await fixture.whenStable();

    // Ninguno de los dos depende de un carril intermedio ni vive dentro de un panel: el componente
    // compartido los dibuja pegados al borde derecho de la pantalla.
    expect(elemento<HTMLElement>('.carril')).toBeNull();
    expect(botonPestanaPaciente().closest('app-datos-paciente')).not.toBeNull();
    expect(ficha()?.closest('app-datos-paciente')).not.toBeNull();
    expect(botonPestanaPaciente().closest('.panel')).toBeNull();
  });

  it('pliega el cuerpo de la ficha sin ocultar el título', async () => {
    botonPestanaPaciente().click();
    await fixture.whenStable();

    const plegar = botonPlegarFicha();
    expect(plegar.getAttribute('aria-expanded')).toBe('true');
    expect(plegar.querySelector('i')?.classList.contains('bi-chevron-down')).toBe(true);
    expect(elemento<HTMLElement>('.ficha-cuerpo').classList.contains('ficha-cuerpo--plegado')).toBe(
      false,
    );

    plegar.click();
    await fixture.whenStable();

    expect(component.datosPacienteVisibles).toBe(false);
    expect(botonPlegarFicha().getAttribute('aria-expanded')).toBe('false');
    expect(botonPlegarFicha().querySelector('i')?.classList.contains('bi-chevron-up')).toBe(true);
    expect(ficha()).not.toBeNull();
    expect(elemento<HTMLElement>('.ficha-titulo').textContent?.trim()).toBe(
      'Información del paciente',
    );
    expect(elemento<HTMLElement>('.ficha-cuerpo').classList.contains('ficha-cuerpo--plegado')).toBe(
      true,
    );
  });

  it('reabre la ficha con los datos completos tras plegarla', async () => {
    botonPestanaPaciente().click();
    await fixture.whenStable();
    botonPlegarFicha().click();
    await fixture.whenStable();

    botonPestanaPaciente().click();
    await fixture.whenStable();
    botonPestanaPaciente().click();
    await fixture.whenStable();

    expect(component.datosPacienteVisibles).toBe(true);
    expect(elemento<HTMLElement>('.ficha-cuerpo').classList.contains('ficha-cuerpo--plegado')).toBe(
      false,
    );
    expect(elemento<HTMLElement>('.ficha-plegar').getAttribute('aria-expanded')).toBe('true');
  });
});
