import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AltaService } from '../../../Medica/alta/data/alta-service';
import { DiagnosticoService } from '../../../Medica/evaluacion/data/diagnostico-service';
import { ExamenFisicoService } from '../../../Medica/evaluacion/data/examen-fisico-service';
import { HistoriaClinicaService } from '../../../Medica/evaluacion/data/historia-clinica-service';
import { EvolucionService } from '../../../Medica/evolucion/data/evolucion-service';
import { IndicacionCuidadoService } from '../../../Medica/indicaciones/cuidados/data/cuidado-service';
import { IndicacionExamenService } from '../../../Medica/indicaciones/examenes/data/examen-service';
import { MedicamentoIndicacionService } from '../../../Medica/indicaciones/medicamentos/data/medicamento-service';
import { ProcedimientoMedicoService } from '../../../Medica/procedimiento-medico/data/procedimiento-medico-service';
import { RegistrosEnfermeriaService } from '../../../Enfermeria/data/registrosEnfermeriaService';
import { ControlHidricoService } from '../../../Enfermeria/monitoreo/data/control-hidrico-service';
import { GlucosaService } from '../../../Enfermeria/monitoreo/data/glucosa-service';
import { SignosVitalesService } from '../../../Enfermeria/monitoreo/data/signos-vitales-service';
import { NotaEnfermeriaService } from '../../../Enfermeria/notas/data/nota-enfermeria-service';
import { ConsumoEpisodioService } from '../../paciente/data/consumo-service';
import { ConsumoEpisodio } from '../../paciente/data/consumoInterfaz';
import { PacienteDetalle } from '../../paciente/data/pacienteInterfaz';
import { EpisodioResumen, SeccionExpediente } from '../data/expedienteInterfaz';
import { ResumenEpisodio } from './resumen-episodio';

