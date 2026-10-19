import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';

import { Indicaciones } from './indicaciones';
import { IndicacionCuidados } from './cuidados/indicacion-cuidados';
import { IndicacionExamenService } from './examenes/data/examen-service';
import { ExamenResponse } from './examenes/data/examenInterfaz';
import { ModalService } from '../../../modal-principal/modal-service';
import { MedicamentoIndicacionService } from './medicamentos/data/medicamento-service';
import { MedicamentoIndicacionResponse } from './medicamentos/data/medicamentoInterfaz';
import { EpisodioActivoService } from '../data/episodio-activo-service';
import { AuthService } from '../../Auth/data/auth-service';
import { CatalogoService } from '../../Catalogos/data/serviceCatalogo';
import { PopUps } from '../../../shared/popUps/popUpsService';
import { IndicacionCuidadoService } from './cuidados/data/cuidado-service';
import {
  CuidadoRequest,
  CuidadoResponse,
  EstadoCuidadoApi,
} from './cuidados/data/cuidadoInterfaz';

describe('Indicaciones', () => {
  let component: Indicaciones;
  let fixture: ComponentFixture<Indicaciones>;
  const popUps = {
    confirmarToast: vi.fn(),
    advertencia: vi.fn(),
    exito: vi.fn(),
    error: vi.fn(),
    errorDesdeBackend: vi.fn(),
  };
  const medicamentoService = {
    getIndicacionesPorEpisodio: vi.fn(),
    buscarCatalogo: vi.fn(),
    postIndicacion: vi.fn(),
    putIndicacion: vi.fn(),
    cambiarEstado: vi.fn(),
    eliminarIndicacion: vi.fn(),
  };
  const authService = { currentUser: () => ({ id: 2 }) };
  const episodioActivo = {
    obtener: () => 1,
    guardar: vi.fn(),
    limpiar: vi.fn(),
    esSoloLectura: () => false,
  };
  const catalogoService = { listarUnidadMedida: vi.fn(() => of([])) };
  const examenService = {
    buscarPorEpisodio: vi.fn(),
    crearExamen: vi.fn(),
    actualizarExamen: vi.fn(),
    cambiarEstado: vi.fn(),
    eliminarArchivo: vi.fn(),
    obtenerArchivo: vi.fn(),
  };
  const modalService = { open: vi.fn(), close: vi.fn() };
  let cuidadosMock: CuidadoResponse[] = [];
  const cuidadoService = {
    buscarPorEpisodio: vi.fn(),
    crearCuidado: vi.fn(),
    actualizarCuidado: vi.fn(),
    eliminarCuidado: vi.fn(),
  };

  const cuidado = (
    id: number,
    nombreCuidado: string,
    estado: EstadoCuidadoApi,
    overrides: Partial<CuidadoResponse> = {},
  ): CuidadoResponse => ({
    id,
    nombreCuidado,
    frecuencia: 2,
    duracion: 5,
    tipoDuracion: 'DIAS',
    observacion: 'Alternar decúbito lateral y evitar apoyar la zona de la úlcera.',
    episodioId: 1,
    usuarioId: 2,
    usuarioNombre: 'Dr. Gómez',
    fecha: '2026-10-10T09:15:00',
    estado,
    ...overrides,
  });

  const reiniciarCuidados = (): void => {
    cuidadosMock = [
      cuidado(1, 'Cambio de posición', 'EN_PROCESO', { fecha: '2026-10-10T09:15:00' }),
      cuidado(2, 'Control de signos vitales', 'EN_PROCESO', {
        frecuencia: 4,
        duracion: 3,
        observacion: 'Registrar la saturación y la temperatura en cada control.',
        fecha: '2026-10-10T09:10:00',
      }),
      cuidado(3, 'Balance hídrico estricto', 'EN_PROCESO', {
        frecuencia: 24,
        duracion: 2,
        observacion: 'Medir la diuresis y anotar los ingresos de cada turno.',
        fecha: '2026-10-10T09:05:00',
      }),
      cuidado(4, 'Curación de herida', 'COMPLETADO', {
        frecuencia: 12,
        observacion: 'Lavar con solución fisiológica y cubrir con gasa estéril.',
        fecha: '2026-10-10T08:50:00',
      }),
      cuidado(5, 'Vigilancia de diuresis', 'ELIMINADO', {
        frecuencia: 8,
        duracion: null,
        tipoDuracion: 'TIEMPO_INDEFINIDO',
        observacion: 'Cuidado duplicado en la orden.',
        usuarioNombre: 'Dra. Herrera',
        fecha: '2026-10-09T16:40:00',
      }),
    ];

    cuidadoService.buscarPorEpisodio.mockImplementation(
      (_episodioId: number, estado: EstadoCuidadoApi) =>
        of(cuidadosMock.filter((registro) => registro.estado === estado)),
    );
    cuidadoService.crearCuidado.mockImplementation((request: CuidadoRequest) => {
      const nuevo: CuidadoResponse = {
        ...request,
        id: 6,
        usuarioNombre: 'Dr. Gómez',
        fecha: '2026-10-10T08:40:00',
        estado: 'EN_PROCESO',
      };
      cuidadosMock = [...cuidadosMock, nuevo];
      return of(nuevo);
    });
    cuidadoService.actualizarCuidado.mockImplementation(
      (id: number, request: CuidadoRequest) => {
        const actualizado: CuidadoResponse = {
          ...cuidadosMock.find((registro) => registro.id === id)!,
          ...request,
          id,
        };
        cuidadosMock = cuidadosMock.map((registro) =>
          registro.id === id ? actualizado : registro,
        );
        return of(actualizado);
      },
    );
    cuidadoService.eliminarCuidado.mockImplementation((id: number) => {
      cuidadosMock = cuidadosMock.map((registro) =>
        registro.id === id ? { ...registro, estado: 'ELIMINADO' as const } : registro,
      );
      return of(void 0);
    });
  };

  const examen = (id: number, nombreExamen: string): ExamenResponse => ({
    id,
    nombreExamen,
    observacion: null,
    archivos: [],
    episodioId: 1,
    usuarioId: 2,
    usuarioNombre: 'Carlos Méndez',
    fecha: '2026-10-16T11:00:00',
    estado: 'ACTIVO',
  });

  const indicacionMedicamento = (
    id: number,
    estado: 'ACTIVO' | 'FINALIZADO' = 'ACTIVO',
  ): MedicamentoIndicacionResponse => ({
    id,
    medicamentoLogId: 9,
    medicamento: 'Ibuprofeno',
    medicamentoLibre: null,
    presentacion: 'tabletas de 400 mg',
    cantidad: 2,
    frecuencia: 8,
    duracion: 7,
    tipoDuracion: 'DIAS',
    observaciones: null,
    episodioId: 1,
    usuarioId: 2,
    usuarioNombre: 'Carlos Méndez',
    fecha: '2026-10-16T11:00:00',
    estado,
  });

  beforeEach(async () => {
    vi.resetAllMocks();
    reiniciarCuidados();
    catalogoService.listarUnidadMedida.mockReturnValue(of([]));
    examenService.buscarPorEpisodio.mockImplementation((_, estado) =>
      of(
        estado === 'ACTIVO'
          ? [
              examen(1, 'Hemograma completo'),
              examen(2, 'Glucosa en ayunas'),
              examen(3, 'Radiografía de tórax'),
              examen(4, 'Urocultivo'),
            ]
          : [],
      ),
    );
    popUps.confirmarToast.mockResolvedValue(true);
    medicamentoService.getIndicacionesPorEpisodio.mockImplementation((_, estado) =>
      of(
        estado === 'ACTIVO'
          ? [indicacionMedicamento(1), indicacionMedicamento(2)]
          : [indicacionMedicamento(3, 'FINALIZADO')],
      ),
    );
    medicamentoService.buscarCatalogo.mockReturnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [Indicaciones],
      providers: [
        { provide: PopUps, useValue: popUps },
        { provide: MedicamentoIndicacionService, useValue: medicamentoService },
        { provide: CatalogoService, useValue: catalogoService },
        { provide: IndicacionExamenService, useValue: examenService },
        { provide: IndicacionCuidadoService, useValue: cuidadoService },
        { provide: ModalService, useValue: modalService },
        { provide: AuthService, useValue: authService },
        { provide: EpisodioActivoService, useValue: episodioActivo },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Indicaciones);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  const elementos = <T extends Element>(selector: string): NodeListOf<T> =>
    fixture.nativeElement.querySelectorAll(selector);

  const elemento = <T extends Element>(selector: string): T =>
    fixture.nativeElement.querySelector(selector);

  // Cada sección del rail tiene su propio componente: se consulta el que está montado
  const cuidados = (): IndicacionCuidados =>
    fixture.debugElement.query(By.directive(IndicacionCuidados))!.componentInstance;

  // Selectores semánticos: los botones usan las clases globales de src/styles/botonesStyle.scss
  // y las tarjetas del rail las de src/styles/tarjetaStyle.scss
  const tarjetas = (): NodeListOf<HTMLElement> => elementos<HTMLElement>('.indicacion-card');

  // Insignias de la tarjeta: cantidad, frecuencia y duración de la indicación
  const insignias = (indice: number): string[] =>
    [...tarjetas()[indice].querySelectorAll<HTMLElement>('.indicacion-badges li')].map(
      (insignia) => insignia.textContent?.trim() ?? '',
    );

  const botonGuardar = (): HTMLButtonElement =>
    elemento<HTMLButtonElement>('.indicacion-acciones button[type="submit"]');

  const botonCancelar = (): HTMLButtonElement =>
    elemento<HTMLButtonElement>('.indicacion-acciones button[type="button"]');

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

  // Menú de opciones de cada tarjeta (mismo patrón del listado de camas)
  const disparadoresMenu = (): NodeListOf<HTMLButtonElement> =>
    elementos<HTMLButtonElement>('.indicacion-menu-trigger');

  const abrirMenu = async (indice: number): Promise<void> => {
    disparadoresMenu()[indice].click();
    await fixture.whenStable();
  };

  const botonEditarDelMenu = (): HTMLButtonElement =>
    elemento<HTMLButtonElement>('.indicacion-menu .iconEditar');

  const botonEliminarDelMenu = (): HTMLButtonElement =>
    elemento<HTMLButtonElement>('.indicacion-menu .iconQuitar');

  // Filtros del listado: estados en las indicaciones y disponibilidad en los exámenes
  const filtrosIndicados = (): NodeListOf<HTMLButtonElement> =>
    elementos<HTMLButtonElement>('.indicados-filtro');

  const filtroActivo = (): HTMLButtonElement =>
    elemento<HTMLButtonElement>('.indicados-filtro--activo');

  const elegirFiltro = async (etiqueta: string): Promise<void> => {
    const boton = [...filtrosIndicados()].find((filtro) => filtro.textContent?.trim() === etiqueta);

    expect(boton).toBeDefined();
    boton?.click();
    await fixture.whenStable();
  };

  // Tarjetas del rail: las tres secciones conmutan el área central de la pantalla
  const tarjetaDelRail = (titulo: string): HTMLButtonElement | undefined =>
    [...elementos<HTMLButtonElement>('.panel-secciones .tarjeta')].find((tarjeta) =>
      tarjeta.textContent?.includes(titulo),
    );

  const irASeccion = async (titulo: string): Promise<void> => {
    const boton = tarjetaDelRail(titulo);

    expect(boton).toBeDefined();
    boton?.click();
    await fixture.whenStable();
  };

  // Tabla de resultados de la búsqueda de medicamentos: la lupa del buscador, sus filas y su pie
  const botonBuscar = (): HTMLButtonElement =>
    elemento<HTMLButtonElement>('.indicacion-buscador .btnLupa');

  const filasResultados = (): NodeListOf<HTMLTableRowElement> =>
    elementos<HTMLTableRowElement>('.indicacion-resultados tbody tr.fila-seleccionable');

  const pieDeResultados = (): HTMLElement => elemento<HTMLElement>('.indicacion-resultados tfoot');

  const paginaSiguiente = async (): Promise<void> => {
    elemento<HTMLButtonElement>('.indicacion-resultados tfoot .derecha').click();
    await fixture.whenStable();
  };

  const buscarMedicamento = async (texto: string): Promise<void> => {
    await escribir('#medicamentoIndicado', texto);
    botonBuscar().click();
    await fixture.whenStable();
  };

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ubica las acciones del formulario en la fila compartida y con los estilos globales', () => {
    const acciones = elemento<HTMLElement>('.indicacion-acciones');

    expect(acciones.classList.contains('acciones-formulario')).toBe(true);
    expect(botonGuardar().classList.contains('_guardar')).toBe(true);
    expect(botonCancelar().classList.contains('_cancelar')).toBe(true);
    expect(botonGuardar().textContent?.trim()).toBe('Guardar');
    expect(botonCancelar().textContent?.trim()).toBe('Cancelar');
  });

  it('mantiene el rail, el formulario y el listado en paneles independientes', () => {
    expect(elementos<HTMLElement>('.panel-secciones .tarjeta').length).toBe(3);
    expect(elemento('.panel-secciones .indicacion-form')).toBeNull();
    expect(elemento('.panel-indicados .indicacion-card')?.closest('.panel-seccion')).toBeNull();
  });

  it('muestra las tres secciones del rail con la de Medicamentos activa', () => {
    expect(elementos<HTMLElement>('.panel-secciones .tarjeta').length).toBe(3);
    expect(elementos<HTMLElement>('.panel-secciones .tarjeta_icono i').length).toBe(3);
    expect(elemento<HTMLElement>('.tarjeta--activa').textContent).toContain('Medicamentos');
  });

  it('asigna a cada sección del rail un icono acorde', () => {
    const iconos = elementos<HTMLElement>('.panel-secciones .tarjeta_icono i');

    expect(iconos[0].classList.contains('bi-capsule')).toBe(true);
    expect(iconos[1].classList.contains('bi-clipboard2-pulse')).toBe(true);
    expect(iconos[2].classList.contains('bi-heart-pulse')).toBe(true);
  });

  it('conmuta el área central al pulsar otra sección del rail', async () => {
    await irASeccion('Exámenes');

    expect(component.seccionActiva).toBe('examenes');
    expect(elemento<HTMLElement>('.tarjeta--activa').textContent).toContain('Exámenes');
    expect(elemento('#nombreExamen')).not.toBeNull();
    expect(elemento('#medicamentoIndicado')).toBeNull();

    await irASeccion('Medicamentos');

    expect(component.seccionActiva).toBe('medicamentos');
    expect(elemento<HTMLElement>('.tarjeta--activa').textContent).toContain('Medicamentos');
    expect(elemento('#medicamentoIndicado')).not.toBeNull();
    expect(elemento('#nombreExamen')).toBeNull();
  });

  it('abre la sección de Cuidados desde su tarjeta del rail', async () => {
    expect(elementos<HTMLElement>('.panel-secciones .tarjeta').length).toBe(3);
    expect(tarjetaDelRail('Medicamentos')?.disabled).toBe(false);
    expect(tarjetaDelRail('Exámenes')?.disabled).toBe(false);
    expect(tarjetaDelRail('Cuidados')?.disabled).toBe(false);

    await irASeccion('Cuidados');

    expect(component.seccionActiva).toBe('cuidados');
    expect(elemento<HTMLElement>('.tarjeta--activa').textContent).toContain('Cuidados');
    expect(elemento('#nombreCuidado')).not.toBeNull();
    expect(elemento('#medicamentoIndicado')).toBeNull();
    expect(elemento('#nombreExamen')).toBeNull();
  });

  it('ajusta el alto del formulario a su contenido sin crecer con el listado', async () => {
    // El formulario de la sección que abre la pantalla también es independiente de su listado
    expect(getComputedStyle(elemento<HTMLElement>('.panel-seccion')).alignSelf).toBe('start');

    await irASeccion('Exámenes');

    expect(getComputedStyle(elemento<HTMLElement>('.panel-seccion')).alignSelf).toBe('start');
  });

  it('deja el desplazamiento del listado solo para las tarjetas, bajo el título y los filtros', async () => {
    const panel = elemento<HTMLElement>('.panel-indicados');
    const filtros = elemento<HTMLElement>('.indicados-filtros');
    const listado = elemento<HTMLElement>('.indicados-lista');

    // El título y los filtros quedan fuera de la pista del desplazamiento, que los sucede en el panel
    expect(panel.firstElementChild?.classList.contains('panel-titulo')).toBe(true);
    expect(filtros.closest('.indicados-lista')).toBeNull();
    expect(filtros.nextElementSibling?.classList.contains('indicados-lista')).toBe(true);
    expect(listado.closest('.panel-indicados')).toBe(panel);
    expect(getComputedStyle(listado).overflowY).toBe('auto');

    // El listado de exámenes repite el mismo desplazamiento interno
    await irASeccion('Exámenes');

    const listadoExamenes = elemento<HTMLElement>('.indicados-lista');

    expect(listadoExamenes.querySelectorAll('.indicacion-card').length).toBe(4);
    expect(getComputedStyle(listadoExamenes).overflowY).toBe('auto');
  });

  // ------------------- CUIDADOS INDICADOS -------------------
  it('muestra el registro del cuidado con sus cuatro campos y sus obligatorios', async () => {
    await irASeccion('Cuidados');

    const etiquetas = [...elementos<HTMLElement>('.panel-seccion .indicacion-etiqueta')].map(
      (etiqueta) => etiqueta.textContent?.trim(),
    );
    const obligatorio = elemento<HTMLElement>('.indicacion-obligatorio');

    expect(etiquetas.length).toBe(5);
    expect(etiquetas[0]).toContain('Nombre de cuidado');
    expect(etiquetas[1]).toContain('Frecuencia (horas)');
    expect(etiquetas[2]).toBe('Duración');
    expect(etiquetas[3]).toContain('Tipo de duración');
    expect(etiquetas[4]).toBe('Observaciones');

    // Los cuatro campos del cuidado están en el formulario
    expect(elemento('#nombreCuidado')).not.toBeNull();
    expect(elemento('#frecuenciaCuidado')).not.toBeNull();
    expect(elemento('#duracionCuidado')).not.toBeNull();
    expect(elemento('#observacionesCuidado')).not.toBeNull();

    // El nombre, la frecuencia y el tipo de duración son obligatorios
    expect(elementos<HTMLElement>('.indicacion-obligatorio').length).toBe(3);
    expect(obligatorio.closest('label')?.textContent).toContain('Nombre de cuidado');
    expect(botonGuardar().disabled).toBe(true);
  });

  it('habilita Guardar con los datos del cuidado y lo registra con sus datos', async () => {
    await irASeccion('Cuidados');

    await escribir('#nombreCuidado', 'Dieta blanda');

    expect(cuidados().hayCuidado).toBe(true);
    // El backend exige también la frecuencia y el tipo de duración
    expect(botonGuardar().disabled).toBe(true);

    await escribir('#frecuenciaCuidado', '6');
    await elegir('#duracionTipoCuidado', 'dias');
    await escribir('#duracionCuidado', '4');
    await escribir('#observacionesCuidado', 'Sin residuos y en porciones pequeñas.');

    expect(botonGuardar().disabled).toBe(false);

    botonGuardar().click();
    await fixture.whenStable();

    expect(cuidadoService.crearCuidado).toHaveBeenCalledWith({
      nombreCuidado: 'Dieta blanda',
      frecuencia: 6,
      duracion: 4,
      tipoDuracion: 'DIAS',
      observacion: 'Sin residuos y en porciones pequeñas.',
      episodioId: 1,
      usuarioId: 2,
    });
    expect(tarjetas().length).toBe(5);
    expect(tarjetas()[4].textContent).toContain('Dieta blanda');
    expect(insignias(4)).toEqual(['Realizar cada 6 horas por 4 días']);
    expect(tarjetas()[4].textContent).toContain('Sin residuos y en porciones pequeñas.');

    // El formulario queda listo para la siguiente captura
    expect(cuidados().nombreCuidado).toBe('');
    expect(elemento<HTMLInputElement>('#nombreCuidado').value).toBe('');
    expect(botonGuardar().disabled).toBe(true);
  });

  it('exige la cantidad de días cuando la duración del cuidado se marca en días', async () => {
    await irASeccion('Cuidados');

    await escribir('#nombreCuidado', 'Dieta blanda');
    await escribir('#frecuenciaCuidado', '6');
    await elegir('#duracionTipoCuidado', 'dias');

    expect(cuidados().faltaDuracionEnDiasCuidado).toBe(true);
    expect(botonGuardar().disabled).toBe(true);

    // Tampoco se registra si el formulario se envía sin la cantidad de días
    cuidados().agregarCuidado();
    await fixture.whenStable();

    expect(cuidadoService.crearCuidado).not.toHaveBeenCalled();
    expect(tarjetas().length).toBe(4);

    await escribir('#duracionCuidado', '4');

    expect(cuidados().faltaDuracionEnDiasCuidado).toBe(false);
    expect(botonGuardar().disabled).toBe(false);

    botonGuardar().click();
    await fixture.whenStable();

    expect(insignias(4)).toEqual(['Realizar cada 6 horas por 4 días']);
  });

  it('muestra que el cuidado se realiza una sola vez cuando es dosis única', async () => {
    await irASeccion('Cuidados');

    await escribir('#nombreCuidado', 'Aplicar vacuna');
    await escribir('#frecuenciaCuidado', '1');
    await elegir('#duracionTipoCuidado', 'unica');

    botonGuardar().click();
    await fixture.whenStable();

    expect(cuidadoService.crearCuidado).toHaveBeenCalledWith({
      nombreCuidado: 'Aplicar vacuna',
      frecuencia: 1,
      duracion: null,
      tipoDuracion: 'DOSIS_UNICA',
      observacion: null,
      episodioId: 1,
      usuarioId: 2,
    });
    expect(insignias(4)).toEqual(['Realizar una vez']);
  });

  it('no agrega nada cuando el nombre del cuidado está vacío', async () => {
    await irASeccion('Cuidados');

    await escribir('#nombreCuidado', '   ');

    cuidados().agregarCuidado();
    await fixture.whenStable();

    expect(cuidadoService.crearCuidado).not.toHaveBeenCalled();
    expect(tarjetas().length).toBe(4);
    expect(cuidados().nombreCuidado).toBe('   ');
  });

  it('cancela la captura del cuidado sin registrar nada', async () => {
    await irASeccion('Cuidados');

    await escribir('#nombreCuidado', 'Dieta blanda');
    await escribir('#frecuenciaCuidado', '6');
    await elegir('#duracionTipoCuidado', 'dias');
    await escribir('#duracionCuidado', '4');

    botonCancelar().click();
    await fixture.whenStable();

    expect(tarjetas().length).toBe(4);
    expect(cuidados().nombreCuidado).toBe('');
    expect(cuidados().frecuenciaCuidado).toBeNull();
    expect(cuidados().duracionTipoCuidado).toBe('');
    expect(cuidados().duracionCantidadCuidado).toBeNull();
  });

  it('abre el listado de cuidados con el filtro Todas y deja fuera los eliminados', async () => {
    await irASeccion('Cuidados');

    expect([...filtrosIndicados()].map((filtro) => filtro.textContent?.trim())).toEqual([
      'Todas',
      'Completadas',
      'En proceso',
      'Eliminadas',
    ]);
    expect(filtroActivo().textContent?.trim()).toBe('Todas');
    expect(filtroActivo().getAttribute('aria-pressed')).toBe('true');
    expect(elementos<HTMLElement>('.indicados-filtro[aria-pressed="true"]').length).toBe(1);

    // «Todas» consulta los estados vigentes del backend y deja fuera los eliminados
    expect(cuidadoService.buscarPorEpisodio).toHaveBeenCalledWith(1, 'EN_PROCESO');
    expect(cuidadoService.buscarPorEpisodio).toHaveBeenCalledWith(1, 'COMPLETADO');
    expect(tarjetas().length).toBe(4);
    expect(tarjetas()[0].textContent).toContain('Cambio de posición');
    expect(tarjetas()[3].textContent).toContain('Curación de herida');
  });

  it('muestra solo los cuidados del estado elegido', async () => {
    await irASeccion('Cuidados');

    await elegirFiltro('Completadas');

    expect(filtroActivo().textContent?.trim()).toBe('Completadas');
    expect(tarjetas().length).toBe(1);
    expect(tarjetas()[0].textContent).toContain('Curación de herida');

    await elegirFiltro('En proceso');

    expect(tarjetas().length).toBe(3);
    expect(tarjetas()[0].textContent).toContain('Cambio de posición');

    await elegirFiltro('Eliminadas');

    expect(tarjetas().length).toBe(1);
    expect(tarjetas()[0].textContent).toContain('Vigilancia de diuresis');

    await elegirFiltro('Todas');

    expect(tarjetas().length).toBe(4);
  });

  it('pinta el borde izquierdo de cada cuidado con el color de su estado', async () => {
    await irASeccion('Cuidados');

    // En proceso en naranja, completado en verde y ningún cuidado con el gris de lo eliminado
    expect(elementos<HTMLElement>('.indicacion-card--naranja').length).toBe(3);
    expect(elementos<HTMLElement>('.indicacion-card--verde').length).toBe(1);
    expect(elementos<HTMLElement>('.indicacion-card--eliminada').length).toBe(0);

    const completado = elemento<HTMLElement>('.indicacion-card--verde');

    expect(completado.textContent).toContain('Curación de herida');
    expect(getComputedStyle(completado).borderLeftColor).toBe('rgb(34, 197, 94)');
    expect(
      getComputedStyle(elemento<HTMLElement>('.indicacion-card--naranja')).borderLeftColor,
    ).toBe('rgb(255, 146, 28)');

    await elegirFiltro('Eliminadas');

    const eliminado = elemento<HTMLElement>('.indicacion-card--rojo');

    expect(eliminado.textContent).toContain('Vigilancia de diuresis');
    expect(getComputedStyle(eliminado).borderLeftColor).toBe('rgb(237, 26, 15)');
  });

  it('registra el cuidado nuevo en proceso y lo lista con ese filtro', async () => {
    await irASeccion('Cuidados');
    await elegirFiltro('En proceso');

    await escribir('#nombreCuidado', 'Dieta blanda');
    await escribir('#frecuenciaCuidado', '6');
    await elegir('#duracionTipoCuidado', 'indefinida');
    botonGuardar().click();
    await fixture.whenStable();

    expect(tarjetas().length).toBe(4);
    expect(tarjetas()[3].textContent).toContain('Dieta blanda');
    expect(tarjetas()[3].classList.contains('indicacion-card--naranja')).toBe(true);
  });

  it('pasa el cuidado eliminado al filtro Eliminadas con el borde rojo', async () => {
    await irASeccion('Cuidados');

    await abrirMenu(0);
    botonEliminarDelMenu().click();
    await fixture.whenStable();

    expect(popUps.confirmarToast).toHaveBeenCalledWith(
      '¿Está seguro de eliminar el cuidado "Cambio de posición"?',
    );
    expect(cuidadoService.eliminarCuidado).toHaveBeenCalledWith(1);

    // El cuidado eliminado sale del listado vigente
    expect(tarjetas().length).toBe(3);

    await elegirFiltro('Eliminadas');

    expect(filtroActivo().textContent?.trim()).toBe('Eliminadas');
    expect(tarjetas().length).toBe(2);
    expect(tarjetas()[0].textContent).toContain('Cambio de posición');
    expect(tarjetas()[0].classList.contains('indicacion-card--rojo')).toBe(true);
    expect(tarjetas()[0].classList.contains('indicacion-card--eliminada')).toBe(false);
  });

  it('conserva el cuidado si la confirmación de la eliminación se cancela', async () => {
    await irASeccion('Cuidados');
    popUps.confirmarToast.mockResolvedValue(false);

    await abrirMenu(0);
    botonEliminarDelMenu().click();
    await fixture.whenStable();

    expect(tarjetas().length).toBe(4);
    expect(elemento('.indicacion-menu')).toBeNull();
  });

  it('muestra el estado vacío del filtro cuando no hay cuidados en ese estado', async () => {
    await irASeccion('Cuidados');
    await elegirFiltro('Completadas');

    await abrirMenu(0);
    botonEliminarDelMenu().click();
    await fixture.whenStable();

    expect(tarjetas().length).toBe(0);
    expect(elemento<HTMLElement>('.indicacion-vacio').textContent).toContain(
      'No hay cuidados con el filtro «Completadas»',
    );
  });

  it('detalla el cuidado en su tarjeta con las insignias, las observaciones y el pie', async () => {
    await irASeccion('Cuidados');

    const tarjeta = tarjetas()[0];
    const pie = tarjeta.querySelector<HTMLElement>('.indicacion-meta');

    expect(insignias(0)).toEqual(['Realizar cada 2 horas por 5 días']);
    expect(tarjeta.querySelector('.indicacion-observaciones')?.textContent).toContain(
      'Alternar decúbito lateral',
    );
    expect(pie?.textContent).toContain('10/10/2026');
    expect(pie?.textContent).toContain('09:15');
    expect(pie?.textContent).toContain('Dr. Gómez');
    expect([...(pie?.querySelectorAll('i') ?? [])].map((icono) => icono.className)).toEqual([
      'bi bi-calendar3',
      'bi bi-clock',
      'bi bi-person',
    ]);

    // Cada tarjeta de cuidado lleva el menú de opciones de las otras tarjetas del listado
    expect(disparadoresMenu().length).toBe(4);
    expect(tarjeta.querySelector('.indicacion-menu-trigger')).not.toBeNull();

    // El tipo de duración distinto de «días» se muestra con su nombre
    await elegirFiltro('Eliminadas');

    expect(insignias(0)).toEqual(['Realizar cada 8 horas por tiempo indefinido']);
  });

  it('despliega el menú del cuidado y lo cierra al pulsar fuera de su tarjeta', async () => {
    await irASeccion('Cuidados');

    await abrirMenu(0);

    expect(cuidados().menuIndicacionAbierta).toBe(1);
    expect(elementos('.indicacion-menu').length).toBe(1);

    elemento<HTMLElement>('.panel-indicados').dispatchEvent(new Event('click', { bubbles: true }));
    await fixture.whenStable();

    expect(cuidados().menuIndicacionAbierta).toBeNull();
    expect(elemento('.indicacion-menu')).toBeNull();
  });

  it('carga en el formulario el cuidado elegido y guarda sobre la misma tarjeta', async () => {
    await irASeccion('Cuidados');

    await abrirMenu(0);
    botonEditarDelMenu().click();
    await fixture.whenStable();

    expect(cuidados().cuidadoEnEdicion).toBe(1);
    expect(cuidados().nombreCuidado).toBe('Cambio de posición');
    expect(cuidados().frecuenciaCuidado).toBe(2);
    expect(cuidados().duracionTipoCuidado).toBe('dias');
    expect(cuidados().duracionCantidadCuidado).toBe(5);
    expect(cuidados().observacionesCuidado).toBe(
      'Alternar decúbito lateral y evitar apoyar la zona de la úlcera.',
    );
    expect(elemento<HTMLInputElement>('#frecuenciaCuidado').value).toBe('2');
    expect(elemento<HTMLInputElement>('#duracionCuidado').value).toBe('5');
    expect(tarjetas()[0].classList.contains('indicacion-card--edicion')).toBe(true);
    expect(elemento('.indicacion-menu')).toBeNull();

    await escribir('#nombreCuidado', 'Cambio de posición cada 4 horas');
    await escribir('#frecuenciaCuidado', '4');
    botonGuardar().click();
    await fixture.whenStable();

    expect(popUps.confirmarToast).toHaveBeenCalledWith(
      '¿Está seguro de guardar los cambios del cuidado "Cambio de posición cada 4 horas"?',
    );
    expect(cuidadoService.actualizarCuidado).toHaveBeenCalledWith(1, {
      nombreCuidado: 'Cambio de posición cada 4 horas',
      frecuencia: 4,
      duracion: 5,
      tipoDuracion: 'DIAS',
      observacion: 'Alternar decúbito lateral y evitar apoyar la zona de la úlcera.',
      episodioId: 1,
      usuarioId: 2,
    });

    // Los cambios se guardan en la misma tarjeta, que conserva su fecha, hora, médico y estado
    expect(tarjetas().length).toBe(4);
    expect(tarjetas()[0].textContent).toContain('Cambio de posición cada 4 horas');
    expect(insignias(0)).toEqual(['Realizar cada 4 horas por 5 días']);
    expect(tarjetas()[0].textContent).toContain('10/10/2026');
    expect(tarjetas()[0].classList.contains('indicacion-card--naranja')).toBe(true);
    expect(cuidados().cuidadoEnEdicion).toBeNull();
    expect(cuidados().nombreCuidado).toBe('');
  });

  it('conserva el cuidado sin actualizar si la confirmación de los cambios se cancela', async () => {
    await irASeccion('Cuidados');

    await abrirMenu(0);
    botonEditarDelMenu().click();
    await fixture.whenStable();

    popUps.confirmarToast.mockResolvedValue(false);
    await escribir('#nombreCuidado', 'Cambio de posición cada 6 horas');
    botonGuardar().click();
    await fixture.whenStable();

    expect(cuidadoService.actualizarCuidado).not.toHaveBeenCalled();
    expect(tarjetas()[0].textContent).toContain('Cambio de posición');
  });

  it('libera el formulario cuando se elimina el cuidado en edición', async () => {
    await irASeccion('Cuidados');

    await abrirMenu(0);
    botonEditarDelMenu().click();
    await fixture.whenStable();

    await abrirMenu(0);
    botonEliminarDelMenu().click();
    await fixture.whenStable();

    expect(tarjetas().length).toBe(3);
    expect(cuidados().cuidadoEnEdicion).toBeNull();
    expect(cuidados().nombreCuidado).toBe('');
    expect(elemento('.indicacion-card--edicion')).toBeNull();
  });

  it('cierra el menú del cuidado y suelta su edición al cambiar de filtro', async () => {
    await irASeccion('Cuidados');

    await abrirMenu(0);

    await elegirFiltro('En proceso');

    expect(cuidados().menuIndicacionAbierta).toBeNull();

    await abrirMenu(0);
    botonEditarDelMenu().click();
    await fixture.whenStable();

    // El cuidado sigue en el listado: la edición continúa
    await elegirFiltro('Todas');

    expect(cuidados().cuidadoEnEdicion).toBe(1);
    expect(cuidados().nombreCuidado).toBe('Cambio de posición');

    // Al quedar fuera del listado, el formulario se libera
    await elegirFiltro('Completadas');

    expect(cuidados().cuidadoEnEdicion).toBeNull();
    expect(cuidados().nombreCuidado).toBe('');
    expect(elemento('.indicacion-card--edicion')).toBeNull();
  });

  // Ficha con los datos del paciente: el mismo bloque compartido que usa evaluación clínica
  const botonPestanaPaciente = (): HTMLButtonElement =>
    elemento<HTMLButtonElement>('.ficha-pestana');

  const botonPlegarFicha = (): HTMLButtonElement => elemento<HTMLButtonElement>('.ficha-plegar');

  const fichaPaciente = (): HTMLElement | null =>
    fixture.nativeElement.querySelector('app-datos-paciente .ficha');

  it('reutiliza el bloque de datos del paciente de evaluación clínica', () => {
    // La pantalla no duplica la ficha: se dibuja el bloque compartido, cerrado y con su pestaña
    expect(elemento<HTMLElement>('app-datos-paciente')).not.toBeNull();
    expect(elemento<HTMLElement>('app-datos-paciente .ficha-pestana')).not.toBeNull();
    expect(fichaPaciente()).toBeNull();
  });

  it('abre la ficha del paciente con la pestaña lateral y reserva su espacio', async () => {
    expect(component.pacienteAbierto).toBe(false);
    expect(botonPestanaPaciente().getAttribute('aria-expanded')).toBe('false');
    expect(
      elemento<HTMLElement>('.indicaciones').classList.contains('indicaciones--ficha-abierta'),
    ).toBe(false);

    botonPestanaPaciente().click();
    await fixture.whenStable();

    const rejilla = elemento<HTMLElement>('.indicaciones');
    expect(component.pacienteAbierto).toBe(true);
    expect(botonPestanaPaciente().getAttribute('aria-expanded')).toBe('true');
    expect(rejilla.classList.contains('indicaciones--ficha-abierta')).toBe(true);

    const ficha = fichaPaciente();
    expect(ficha).not.toBeNull();
    expect(elemento<HTMLElement>('.ficha-titulo').textContent?.trim()).toBe(
      'Información del paciente',
    );
    expect(ficha?.textContent).toContain('EXP-0241');
    expect(ficha?.textContent).toContain('Juan Pérez');

    botonPestanaPaciente().click();
    await fixture.whenStable();

    expect(component.pacienteAbierto).toBe(false);
    expect(fichaPaciente()).toBeNull();
    expect(rejilla.classList.contains('indicaciones--ficha-abierta')).toBe(false);
  });

  it('pliega el cuerpo de la ficha del paciente sin ocultar el título', async () => {
    botonPestanaPaciente().click();
    await fixture.whenStable();

    botonPlegarFicha().click();
    await fixture.whenStable();

    expect(component.datosPacienteVisibles).toBe(false);
    expect(botonPlegarFicha().getAttribute('aria-expanded')).toBe('false');
    expect(elemento<HTMLElement>('.ficha-titulo').textContent?.trim()).toBe(
      'Información del paciente',
    );
    expect(elemento<HTMLElement>('.ficha-cuerpo').classList.contains('ficha-cuerpo--plegado')).toBe(
      true,
    );
  });

  it('reabre la ficha del paciente con los datos completos tras plegarla', async () => {
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
  });

  it('mantiene la ficha del paciente abierta al cambiar de sección', async () => {
    botonPestanaPaciente().click();
    await fixture.whenStable();

    await irASeccion('Cuidados');

    // La ficha es común a las tres secciones del rail: el cambio de sección no la repliega
    expect(component.seccionActiva).toBe('cuidados');
    expect(component.pacienteAbierto).toBe(true);
    expect(fichaPaciente()).not.toBeNull();
  });

  it('muestra en el rail solo el título de cada sección, con su icono alineado', () => {
    const titulos = elementos<HTMLElement>('.panel-secciones .tarjeta_titulo');

    // Las tarjetas del rail ya no llevan descripción: el icono queda alineado con el título
    expect(elemento('.panel-secciones .tarjeta_descripcion')).toBeNull();
    expect([...titulos].map((titulo) => titulo.textContent?.trim())).toEqual([
      'Medicamentos',
      'Exámenes',
      'Cuidados',
    ]);
    expect(elementos<HTMLElement>('.panel-secciones .tarjeta_icono i').length).toBe(3);
  });

  it('oculta los formularios de indicaciones cuando el episodio es solo lectura', async () => {
    episodioActivo.esSoloLectura = () => true;
    fixture.detectChanges();
    await fixture.whenStable();

    expect(elemento('.indicacion-form')).toBeNull();
    expect(elemento('.indicacion-menu-trigger')).toBeNull();
  });
});

