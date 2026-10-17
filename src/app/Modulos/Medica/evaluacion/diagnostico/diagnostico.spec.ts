import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { Diagnostico } from './diagnostico';
import { AuthService } from '../../../Auth/data/auth-service';
import { PopUps } from '../../../../shared/popUps/popUpsService';
import { EpisodioActivoService } from '../../data/episodio-activo-service';
import { DiagnosticoService } from '../data/diagnostico-service';
import { DiagnosticoResponse } from '../data/diagnosticoInterfaz';

describe('Diagnostico', () => {
  let component: Diagnostico;
  let fixture: ComponentFixture<Diagnostico>;

  const principal: DiagnosticoResponse = {
    id: 30,
    tipoDiagnostico: 'PRINCIPAL',
    descripcion: 'Neumonía leve',
    episodioId: 1,
    usuarioId: 2,
    usuarioNombre: 'Carlos Méndez',
    fecha: '2026-10-16T11:00:00',
    estado: true,
  };

  const adicional: DiagnosticoResponse = {
    id: 31,
    tipoDiagnostico: 'ASOCIADO',
    descripcion: 'Hipertensión arterial',
    episodioId: 1,
    usuarioId: 2,
    usuarioNombre: 'Carlos Méndez',
    fecha: '2026-10-16T11:00:00',
    estado: true,
  };

  const servicio = {
    getDiagnosticosPorEpisodio: vi.fn(),
    postDiagnostico: vi.fn(),
    putDiagnostico: vi.fn(),
    cambiarEstado: vi.fn(),
  };

  const auth = {
    currentUser: () => ({ id: 2 }),
  };

  const popUps = {
    exito: vi.fn(),
    error: vi.fn(),
    errorDesdeBackend: vi.fn(),
    confirmarToast: vi.fn(),
    advertencia: vi.fn(),
  };

  const episodioActivo = {
    obtener: vi.fn(() => 1),
    guardar: vi.fn(),
    limpiar: vi.fn(),
  };

  beforeEach(async () => {
    vi.resetAllMocks();
    servicio.getDiagnosticosPorEpisodio.mockReturnValue(of([]));
    popUps.confirmarToast.mockResolvedValue(true);

    await TestBed.configureTestingModule({
      imports: [Diagnostico],
      providers: [
        { provide: DiagnosticoService, useValue: servicio },
        { provide: AuthService, useValue: auth },
        { provide: EpisodioActivoService, useValue: episodioActivo },
        { provide: PopUps, useValue: popUps },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Diagnostico);
    component = fixture.componentInstance;
  });

  const inicializar = async (): Promise<void> => {
    fixture.detectChanges();
    await fixture.whenStable();
  };

  const elementos = <T extends Element>(selector: string): NodeListOf<T> =>
    fixture.nativeElement.querySelectorAll(selector);

  const elemento = <T extends Element>(selector: string): T =>
    fixture.nativeElement.querySelector(selector);

  const campo = (): HTMLInputElement => elemento<HTMLInputElement>('#diagnostico');
  const filas = (): NodeListOf<HTMLTableRowElement> => elementos<HTMLTableRowElement>('tbody tr');

  it('should create', async () => {
    await inicializar();
    expect(component).toBeTruthy();
  });

  it('lista todos los diagnósticos del episodio, incluido el principal', async () => {
    servicio.getDiagnosticosPorEpisodio.mockReturnValue(of([principal, adicional]));

    await inicializar();

    expect(servicio.getDiagnosticosPorEpisodio).toHaveBeenCalledWith(1, true);
    expect(filas().length).toBe(2);
    expect(filas()[0].textContent).toContain('Principal');
    expect(filas()[0].textContent).toContain('Neumonía leve');
    expect(filas()[1].textContent).toContain('Asociado');
    expect(campo().value).toBe('');
  });

  it('crea el diagnóstico con el tipo seleccionado y limpia el formulario', async () => {
    const nuevo: DiagnosticoResponse = { ...adicional, id: 40, descripcion: 'Faringitis' };
    servicio.postDiagnostico.mockReturnValue(of(nuevo));
    await inicializar();

    component.diagnostico = 'Faringitis';
    component.seleccionarTipo({ valor: 'ASOCIADO', nombre: 'Asociado' });
    component.guardarDiagnostico();
    await fixture.whenStable();

    expect(servicio.postDiagnostico).toHaveBeenCalledWith({
      tipoDiagnostico: 'ASOCIADO',
      descripcion: 'Faringitis',
      episodioId: 1,
      usuarioId: 2,
    });
    expect(component.diagnosticos.length).toBe(1);
    expect(component.diagnostico).toBe('');
    expect(component.tipoSeleccionado).toBe('PRINCIPAL');
    expect(component.diagnosticoEnEdicion).toBeNull();
    expect(popUps.exito).toHaveBeenCalled();
  });

  it('actualiza con PUT la fila en edición', async () => {
    servicio.getDiagnosticosPorEpisodio.mockReturnValue(of([principal]));
    servicio.putDiagnostico.mockReturnValue(
      of({ ...principal, descripcion: 'Neumonía confirmada' }),
    );
    await inicializar();

    component.editarDiagnostico(principal);
    expect(component.diagnosticoEnEdicion).toBe(30);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(campo().value).toBe('Neumonía leve');

    component.diagnostico = 'Neumonía confirmada';
    component.guardarDiagnostico();
    await fixture.whenStable();

    expect(popUps.confirmarToast).toHaveBeenCalled();
    expect(servicio.putDiagnostico).toHaveBeenCalledWith(30, {
      tipoDiagnostico: 'PRINCIPAL',
      descripcion: 'Neumonía confirmada',
      episodioId: 1,
      usuarioId: 2,
    });
    expect(component.diagnosticos[0].descripcion).toBe('Neumonía confirmada');
    expect(component.diagnosticoEnEdicion).toBeNull();
  });

  it('no actualiza la fila en edición si la confirmación se cancela', async () => {
    servicio.getDiagnosticosPorEpisodio.mockReturnValue(of([principal]));
    popUps.confirmarToast.mockResolvedValue(false);
    await inicializar();

    component.editarDiagnostico(principal);
    component.diagnostico = 'Neumonía confirmada';
    component.guardarDiagnostico();
    await fixture.whenStable();

    expect(popUps.confirmarToast).toHaveBeenCalled();
    expect(servicio.putDiagnostico).not.toHaveBeenCalled();
    expect(component.diagnosticos[0].descripcion).toBe('Neumonía leve');
    expect(component.diagnosticoEnEdicion).toBe(30);
  });

  it('elimina el diagnóstico confirmado, lo quita de la lista y limpia el formulario', async () => {
    servicio.getDiagnosticosPorEpisodio.mockReturnValue(of([principal, adicional]));
    servicio.cambiarEstado.mockReturnValue(of({ ...adicional, estado: false }));
    await inicializar();

    // La captura se escribe en el campo para comprobar al final que el formulario queda realmente vacío.
    const entrada = campo();
    entrada.value = 'texto en captura';
    entrada.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(component.diagnostico).toBe('texto en captura');

    await component.eliminarDiagnostico(adicional);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(popUps.confirmarToast).toHaveBeenCalledWith(expect.stringContaining('Hipertensión'));
    expect(servicio.cambiarEstado).toHaveBeenCalledWith(31);
    expect(component.diagnosticos.length).toBe(1);
    expect(component.diagnostico).toBe('');
    expect(component.tipoSeleccionado).toBe('PRINCIPAL');
    expect(campo().value).toBe('');
  });

  it('conserva el diagnóstico si la confirmación se cancela', async () => {
    servicio.getDiagnosticosPorEpisodio.mockReturnValue(of([principal, adicional]));
    popUps.confirmarToast.mockResolvedValue(false);
    await inicializar();

    await component.eliminarDiagnostico(adicional);

    expect(servicio.cambiarEstado).not.toHaveBeenCalled();
    expect(component.diagnosticos.length).toBe(2);
  });

  it('avisa del error del backend al cargar', async () => {
    servicio.getDiagnosticosPorEpisodio.mockReturnValue(throwError(() => new Error('fallo')));

    await inicializar();

    expect(popUps.errorDesdeBackend).toHaveBeenCalled();
  });

  it('exige descripción al guardar', async () => {
    await inicializar();

    component.diagnostico = '   ';
    component.guardarDiagnostico();

    expect(servicio.postDiagnostico).not.toHaveBeenCalled();
    expect(popUps.error).toHaveBeenCalled();
  });
});
