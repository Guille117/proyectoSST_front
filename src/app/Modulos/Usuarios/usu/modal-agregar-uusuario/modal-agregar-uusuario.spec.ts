import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { environment } from '../../../../../environments/environment';
import { ModalService } from '../../../../modal-principal/modal-service';
import { ModalPopUps } from '../../../../shared/popUps/modal-popUpsService';
import { OpcionOtroComponent } from '../../../../shared/opcion-otro/opcion-otro';

import { ModalAgregarUusuario } from './modal-agregar-uusuario';

describe('ModalAgregarUusuario', () => {
  let component: ModalAgregarUusuario;
  let fixture: ComponentFixture<ModalAgregarUusuario>;
  let httpMock: HttpTestingController;
  const modalService = { close: vi.fn() };
  const modalPopUps = {
    confirmarToast: vi.fn(async () => true),
    exito: vi.fn(),
    error: vi.fn(),
    errorDesdeBackend: vi.fn(),
    formIncompleto: vi.fn(),
    usuarioCreado: vi.fn(async () => {}),
  };

  beforeEach(async () => {
    modalService.close.mockClear();
    modalPopUps.confirmarToast.mockReset();
    modalPopUps.confirmarToast.mockResolvedValue(true);
    modalPopUps.exito.mockReset();
    modalPopUps.error.mockReset();
    modalPopUps.errorDesdeBackend.mockReset();
    modalPopUps.formIncompleto.mockReset();
    modalPopUps.usuarioCreado.mockReset();
    modalPopUps.usuarioCreado.mockResolvedValue(undefined);

    await TestBed.configureTestingModule({
      imports: [ModalAgregarUusuario],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ModalService, useValue: modalService },
        { provide: ModalPopUps, useValue: modalPopUps },
      ],
    }).compileComponents();

    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ModalAgregarUusuario);
    component = fixture.componentInstance;
    fixture.detectChanges();

    httpMock.expectOne(`${environment.apiUrl}/puestos?activos=true`).flush([
      { id: 5, codigo: 'P-5', nombre: 'Médico general', estado: true },
    ]);
    for (const recurso of ['horarios', 'roles', 'especialidades']) {
      httpMock.expectOne(`${environment.apiUrl}/${recurso}?activos=true`).flush([]);
    }

    await fixture.whenStable();
  });

  afterEach(() => {
    httpMock.verify();
  });

  function prepararPaso2(puestoId: number, especialidadId = 0): void {
    component.contador = 1;
    component.persona = {
      cui: '1234567890123',
      nombres: 'Ana',
      apellidos: 'Lopez',
      sexo: 'FEMENINO',
      fechaNacimiento: '1990-01-01',
      telefono: '12345678',
      email: '',
    };
    component.usuarioReq = {
      puestoId,
      horarioId: 1,
      rolIds: [1],
      username: 'ana',
      especialidadId,
      estado: true,
    };
    fixture.detectChanges();
  }

  function abrirOtro(id: string): OpcionOtroComponent {
    const select: HTMLSelectElement = fixture.nativeElement.querySelector(`#${id}`);
    const opcionOtro = Array.from(select.options).find(
      (opcion) => opcion.textContent?.trim() === 'Otro',
    );
    select.selectedIndex = opcionOtro?.index ?? -1;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    return fixture.debugElement.query(By.css('app-opcion-otro'))
      .componentInstance as OpcionOtroComponent;
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('crea el puesto pendiente antes de guardar el usuario y usa el nuevo id', async () => {
    prepararPaso2(0);
    const otro = abrirOtro('puesto');
    otro.nombre = 'Enfermero';
    fixture.detectChanges();

    expect(component.puedeGuardarPaso2).toBe(true);
    const guardado = component.guardarUsuario();

    const crearPuesto = httpMock.expectOne(`${environment.apiUrl}/puestos`);
    expect(crearPuesto.request.method).toBe('POST');
    expect(crearPuesto.request.body).toEqual({ nombre: 'Enfermero' });
    crearPuesto.flush({ id: 9, codigo: 'P-9', nombre: 'Enfermero', estado: true });
    await fixture.whenStable();

    const guardarUsuario = httpMock.expectOne(`${environment.apiUrl}/usuarios`);
    expect(guardarUsuario.request.body.puestoId).toBe(9);
    guardarUsuario.flush({
      id: 1,
      codigo: 'U-1',
      username: 'ana',
      nombres: 'Ana',
      apellidos: 'Lopez',
      estado: true,
      pin: '1234',
    });
    await guardado;
  });

  it('crea la especialidad pendiente antes de guardar el usuario y usa el nuevo id', async () => {
    prepararPaso2(5);
    const otro = abrirOtro('especialidad');
    otro.nombre = 'Cardiología';
    fixture.detectChanges();

    expect(component.esMedico).toBe(true);
    expect(component.puedeGuardarPaso2).toBe(true);
    const guardado = component.guardarUsuario();

    const crearEspecialidad = httpMock.expectOne(`${environment.apiUrl}/especialidades`);
    expect(crearEspecialidad.request.body).toEqual({ nombre: 'Cardiología' });
    crearEspecialidad.flush({ id: 12, nombre: 'Cardiología' });
    await fixture.whenStable();

    const guardarUsuario = httpMock.expectOne(`${environment.apiUrl}/usuarios`);
    expect(guardarUsuario.request.body.especialidadId).toBe(12);
    guardarUsuario.flush({
      id: 1,
      codigo: 'U-1',
      username: 'ana',
      nombres: 'Ana',
      apellidos: 'Lopez',
      estado: true,
      pin: '1234',
    });
    await guardado;
  });

  it('no guarda el usuario si falla la creación del puesto pendiente', async () => {
    prepararPaso2(0);
    const otro = abrirOtro('puesto');
    otro.nombre = 'Enfermero';
    fixture.detectChanges();

    const guardado = component.guardarUsuario();
    httpMock
      .expectOne(`${environment.apiUrl}/puestos`)
      .flush('Error', { status: 500, statusText: 'Server Error' });
    await guardado;

    httpMock.expectNone(`${environment.apiUrl}/usuarios`);
    expect(modalPopUps.errorDesdeBackend).toHaveBeenCalled();
  });

  it('no guarda si el puesto pendiente está vacío y avisa al usuario', async () => {
    prepararPaso2(0);
    abrirOtro('puesto');

    await component.guardarUsuario();

    httpMock.expectNone(`${environment.apiUrl}/puestos`);
    httpMock.expectNone(`${environment.apiUrl}/usuarios`);
    expect(modalPopUps.formIncompleto).toHaveBeenCalledWith(
      'Completa el valor de «Puesto» o cancélalo antes de guardar.',
    );
  });

  it('oculta el horario para un médico y lo envía como null', async () => {
    prepararPaso2(5, 12);
    expect(component.esMedico).toBe(true);
    expect(component.puedeGuardarPaso2).toBe(true);

    const guardado = component.guardarUsuario();
    await fixture.whenStable();
    const guardarUsuario = httpMock.expectOne(`${environment.apiUrl}/usuarios`);
    expect(guardarUsuario.request.body.horarioId).toBeNull();
    expect(guardarUsuario.request.body.inicioGuardia).toBeNull();
    guardarUsuario.flush({
      id: 1,
      codigo: 'U-1',
      username: 'ana',
      nombres: 'Ana',
      apellidos: 'Lopez',
      estado: true,
      pin: '1234',
    });
    await guardado;
  });

  it('exige el inicio de guardia cuando el horario es rotativo', async () => {
    component.puestos = [{ id: 2, codigo: 'P-2', nombre: 'Enfermera', estado: true }];
    component.horarios = [
      {
        id: 3,
        codigo: 'HOR-03',
        nombre: 'Guardia medica',
        esRotativo: true,
        estado: true,
      },
    ];
    prepararPaso2(2);
    component.usuarioReq.horarioId = 3;

    expect(component.esGuardia).toBe(true);
    expect(component.puedeGuardarPaso2).toBe(false);

    component.usuarioReq.inicioGuardia = '2026-08-24T08:00';
    expect(component.puedeGuardarPaso2).toBe(true);

    const guardado = component.guardarUsuario();
    await fixture.whenStable();
    const guardarUsuario = httpMock.expectOne(`${environment.apiUrl}/usuarios`);
    expect(guardarUsuario.request.body.horarioId).toBe(3);
    expect(guardarUsuario.request.body.inicioGuardia).toBe('2026-08-24T08:00');
    guardarUsuario.flush({
      id: 1,
      codigo: 'U-1',
      username: 'ana',
      nombres: 'Ana',
      apellidos: 'Lopez',
      estado: true,
      pin: '1234',
    });
    await guardado;
  });
});
