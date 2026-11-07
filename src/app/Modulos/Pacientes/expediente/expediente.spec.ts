import { Location } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { delay, of } from 'rxjs';
import { SignosVitalesService } from '../../Enfermeria/monitoreo/data/signos-vitales-service';
import { ControlHidricoService } from '../../Enfermeria/monitoreo/data/control-hidrico-service';
import { GlucosaService } from '../../Enfermeria/monitoreo/data/glucosa-service';
import { NotaEnfermeriaService } from '../../Enfermeria/notas/data/nota-enfermeria-service';
import { RegistrosEnfermeriaService } from '../../Enfermeria/data/registrosEnfermeriaService';
import { AltaService } from '../../Medica/alta/data/alta-service';
import { DiagnosticoService } from '../../Medica/evaluacion/data/diagnostico-service';
import { ExamenFisicoService } from '../../Medica/evaluacion/data/examen-fisico-service';
import { HistoriaClinicaService } from '../../Medica/evaluacion/data/historia-clinica-service';
import { EvolucionService } from '../../Medica/evolucion/data/evolucion-service';
import { IndicacionCuidadoService } from '../../Medica/indicaciones/cuidados/data/cuidado-service';
import { IndicacionExamenService } from '../../Medica/indicaciones/examenes/data/examen-service';
import { MedicamentoIndicacionService } from '../../Medica/indicaciones/medicamentos/data/medicamento-service';
import { ProcedimientoMedicoService } from '../../Medica/procedimiento-medico/data/procedimiento-medico-service';
import { ConsumoEpisodioService } from '../paciente/data/consumo-service';
import { PacienteDetalle } from '../paciente/data/pacienteInterfaz';
import { PacienteService } from '../paciente/data/paciente-service';
import { ExpedienteService } from './data/expediente-service';
import { Expediente } from './expediente';

