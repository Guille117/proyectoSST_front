import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';

import { ProcedimientoMedico } from './procedimiento-medico';
import { ProcedimientoMedicoService } from './data/procedimiento-medico-service';
import { EpisodioActivoService } from '../data/episodio-activo-service';
import { AuthService } from '../../Auth/data/auth-service';
import { PopUps } from '../../../shared/popUps/popUpsService';

describe('ProcedimientoMedico', () => {
  let component: ProcedimientoMedico;
  let fixture: ComponentFixture<ProcedimientoMedico>;
  let soloLectura = false;

  const servicio = {
    getTiposProcedimiento: vi.fn(),
    getProcedimientos: vi.fn(),
    crearProcedimiento: vi.fn(),
    actualizarProcedimiento: vi.fn(),
    eliminarProcedimiento: vi.fn(),
    buscarRecursos: vi.fn(),
  };

  const episodio = {
    obtener: vi.fn(() => 10),
    esSoloLectura: vi.fn(() => soloLectura),
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
    });
    expect(popUps.exito).toHaveBeenCalledWith('Procedimiento registrado exitosamente.');
  });
});
