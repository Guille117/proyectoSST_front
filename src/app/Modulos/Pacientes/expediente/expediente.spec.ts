import { Location } from '@angular/common';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { delay, of } from 'rxjs';
import { PacienteDetalle } from '../paciente/data/pacienteInterfaz';
import { PacienteService } from '../paciente/data/paciente-service';
import { ExpedienteService } from './data/expediente-service';
import { Expediente } from './expediente';

describe('Expediente', () => {
  let fixture: ComponentFixture<Expediente>;

  const paciente = {
    pacienteId: 3,
    codigoExpediente: 'EXP-003',
    nombreCompleto: 'Ana López',
    cui: '1234567890123',
    edad: 36,
    sexo: 'FEMENINO',
  } as unknown as PacienteDetalle;

  const servicioPaciente = { obtenerPaciente: vi.fn(() => of(paciente)) };
  const servicioExpediente = { listarEpisodios: vi.fn(() => of([])) };
  const location = { back: vi.fn() };
  const route = {
    snapshot: { paramMap: { get: (clave: string) => (clave === 'pacienteId' ? '3' : null) } },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    servicioPaciente.obtenerPaciente.mockReturnValue(of(paciente).pipe(delay(0)));
    servicioExpediente.listarEpisodios.mockReturnValue(of([]).pipe(delay(0)));

    await TestBed.configureTestingModule({
      imports: [Expediente],
      providers: [
        { provide: PacienteService, useValue: servicioPaciente },
        { provide: ExpedienteService, useValue: servicioExpediente },
        { provide: Location, useValue: location },
        { provide: ActivatedRoute, useValue: route },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Expediente);
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
    expect(texto).toContain('Episodios');
    expect(texto).toContain('El paciente no tiene episodios registrados.');
  });

  it('vuelve a la pantalla anterior', () => {
    fixture.detectChanges();
    const boton = fixture.nativeElement.querySelector(
      '.expediente-cabecera button',
    ) as HTMLButtonElement;
    boton.click();

    expect(location.back).toHaveBeenCalled();
  });
});