describe('ResumenEpisodio', () => {
  let fixture: ComponentFixture<ResumenEpisodio>;

  const paciente: PacienteDetalle = {
    pacienteId: 3,
    codigoExpediente: 'EXP-003',
    nombreCompleto: 'Ana López',
    nombres: 'Ana',
    apellidos: 'López',
    cui: '1234567890123',
    fechaNacimiento: '1990-01-01',
    edad: 36,
    sexo: 'FEMENINO',
    telefono: null,
    email: null,
    estadoCivil: null,
    direccion: null,
    ocupacion: null,
    estado: true,
    episodioId: 7,
    tipoAtencion: 'HOSPITALIZACION',
    descripcion: 'Ingreso',
    fechaHoraIngreso: '2026-10-20T08:00:00',
    medicoId: 5,
    medicoNombre: 'Dr. Juan Pérez',
    camaId: 11,
    camaCodigo: 'A-106',
    responsable: null,
    referencia: null,
    alergias: [{ id: 1, nombre: 'Penicilina' }],
    enfermedades: [{ id: 2, nombre: 'Diabetes' }],
  };

  const episodio: EpisodioResumen = {
    episodioId: 7,
    tipoAtencion: 'HOSPITALIZACION',
    fechaHoraIngreso: '2026-10-20T08:00:00',
    fechaHoraEgreso: null,
    medicoNombre: 'Dr. Juan Pérez',
    activo: true,
  };

  const consumo: ConsumoEpisodio = {
    episodioId: 7,
    items: [
      {
        tipo: 'Cama',
        nombre: 'Cama A-106',
        detalle: 'Habitación 101',
        cantidad: 2,
        unidad: 'días',
        precioUnitario: 250,
        subtotal: 500,
      },
      {
        tipo: 'Medicamento',
        nombre: 'Paracetamol',
        detalle: null,
        cantidad: 8,
        unidad: 'unidades',
        precioUnitario: 1.5,
        subtotal: 12,
      },
    ],
    total: 512,
  };

  const servicioHistoria = {
    getHistoriasPorEpisodio: vi.fn(() =>
      of([
        {
          id: 1,
          descripcion: 'Historia de prueba',
          episodioId: 7,
          usuarioId: 5,
          usuarioNombre: 'Dr. Juan Pérez',
          fecha: '2026-10-20T09:00:00',
          estado: true,
        },
      ]),
    ),
  };

  const servicioSignos = {
    buscarPorEpisodio: vi.fn(() =>
      of([
        {
          id: 1,
          sistolica: 120,
          diastolica: 80,
          frecuenciaCardiaca: 70,
          frecuenciaRespiratoria: 18,
          temperatura: 36.5,
          saturacion: 98,
          observacion: 'Signo eliminado',
          episodioId: 7,
          usuarioId: 5,
          usuarioNombre: 'Enf. Rosa',
          fecha: '2026-10-20T10:00:00',
          eliminado: true,
        },
        {
          id: 2,
          sistolica: 118,
          diastolica: 78,
          frecuenciaCardiaca: 72,
          frecuenciaRespiratoria: 18,
          temperatura: 36.6,
          saturacion: 98,
          observacion: 'Control vigente',
          episodioId: 7,
          usuarioId: 5,
          usuarioNombre: 'Enf. Rosa',
          fecha: '2026-10-20T12:00:00',
          eliminado: false,
        },
      ]),
    ),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ResumenEpisodio],
      providers: [
        { provide: HistoriaClinicaService, useValue: servicioHistoria },
        { provide: ExamenFisicoService, useValue: { getExamenesPorEpisodio: vi.fn(() => of([])) } },
        {
          provide: DiagnosticoService,
          useValue: { getDiagnosticosPorEpisodio: vi.fn(() => of([])) },
        },
        { provide: EvolucionService, useValue: { buscarPorEpisodio: vi.fn(() => of([])) } },
        {
          provide: MedicamentoIndicacionService,
          useValue: { getIndicacionesPorEpisodio: vi.fn(() => of([])) },
        },
        { provide: IndicacionCuidadoService, useValue: { buscarPorEpisodio: vi.fn(() => of([])) } },
        { provide: IndicacionExamenService, useValue: { buscarPorEpisodio: vi.fn(() => of([])) } },
        {
          provide: ProcedimientoMedicoService,
          useValue: { getProcedimientos: vi.fn(() => of([])) },
        },
        { provide: AltaService, useValue: { buscarPorEpisodio: vi.fn(() => of([])) } },
        { provide: SignosVitalesService, useValue: servicioSignos },
        { provide: ControlHidricoService, useValue: { buscarPorEpisodio: vi.fn(() => of([])) } },
        { provide: GlucosaService, useValue: { buscarPorEpisodio: vi.fn(() => of([])) } },
        { provide: NotaEnfermeriaService, useValue: { buscarPorEpisodio: vi.fn(() => of([])) } },
        {
          provide: RegistrosEnfermeriaService,
          useValue: {
            buscarAplicacionesPorEpisodio: vi.fn(() => of([])),
            buscarEjecucionesPorEpisodio: vi.fn(() => of([])),
          },
        },
        { provide: ConsumoEpisodioService, useValue: { obtenerConsumo: vi.fn(() => of(consumo)) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ResumenEpisodio);
  });

  const render = async (seccion: SeccionExpediente = 'resumen'): Promise<void> => {
    fixture.componentRef.setInput('paciente', paciente);
    fixture.componentRef.setInput('episodio', episodio);
    fixture.componentRef.setInput('episodioId', 7);
    fixture.componentRef.setInput('seccion', seccion);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  it('separa la información médica, enfermería y consumo', async () => {
    await render();

    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('Información médica');
    expect(texto).toContain('Enfermería');
    expect(texto).toContain('Consumo y estancia');
    expect(texto).toContain('Historia de prueba');
    expect(texto).toContain('Q 512.00');
  });

  it('excluye los registros de enfermería eliminados', async () => {
    await render();

    const texto = fixture.nativeElement.textContent as string;
    expect(texto).not.toContain('Signo eliminado');
    expect(texto).toContain('Control vigente');
  });

  it('muestra solo la evaluación clínica en su sección', async () => {
    await render('evaluacion');

    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('Historia clínica');
    expect(texto).toContain('Examen físico');
    expect(texto).toContain('Diagnósticos');
    expect(texto).toContain('Historia de prueba');
    expect(texto).not.toContain('Alta médica');
    expect(texto).not.toContain('Consumo y estancia');
  });

  it('muestra solo las indicaciones médicas en su sección', async () => {
    await render('indicaciones');

    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('Indicaciones médicas');
    expect(texto).toContain('Medicamentos');
    expect(texto).toContain('Cuidados');
    expect(texto).not.toContain('Historia de prueba');
    expect(texto).not.toContain('Exámenes');
  });

  it('muestra solo los exámenes en su sección', async () => {
    await render('examenes');

    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('Exámenes');
    expect(texto).not.toContain('Historia de prueba');
    expect(texto).not.toContain('Medicamentos');
    expect(texto).not.toContain('Alta médica');
  });

  it('muestra solo los procedimientos en su sección', async () => {
    await render('procedimientos');

    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('Procedimientos');
    expect(texto).toContain('Sin procedimientos registrados.');
    expect(texto).not.toContain('Historia de prueba');
  });

  it('muestra solo la evolución médica en su sección', async () => {
    await render('evolucion');

    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('Evolución médica');
    expect(texto).toContain('Sin evoluciones registradas.');
    expect(texto).not.toContain('Historia de prueba');
  });

  it('muestra solo el alta médica en su sección', async () => {
    await render('alta');

    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('Alta médica');
    expect(texto).toContain('Sin alta médica vigente.');
    expect(texto).not.toContain('Historia de prueba');
    expect(texto).not.toContain('Consumo y estancia');
  });

  it('muestra solo los registros de enfermería en su sección', async () => {
    await render('registros-enfermeria');

    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('Signos vitales');
    expect(texto).toContain('Control vigente');
    expect(texto).not.toContain('Historia de prueba');
    expect(texto).not.toContain('Consumo y estancia');
  });

  it('muestra solo el consumo y estancia en su sección', async () => {
    await render('consumo');

    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('Consumo y estancia');
    expect(texto).toContain('Q 512.00');
    expect(texto).not.toContain('Historia de prueba');
    expect(texto).not.toContain('Alta médica');
  });
});
