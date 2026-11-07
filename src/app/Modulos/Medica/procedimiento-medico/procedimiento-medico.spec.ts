import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of, Subject, throwError } from 'rxjs';

import { ProcedimientoMedico } from './procedimiento-medico';
import { ProcedimientoMedicoService } from './data/procedimiento-medico-service';
import { EpisodioActivoService } from '../data/episodio-activo-service';
import { AuthService } from '../../Auth/data/auth-service';
import { OpcionOtroComponent } from '../../../shared/opcion-otro/opcion-otro';
import { PopUps } from '../../../shared/popUps/popUpsService';

describe('ProcedimientoMedico', () => {
  let component: ProcedimientoMedico;
  let fixture: ComponentFixture<ProcedimientoMedico>;
  let soloLectura = false;

  const servicio = {
    getTiposProcedimiento: vi.fn(),
    getProcedimientos: vi.fn(),
    postTipoProcedimiento: vi.fn(),
    crearProcedimiento: vi.fn(),
    actualizarProcedimiento: vi.fn(),
    eliminarProcedimiento: vi.fn(),
    buscarRecursos: vi.fn(),
  };

  const episodio = {
    obtener: vi.fn(() => 10),
    esSoloLectura: vi.fn(() => soloLectura),
    pacienteId: vi.fn(() => null),
  };

  const auth = {
    currentUser: vi.fn(() => ({ id: 1, nombreCompleto: 'Dra. Ana López' })),
  };

  const popUps = {
    confirmarToast: vi.fn(),
    exito: vi.fn(),
    advertencia: vi.fn(),
    error: vi.fn(),
    errorDesdeBackend: vi.fn(),
    formIncompleto: vi.fn(),
  };

  const procedimiento = {
    id: 1,
    tipoProcedimientoId: 1,
    tipoProcedimientoNombre: 'Sutura',
    descripcion: 'Sutura de herida en el antebrazo.',
    resultado: '',
    inicio: '2026-10-19T11:00:00',
    fin: null,
    episodioId: 10,
    usuarioId: 1,
    usuarioNombre: 'Dra. Ana López',
    usuarioNombreCorto: 'Dra. Ana López',
    fechaRegistro: '2026-10-19T10:55:00',
    estado: 'PENDIENTE',
    recursos: [],
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    soloLectura = false;
    servicio.getTiposProcedimiento.mockReturnValue(
      of([{ id: 1, nombre: 'Sutura', estado: true }]),
    );
    servicio.getProcedimientos.mockReturnValue(of([procedimiento]));
    servicio.postTipoProcedimiento.mockReturnValue(
      of({ id: 9, nombre: 'Nuevo tipo', estado: true }),
    );
    servicio.buscarRecursos.mockReturnValue(
      of([{ id: 4, nombre: 'Amoxicilina Bayer tabletas', disponible: 5 }]),
    );
    popUps.confirmarToast.mockResolvedValue(true);

    await TestBed.configureTestingModule({
      imports: [ProcedimientoMedico],
      providers: [
        { provide: ProcedimientoMedicoService, useValue: servicio },
        { provide: EpisodioActivoService, useValue: episodio },
        { provide: AuthService, useValue: auth },
        { provide: PopUps, useValue: popUps },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProcedimientoMedico);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  function abrirOtroTipo(): OpcionOtroComponent {
    const select: HTMLSelectElement = fixture.nativeElement.querySelector(
      '#tipoProcedimientoMedico',
    );
    const opcionOtro = Array.from(select.options).find(
      (opcion) => opcion.textContent?.trim() === 'Otro',
    );
    select.selectedIndex = opcionOtro?.index ?? -1;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    return fixture.debugElement.query(By.css('app-opcion-otro'))
      .componentInstance as OpcionOtroComponent;
  }

  it('carga los tipos y los procedimientos del episodio activo', () => {
    expect(servicio.getTiposProcedimiento).toHaveBeenCalled();
    expect(servicio.getProcedimientos).toHaveBeenCalledWith(10);
    expect(component.procedimientos.length).toBe(1);
    expect(component.procedimientos[0].tipo).toBe('Sutura');
    expect(fixture.nativeElement.textContent).toContain('Sutura');
  });

  it('en solo lectura deja únicamente procedimientos realizados y oculta el registro', () => {
    const realizado = {
      ...procedimiento,
      id: 2,
      tipoProcedimientoNombre: 'Curación',
      estado: 'REALIZADO',
    };
    servicio.getProcedimientos.mockReturnValue(of([procedimiento, realizado]));
    soloLectura = true;
    component.ngOnInit();
    fixture.detectChanges();

    expect(component.seccionActiva).toBe('realizados');
    expect(component.filtroProcedimiento).toBe('realizados');
    expect(component.secciones.map((seccion) => seccion.id)).toEqual(['realizados']);
    expect(component.procedimientosFiltrados.map((item) => item.id)).toEqual([2]);
    expect(fixture.nativeElement.querySelector('.indicados-filtros')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Registrar procedimiento');
  });

  it('busca recursos en el catálogo de farmacia del tipo activo', () => {
    component.tipoRecurso = 'medicamento';
    component.textoBusquedaRecurso = 'Amoxicilina';

    component.buscarRecursos();

    expect(servicio.buscarRecursos).toHaveBeenCalledWith('MEDICAMENTO', 'Amoxicilina');
    expect(component.recursosEncontrados).toEqual([
      { id: 4, nombre: 'Amoxicilina Bayer tabletas', disponible: 5 },
    ]);
  });

  it('mantiene la carga al reemplazar una petición de procedimientos', () => {
    const primera = new Subject<typeof procedimiento[]>();
    const segunda = new Subject<typeof procedimiento[]>();
    servicio.getProcedimientos.mockReturnValueOnce(primera).mockReturnValueOnce(segunda);

    component.cargarProcedimientos();
    component.cargarProcedimientos();

    expect(component.cargandoProcedimientos).toBe(true);
    segunda.next([]);
    segunda.complete();
    expect(component.cargandoProcedimientos).toBe(false);
  });

  it('muestra que está buscando recursos mientras espera la respuesta', () => {
    const respuesta = new Subject<{ id: number; nombre: string; disponible: number }[]>();
    servicio.buscarRecursos.mockReturnValue(respuesta);

    component.buscarRecursos();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Buscando');

    respuesta.next([]);
    respuesta.complete();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Buscando');
  });

  it('registra el procedimiento con el episodio y el usuario de la sesión', async () => {
    servicio.crearProcedimiento.mockReturnValue(of(procedimiento));
    component.tipoProcedimiento = 1;
    component.descripcion = 'Sutura de herida en el antebrazo.';
    component.inicio = '2026-10-19T11:00';
    component.fin = '';

    await component.registrarProcedimiento();

    expect(servicio.crearProcedimiento).toHaveBeenCalledWith({
      tipoProcedimientoId: 1,
      descripcion: 'Sutura de herida en el antebrazo.',
      resultado: null,
      inicio: '2026-10-19T11:00:00',
      fin: null,
      episodioId: 10,
      usuarioId: 1,
      recursos: [],
      requiereAutorizacion: false,
    });
    expect(popUps.exito).toHaveBeenCalledWith('Procedimiento registrado exitosamente.');
  });

  it('crea el tipo pendiente antes de registrar el procedimiento y usa su id', async () => {
    servicio.crearProcedimiento.mockReturnValue(of(procedimiento));
    component.descripcion = 'Sutura de herida en el antebrazo.';
    component.inicio = '2026-10-19T11:00';
    component.fin = '';
    const otro = abrirOtroTipo();
    otro.nombre = 'Nuevo tipo';
    fixture.detectChanges();

    expect(component.puedeRegistrarProcedimiento).toBe(true);
    await component.registrarProcedimiento();

    expect(servicio.postTipoProcedimiento).toHaveBeenCalledWith('Nuevo tipo');
    expect(servicio.crearProcedimiento).toHaveBeenCalledWith(
      expect.objectContaining({ tipoProcedimientoId: 9 }),
    );
    expect(servicio.postTipoProcedimiento.mock.invocationCallOrder[0]).toBeLessThan(
      servicio.crearProcedimiento.mock.invocationCallOrder[0],
    );
  });

  it('no registra el procedimiento si falla la creación del tipo pendiente', async () => {
    servicio.postTipoProcedimiento.mockReturnValue(throwError(() => new Error('fallo')));
    component.descripcion = 'Sutura de herida en el antebrazo.';
    component.inicio = '2026-10-19T11:00';
    component.fin = '';
    const otro = abrirOtroTipo();
    otro.nombre = 'Nuevo tipo';
    fixture.detectChanges();

    await component.registrarProcedimiento();

    expect(servicio.crearProcedimiento).not.toHaveBeenCalled();
    expect(popUps.errorDesdeBackend).toHaveBeenCalled();
  });

  it('no registra el procedimiento si el tipo pendiente está vacío y avisa con el formulario incompleto', async () => {
    component.descripcion = 'Sutura de herida en el antebrazo.';
    component.inicio = '2026-10-19T11:00';
    component.fin = '';
    abrirOtroTipo();

    expect(component.puedeRegistrarProcedimiento).toBe(true);
    await component.registrarProcedimiento();

    expect(servicio.postTipoProcedimiento).not.toHaveBeenCalled();
    expect(servicio.crearProcedimiento).not.toHaveBeenCalled();
    expect(popUps.formIncompleto).toHaveBeenCalledWith(
      'Completa el valor de «Tipo de procedimiento» o cancélalo antes de guardar.',
    );
  });
});