describe('Expediente', () => {
  let fixture: ComponentFixture<Expediente>;
  let component: Expediente;

  const paciente = {
    pacienteId: 3,
    codigoExpediente: 'EXP-003',
    nombreCompleto: 'Ana López',
    cui: '1234567890123',
    edad: 36,
    sexo: 'FEMENINO',
    telefono: null,
    estado: true,
    episodioId: null,
    tipoAtencion: null,
    descripcion: null,
    fechaHoraIngreso: null,
    medicoNombre: null,
    camaCodigo: null,
    responsable: null,
    alergias: [],
    enfermedades: [],
  } as unknown as PacienteDetalle;

  const servicioPaciente = { obtenerPaciente: vi.fn(() => of(paciente)) };
  const servicioExpediente = { listarEpisodios: vi.fn(() => of([])) };
  const servicioSignos = { buscarPorEpisodio: vi.fn(() => of([])) };
  const servicioHistoria = { getHistoriasPorEpisodio: vi.fn(() => of([])) };
  const servicioExamenFisico = { getExamenesPorEpisodio: vi.fn(() => of([])) };
  const servicioDiagnostico = { getDiagnosticosPorEpisodio: vi.fn(() => of([])) };
  const servicioExamen = { buscarPorEpisodio: vi.fn(() => of([])) };
  const servicioProcedimiento = { getProcedimientos: vi.fn(() => of([])) };
  const servicioEvolucion = { buscarPorEpisodio: vi.fn(() => of([])) };
  const servicioMedicamento = { getIndicacionesPorEpisodio: vi.fn(() => of([])) };
  const servicioCuidado = { buscarPorEpisodio: vi.fn(() => of([])) };
  const servicioAlta = { buscarPorEpisodio: vi.fn(() => of([])) };
  const servicioGlucosa = { buscarPorEpisodio: vi.fn(() => of([])) };
  const servicioControl = { buscarPorEpisodio: vi.fn(() => of([])) };
  const servicioNotas = { buscarPorEpisodio: vi.fn(() => of([])) };
  const servicioRegistros = {
    buscarAplicacionesPorEpisodio: vi.fn(() => of([])),
    buscarEjecucionesPorEpisodio: vi.fn(() => of([])),
  };
  const servicioConsumo = { obtenerConsumo: vi.fn(() => of(null)) };
  const location = { back: vi.fn() };
  const route = {
    snapshot: { paramMap: { get: (clave: string) => (clave === 'pacienteId' ? '3' : null) } },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    servicioPaciente.obtenerPaciente.mockReturnValue(of(paciente).pipe(delay(0)));
    servicioExpediente.listarEpisodios.mockReturnValue(of([]).pipe(delay(0)));
    servicioSignos.buscarPorEpisodio.mockReturnValue(of([]).pipe(delay(0)));
    servicioHistoria.getHistoriasPorEpisodio.mockReturnValue(of([]).pipe(delay(0)));
    servicioExamenFisico.getExamenesPorEpisodio.mockReturnValue(of([]).pipe(delay(0)));
    servicioDiagnostico.getDiagnosticosPorEpisodio.mockReturnValue(of([]).pipe(delay(0)));
    servicioExamen.buscarPorEpisodio.mockReturnValue(of([]).pipe(delay(0)));
    servicioProcedimiento.getProcedimientos.mockReturnValue(of([]).pipe(delay(0)));
    servicioEvolucion.buscarPorEpisodio.mockReturnValue(of([]).pipe(delay(0)));
    servicioMedicamento.getIndicacionesPorEpisodio.mockReturnValue(of([]).pipe(delay(0)));
    servicioCuidado.buscarPorEpisodio.mockReturnValue(of([]).pipe(delay(0)));
    servicioAlta.buscarPorEpisodio.mockReturnValue(of([]).pipe(delay(0)));
    servicioGlucosa.buscarPorEpisodio.mockReturnValue(of([]).pipe(delay(0)));
    servicioControl.buscarPorEpisodio.mockReturnValue(of([]).pipe(delay(0)));
    servicioNotas.buscarPorEpisodio.mockReturnValue(of([]).pipe(delay(0)));
    servicioRegistros.buscarAplicacionesPorEpisodio.mockReturnValue(of([]).pipe(delay(0)));
    servicioRegistros.buscarEjecucionesPorEpisodio.mockReturnValue(of([]).pipe(delay(0)));
    servicioConsumo.obtenerConsumo.mockReturnValue(of(null).pipe(delay(0)));

    await TestBed.configureTestingModule({
      imports: [Expediente],
      providers: [
        { provide: PacienteService, useValue: servicioPaciente },
        { provide: ExpedienteService, useValue: servicioExpediente },
        { provide: SignosVitalesService, useValue: servicioSignos },
        { provide: HistoriaClinicaService, useValue: servicioHistoria },
        { provide: ExamenFisicoService, useValue: servicioExamenFisico },
        { provide: DiagnosticoService, useValue: servicioDiagnostico },
        { provide: IndicacionExamenService, useValue: servicioExamen },
        { provide: ProcedimientoMedicoService, useValue: servicioProcedimiento },
        { provide: EvolucionService, useValue: servicioEvolucion },
        { provide: MedicamentoIndicacionService, useValue: servicioMedicamento },
        { provide: IndicacionCuidadoService, useValue: servicioCuidado },
        { provide: AltaService, useValue: servicioAlta },
        { provide: GlucosaService, useValue: servicioGlucosa },
        { provide: ControlHidricoService, useValue: servicioControl },
        { provide: NotaEnfermeriaService, useValue: servicioNotas },
        { provide: RegistrosEnfermeriaService, useValue: servicioRegistros },
        { provide: ConsumoEpisodioService, useValue: servicioConsumo },
        { provide: Location, useValue: location },
        { provide: ActivatedRoute, useValue: route },
        { provide: Router, useValue: { navigate: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Expediente);
    component = fixture.componentInstance;
  });

  it('muestra el paciente y el estado vacío cuando no tiene episodios', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();

    expect(servicioPaciente.obtenerPaciente).toHaveBeenCalledWith(3);
    expect(servicioExpediente.listarEpisodios).toHaveBeenCalledWith(3);

    const texto = fixture.nativeElement.textContent as string;
    expect(texto).toContain('Ana López');
    expect(texto).toContain('El paciente no tiene episodios registrados.');
  });

  it('vuelve a la pantalla anterior', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();

    const boton = fixture.nativeElement.querySelector(
      '.menu-opcion--volver',
    ) as HTMLButtonElement;
    boton.click();

    expect(location.back).toHaveBeenCalled();
  });

  it('cambia la opción activa del submenú', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();

    const opciones = Array.from(
      fixture.nativeElement.querySelectorAll('.menu-opcion'),
    ) as HTMLButtonElement[];
    const consumo = opciones.find((opcion) =>
      opcion.textContent?.includes('Consumo y estancia'),
    );

    expect(consumo).toBeTruthy();
    consumo!.click();
    fixture.detectChanges();

    expect(component.opcionActiva).toBe('consumo');
  });
});
