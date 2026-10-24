import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { SignosVitalesService } from '../../Enfermeria/monitoreo/data/signos-vitales-service';
import { SignosVitalesResponse } from '../../Enfermeria/monitoreo/data/signosVitalesInterfaz';
import { PacienteDetalle } from '../../Pacientes/paciente/data/pacienteInterfaz';
import { PacienteService } from '../../Pacientes/paciente/data/paciente-service';
import { EpisodioActivoService } from '../data/episodio-activo-service';
import { DatosPaciente } from './datos-paciente';

describe('DatosPaciente', () => {
  let component: DatosPaciente;
  let fixture: ComponentFixture<DatosPaciente>;

  const detalle: PacienteDetalle = {
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
    descripcion: 'Dolor abdominal y vómitos',
    fechaHoraIngreso: '2026-10-10T08:30:00',
    medicoId: 5,
    medicoNombre: 'Dr. Juan Pérez',
    camaId: 70,
    camaCodigo: 'A-105',
    responsable: null,
    referencia: null,
    alergias: [{ id: 2, nombre: 'Penicilina' }],
    enfermedades: [{ id: 1, nombre: 'Diabetes' }],
  };

  const signo: SignosVitalesResponse = {
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

  const episodioActivo = {
    obtener: vi.fn(() => 101 as number | null),
    pacienteId: vi.fn(() => 1 as number | null),
    guardarPaciente: vi.fn(),
    guardar: vi.fn(),
    limpiar: vi.fn(),
    esSoloLectura: vi.fn(() => false),
  };

  const servicioPaciente = {
    obtenerPaciente: vi.fn(() => of(detalle)),
    listarPacientes: vi.fn(() => of([])),
  };

  const servicioSignos = {
    buscarPorEpisodio: vi.fn(() => of([signo])),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    episodioActivo.obtener.mockReturnValue(101);
    episodioActivo.pacienteId.mockReturnValue(1);
    servicioPaciente.obtenerPaciente.mockReturnValue(of(detalle));
    servicioPaciente.listarPacientes.mockReturnValue(of([]));
    servicioSignos.buscarPorEpisodio.mockReturnValue(of([signo]));

    await TestBed.configureTestingModule({
      imports: [DatosPaciente],
      providers: [
        { provide: EpisodioActivoService, useValue: episodioActivo },
        { provide: PacienteService, useValue: servicioPaciente },
        { provide: SignosVitalesService, useValue: servicioSignos },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DatosPaciente);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  const elementos = <T extends Element>(selector: string): NodeListOf<T> =>
    fixture.nativeElement.querySelectorAll(selector);

  const elemento = <T extends Element>(selector: string): T =>
    fixture.nativeElement.querySelector(selector);

  const pestana = (): HTMLButtonElement => elemento<HTMLButtonElement>('.ficha-pestana');

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('muestra los datos reales del paciente y de la atención', () => {
    expect(servicioPaciente.obtenerPaciente).toHaveBeenCalledWith(1);
    expect(servicioSignos.buscarPorEpisodio).toHaveBeenCalledWith(101);

    expect(elemento<HTMLElement>('.ficha-paciente-nombre').textContent).toContain('Juan Pérez');
    expect(elemento<HTMLElement>('.ficha-paciente-meta').textContent).toContain('EXP-001');
    expect(elementos<HTMLElement>('.ficha-ingreso-datos .ficha-dato').length).toBe(3);
    expect(elemento<HTMLElement>('.ficha-motivo').textContent).toContain(
      'Dolor abdominal y vómitos',
    );
    expect(elemento<HTMLElement>('.ficha-lista').textContent).toContain('Penicilina');
    expect(elementos<HTMLElement>('.ficha-signos .ficha-dato').length).toBe(4);
    expect(elemento<HTMLElement>('.ficha-signos').textContent).toContain('120/80');
  });

  it('en su forma fija muestra el bloque siempre desplegado, sin controles para plegarlo', () => {
    expect(elemento<HTMLElement>('.ficha')).not.toBeNull();
    expect(elemento<HTMLElement>('.ficha--plegable')).toBeNull();
    expect(elemento<HTMLElement>('.ficha-pestana')).toBeNull();
    expect(elemento<HTMLElement>('.ficha-plegar')).toBeNull();
    expect(elemento<HTMLButtonElement>('.ficha button')).toBeNull();
  });

  it('abre y cierra el bloque desde la pestaña lateral cuando es plegable', () => {
    fixture.componentRef.setInput('plegable', true);
    fixture.componentRef.setInput('abierto', false);
    fixture.detectChanges();

    expect(elemento<HTMLElement>('.ficha')).toBeNull();
    expect(pestana().getAttribute('aria-expanded')).toBe('false');
    expect(pestana().querySelector('.ficha-pestana_texto')?.textContent).toContain(
      'Ver datos del paciente',
    );

    const cambios: boolean[] = [];
    component.abiertoCambia.subscribe((abierto) => cambios.push(abierto));

    pestana().click();

    expect(cambios).toEqual([true]);

    fixture.componentRef.setInput('abierto', true);
    fixture.detectChanges();

    expect(elemento<HTMLElement>('.ficha')).not.toBeNull();
    expect(elemento<HTMLElement>('.ficha--plegable')).not.toBeNull();
    expect(pestana().getAttribute('aria-expanded')).toBe('true');
    expect(pestana().querySelector('i')?.classList.contains('bi-chevron-right')).toBe(true);
    expect(elemento<HTMLElement>('.ficha-pestana_texto')).toBeNull();
  });

  it('mantiene el cuerpo desplegado en su forma fija aunque se pida plegarlo', () => {
    fixture.componentRef.setInput('cuerpoVisible', false);
    fixture.detectChanges();

    expect(elemento<HTMLElement>('.ficha-cuerpo').classList.contains('ficha-cuerpo--plegado')).toBe(
      false,
    );
    expect(elemento<HTMLElement>('.ficha-plegar')).toBeNull();
  });

  it('avisa cuando no hay un episodio activo', async () => {
    episodioActivo.obtener.mockReturnValue(null);

    const sinEpisodio = TestBed.createComponent(DatosPaciente);
    sinEpisodio.detectChanges();
    await sinEpisodio.whenStable();

    expect(sinEpisodio.nativeElement.textContent).toContain('No hay un episodio activo');
  });
});
