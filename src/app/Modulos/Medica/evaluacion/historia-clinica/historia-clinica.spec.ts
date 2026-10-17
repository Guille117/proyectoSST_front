import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError, TimeoutError } from 'rxjs';

import { HistoriaClinica } from './historia-clinica';
import { HistoriaClinicaService } from '../evaluacion/data/historia-clinica-service';
import { EPISODIO_ID_TEMPORAL } from '../evaluacion/data/constantes-clinicas';
import { HistoriaClinicaResponse } from '../evaluacion/data/historiaClinicaInterfaz';
import { AuthService } from '../../Auth/data/auth-service';
import { PopUps } from '../../../shared/popUps/popUpsService';

describe('HistoriaClinica', () => {
  let component: HistoriaClinica;
  let fixture: ComponentFixture<HistoriaClinica>;

  const servicio = {
    getHistoriasPorEpisodio: vi.fn(),
    getHistoriasPorEstado: vi.fn(),
    getHistoriaPorId: vi.fn(),
    postHistoria: vi.fn(),
    putHistoria: vi.fn(),
    cambiarEstado: vi.fn(),
  };
  const auth = { currentUser: vi.fn() };
  const popUps = { exito: vi.fn(), error: vi.fn(), errorDesdeBackend: vi.fn() };

  const historia = (id: number, descripcion: string): HistoriaClinicaResponse => ({
    id,
    descripcion,
    episodioId: EPISODIO_ID_TEMPORAL,
    usuarioId: 2,
    usuarioNombre: 'Carlos Mendez',
    fecha: '2026-10-16T09:30:00',
    estado: true,
  });

  beforeEach(async () => {
    vi.resetAllMocks();
    servicio.getHistoriasPorEpisodio.mockReturnValue(of([]));
    servicio.postHistoria.mockReturnValue(of(historia(10, 'Paciente estable')));
    servicio.putHistoria.mockReturnValue(of(historia(7, 'Paciente en observacion')));
    auth.currentUser.mockReturnValue({ id: 2 });

    await TestBed.configureTestingModule({
      imports: [HistoriaClinica],
      providers: [
        { provide: HistoriaClinicaService, useValue: servicio },
        { provide: AuthService, useValue: auth },
        { provide: PopUps, useValue: popUps },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HistoriaClinica);
    component = fixture.componentInstance;
  });

  const render = async (): Promise<void> => {
    fixture.detectChanges();
    await fixture.whenStable();
  };

  const elemento = <T extends Element>(selector: string): T =>
    fixture.nativeElement.querySelector(selector);

  // Selectores semánticos: los botones usan las clases globales de src/styles/botonesStyle.scss
  const campo = (): HTMLTextAreaElement => elemento<HTMLTextAreaElement>('.historia-campo');
  const botonEditar = (): HTMLButtonElement | null =>
    elemento<HTMLButtonElement>('.historia-acciones ._editar');
  const botonCancelar = (): HTMLButtonElement | null =>
    elemento<HTMLButtonElement>('.historia-acciones ._cancelar');
  const botonGuardar = (): HTMLButtonElement =>
    elemento<HTMLButtonElement>('.historia-acciones button[type="submit"]');

  const escribir = async (texto: string): Promise<void> => {
    campo().value = texto;
    campo().dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };

  /** Pulsa "Editar" fallando de forma explícita si el botón no está disponible. */
  const pulsarEditar = async (): Promise<void> => {
    const boton = botonEditar();
    if (!boton) throw new Error('El botón "Editar" no está disponible en la vista');
    boton.click();
    await fixture.whenStable();
  };

  it('should create', async () => {
    await render();

    expect(component).toBeTruthy();
    expect(servicio.getHistoriasPorEpisodio).toHaveBeenCalledExactlyOnceWith(
      EPISODIO_ID_TEMPORAL,
      true,
    );
  });

  it('ubica las acciones del cuadro en la fila compartida y con los estilos globales', async () => {
    servicio.getHistoriasPorEpisodio.mockReturnValue(of([historia(7, 'Control')]));

    await render();

    const acciones = elemento<HTMLElement>('.historia-acciones');
    expect(acciones.classList.contains('acciones-formulario')).toBe(true);
    expect(botonEditar()?.classList.contains('_editar')).toBe(true);
    expect(botonGuardar().classList.contains('_guardar')).toBe(true);
  });

  it('abre la pantalla con la historia vigente en modo lectura y el botón Editar disponible', async () => {
    servicio.getHistoriasPorEpisodio.mockReturnValue(
      of([historia(7, 'Control'), historia(10, 'Paciente estable')]),
    );

    await render();

    expect(component.historiaClinica).toBe('Paciente estable');
    expect(component.idHistoriaActual).toBe(10);
    expect(component.modoEdicion).toBe(false);
    expect(campo().value).toBe('Paciente estable');
    expect(campo().readOnly).toBe(true);
    expect(campo().classList.contains('historia-campo--lectura')).toBe(true);
    expect(botonEditar()).not.toBeNull();
    expect(botonEditar()?.disabled).toBe(false);
    expect(botonCancelar()).toBeNull();
    expect(botonGuardar().disabled).toBe(true);
  });

  it('permite escribir directamente y oculta Editar cuando el episodio no tiene historia', async () => {
    await render();

    expect(component.historiaClinica).toBe('');
    expect(component.idHistoriaActual).toBeNull();
    expect(component.modoEdicion).toBe(true);
    expect(campo().value).toBe('');
    expect(campo().readOnly).toBe(false);
    expect(campo().classList.contains('historia-campo--lectura')).toBe(false);
    expect(botonEditar()).toBeNull();
    expect(botonCancelar()).toBeNull();
    expect(botonGuardar().disabled).toBe(false);
  });

  it('habilita la escritura, oculta Editar y muestra Cancelar al pulsar Editar', async () => {
    servicio.getHistoriasPorEpisodio.mockReturnValue(of([historia(7, 'Control')]));

    await render();
    await pulsarEditar();

    expect(component.modoEdicion).toBe(true);
    expect(campo().readOnly).toBe(false);
    expect(campo().classList.contains('historia-campo--lectura')).toBe(false);
    expect(botonEditar()).toBeNull();
    expect(botonCancelar()).not.toBeNull();
    expect(botonCancelar()?.classList.contains('_cancelar')).toBe(true);
    expect(botonCancelar()?.disabled).toBe(false);
    expect(botonGuardar().disabled).toBe(false);
  });

  it('descarta los cambios y vuelve al estado inicial al pulsar Cancelar', async () => {
    servicio.getHistoriasPorEpisodio.mockReturnValue(of([historia(7, 'Control')]));

    await render();
    await pulsarEditar();
    await escribir('Texto sin guardar');

    botonCancelar()?.click();
    await fixture.whenStable();

    expect(component.historiaClinica).toBe('Control');
    expect(component.modoEdicion).toBe(false);
    expect(campo().value).toBe('Control');
    expect(campo().readOnly).toBe(true);
    expect(botonEditar()).not.toBeNull();
    expect(botonCancelar()).toBeNull();
    expect(servicio.postHistoria).not.toHaveBeenCalled();
    expect(servicio.putHistoria).not.toHaveBeenCalled();
    expect(popUps.error).not.toHaveBeenCalled();
  });

  it('crea la historia clínica del episodio cuando no existía', async () => {
    await render();
    await escribir('Paciente estable');

    botonGuardar().click();
    await fixture.whenStable();

    expect(servicio.postHistoria).toHaveBeenCalledExactlyOnceWith({
      descripcion: 'Paciente estable',
      episodioId: EPISODIO_ID_TEMPORAL,
      usuarioId: 2,
    });
    expect(servicio.putHistoria).not.toHaveBeenCalled();
    expect(component.idHistoriaActual).toBe(10);
    expect(component.modoEdicion).toBe(false);
    expect(botonEditar()).not.toBeNull();
    expect(botonCancelar()).toBeNull();
    expect(campo().readOnly).toBe(true);
    expect(popUps.exito).toHaveBeenCalled();
  });

  it('actualiza la historia vigente cuando ya existe', async () => {
    servicio.getHistoriasPorEpisodio.mockReturnValue(of([historia(7, 'Control')]));

    await render();
    await pulsarEditar();
    await escribir('Paciente en observacion');

    botonGuardar().click();
    await fixture.whenStable();

    expect(servicio.putHistoria).toHaveBeenCalledExactlyOnceWith(7, {
      descripcion: 'Paciente en observacion',
      episodioId: EPISODIO_ID_TEMPORAL,
      usuarioId: 2,
    });
    expect(servicio.postHistoria).not.toHaveBeenCalled();
    expect(component.idHistoriaActual).toBe(7);
    expect(popUps.exito).toHaveBeenCalled();
  });

  it('no guarda una descripción vacía y avisa al usuario', async () => {
    await render();
    await escribir('   ');

    botonGuardar().click();
    await fixture.whenStable();

    expect(servicio.postHistoria).not.toHaveBeenCalled();
    expect(servicio.putHistoria).not.toHaveBeenCalled();
    expect(popUps.error).toHaveBeenCalled();
  });

  it('avisa cuando no se puede identificar al usuario de la sesión', async () => {
    auth.currentUser.mockReturnValue(null);

    await render();
    await escribir('Paciente estable');

    botonGuardar().click();
    await fixture.whenStable();

    expect(servicio.postHistoria).not.toHaveBeenCalled();
    expect(servicio.putHistoria).not.toHaveBeenCalled();
    expect(popUps.error).toHaveBeenCalled();
  });

  it('conserva lo escrito y la edición cuando el guardado falla', async () => {
    servicio.postHistoria.mockReturnValue(throwError(() => new Error('fallo')));

    await render();
    await escribir('Paciente estable');

    botonGuardar().click();
    await fixture.whenStable();

    expect(component.modoEdicion).toBe(true);
    expect(campo().value).toBe('Paciente estable');
    expect(campo().readOnly).toBe(false);
    expect(popUps.errorDesdeBackend).toHaveBeenCalled();
    expect(popUps.exito).not.toHaveBeenCalled();
  });

  it('informa de forma específica cuando el servidor no responde a tiempo', async () => {
    servicio.postHistoria.mockReturnValue(throwError(() => new TimeoutError()));

    await render();
    await escribir('Paciente estable');

    botonGuardar().click();
    await fixture.whenStable();

    expect(popUps.error).toHaveBeenCalledWith(
      'Error de comunicación. El servidor no respondió dentro del tiempo esperado.',
    );
    expect(popUps.errorDesdeBackend).not.toHaveBeenCalled();
  });
});
