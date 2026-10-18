import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ModalService } from '../../../../modal-principal/modal-service';
import { ArchivoService } from '../../../../shared/archivos/archivoService';
import { ModalPopUps } from '../../../../shared/popUps/modal-popUpsService';
import { CatalogoService } from '../../../Catalogos/data/serviceCatalogo';
import { ServicioCama } from '../../camas/data/servicioCama';
import { camaResponseSimple, EstadoCama } from '../../camas/data/interfazCama';
import { UsuarioService } from '../../../Usuarios/usu/data/usuario-service';
import { PacienteDetalle, PacienteResponse, PacienteResumido } from '../data/pacienteInterfaz';
import { PacienteService } from '../data/paciente-service';
import { ModalAgregarPaciente } from './modal-agregar-paciente';

describe('ModalAgregarPaciente', () => {
  let component: ModalAgregarPaciente;
  let fixture: ComponentFixture<ModalAgregarPaciente>;

  const cama: camaResponseSimple = {
    idCama: 70,
    codigo: 'A-106',
    estado: EstadoCama.DISPONIBLE,
    nombreHabitacion: 'Habitación 1',
    nombreTipoCama: 'Individual',
    nombreArea: 'Hospitalización',
    activo: true,
  };

  const detalle: PacienteDetalle = {
    pacienteId: 20,
    codigoExpediente: 'EXP-020',
    nombreCompleto: 'Ana María López Ruiz',
    nombres: 'Ana María',
    apellidos: 'López Ruiz',
    cui: '1234567890123',
    fechaNacimiento: '1990-01-01',
    edad: 36,
    sexo: 'FEMENINO',
    telefono: '12345678',
    email: 'ana@correo.com',
    estadoCivil: 'CASADO',
    direccion: 'Casa',
    ocupacion: 'Docente',
    estado: true,
    episodioId: 42,
    tipoAtencion: 'HOSPITALIZACION',
    descripcion: 'Ingreso',
    fechaHoraIngreso: '2026-10-10T08:30:00',
    medicoId: 5,
    medicoNombre: 'Dr. Juan Pérez',
    camaId: 70,
    camaCodigo: 'A-106',
    responsable: {
      id: 40,
      cui: '9876543210123',
      nombres: 'Rosa',
      apellidos: 'López',
      fechaNacimiento: '1970-01-01',
      sexo: 'FEMENINO',
      telefono: '87654321',
      parentescoId: 7,
      parentescoNombre: 'Madre',
      direccion: 'Casa',
    },
    referencia: {
      id: 50,
      institucionId: 8,
      institucionNombre: 'Centro de salud',
      motivoReferencia: 'Evaluación',
    },
  };

  const respuesta: PacienteResponse = {
    pacienteId: 20,
    expedienteId: 30,
    episodioId: 42,
    fechaHoraIngreso: '2026-10-10T08:30:00',
    responsableId: 40,
    referenciaId: 50,
    pacienteExistente: true,
  };

  const pacienteEgresado: PacienteResumido = {
    pacienteId: 20,
    codigoExpediente: 'EXP-020',
    episodioId: null,
    fechaHoraIngreso: null,
    nombreCompleto: 'Ana María López Ruiz',
    cui: '1234567890123',
    sexo: 'FEMENINO',
    telefono: '12345678',
    tipoTratamiento: 'HOSPITALIZACION',
    estado: false,
  };

  const pacienteConEpisodioActivo: PacienteResumido = {
    ...pacienteEgresado,
    pacienteId: 21,
    codigoExpediente: 'EXP-021',
    episodioId: 43,
    estado: true,
  };

  const pacienteService = {
    postPaciente: vi.fn(() => of(respuesta)),
    actualizarPaciente: vi.fn(() => of(respuesta)),
    buscarPacientes: vi.fn(() => of([pacienteEgresado, pacienteConEpisodioActivo])),
    obtenerPaciente: vi.fn(() => of(detalle)),
  };

  const usuarioService = {
    getMedicos: vi.fn(() =>
      of([{ id: 5, nombreCompleto: 'Dr. Juan Pérez', especialidad: 'Medicina general' }]),
    ),
  };

  const servicioCama = {
    listarCamas: vi.fn(() => of([cama])),
    buscarCamas: vi.fn(() => of([cama])),
  };

  const servicioCatalogo = {
    listar: vi.fn(() => of([])),
  };

  const modalService = { open: vi.fn(), close: vi.fn() };

  const modalPopUps = {
    confirmarToast: vi.fn(async () => true),
    exito: vi.fn(async () => {}),
    formIncompleto: vi.fn(),
    advertencia: vi.fn(),
    errorDesdeBackend: vi.fn(),
  };

  const archivoService = {
    aceptados: '.pdf,.jpg,.jpeg,.png',
    procesarArchivo: vi.fn(() => ({ seleccionado: null, mensaje: null })),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    pacienteService.postPaciente.mockReturnValue(of(respuesta));
    pacienteService.actualizarPaciente.mockReturnValue(of(respuesta));
    pacienteService.buscarPacientes.mockReturnValue(of([pacienteEgresado, pacienteConEpisodioActivo]));
    pacienteService.obtenerPaciente.mockReturnValue(of(detalle));
    usuarioService.getMedicos.mockReturnValue(
      of([{ id: 5, nombreCompleto: 'Dr. Juan Pérez', especialidad: 'Medicina general' }]),
    );
    servicioCama.listarCamas.mockReturnValue(of([cama]));
    servicioCama.buscarCamas.mockReturnValue(of([cama]));
    servicioCatalogo.listar.mockReturnValue(of([]));
    modalPopUps.confirmarToast.mockResolvedValue(true);
    modalPopUps.exito.mockResolvedValue(undefined);

    await TestBed.configureTestingModule({
      imports: [ModalAgregarPaciente],
      providers: [
        { provide: PacienteService, useValue: pacienteService },
        { provide: UsuarioService, useValue: usuarioService },
        { provide: ServicioCama, useValue: servicioCama },
        { provide: CatalogoService, useValue: servicioCatalogo },
        { provide: ModalService, useValue: modalService },
        { provide: ModalPopUps, useValue: modalPopUps },
        { provide: ArchivoService, useValue: archivoService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ModalAgregarPaciente);
    component = fixture.componentInstance;
  });

  const crearEnEdicion = async (datos: PacienteDetalle): Promise<void> => {
    fixture.componentRef.setInput('isEditing', true);
    fixture.componentRef.setInput('pacienteId', datos.pacienteId);
    fixture.componentRef.setInput('datosEdicion', datos);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  it('precarga todos los datos del paciente para editar', async () => {
    await crearEnEdicion(detalle);

    expect(component.pacienteForm.persona.nombres).toBe('Ana María');
    expect(component.pacienteForm.persona.apellidos).toBe('López Ruiz');
    expect(component.pacienteForm.estadoCivil).toBe('CASADO');
    expect(component.pacienteForm.direccion).toBe('Casa');
    expect(component.tipoAtencion).toBe('hospitalizacion');
    expect(component.descripcionAtencion).toBe('Ingreso');
    expect(component.medicoSeleccionado?.id).toBe(5);
    expect(component.camaSeleccionada?.idCama).toBe(70);
    expect(component.responsableForm.persona.nombres).toBe('Rosa');
    expect(component.responsableForm.parentescoId).toBe(7);
    expect(component.institucionSeleccionada?.id).toBe(8);
    expect(component.motivoReferencia).toBe('Evaluación');
    expect(component.pasos.length).toBe(4);
  });

  it('guarda la edición con confirmación y envía la cama seleccionada', async () => {
    await crearEnEdicion(detalle);

    await component.guardarPaciente();

    expect(modalPopUps.confirmarToast).toHaveBeenCalled();
    expect(pacienteService.actualizarPaciente).toHaveBeenCalledWith(
      20,
      expect.objectContaining({
        request: expect.objectContaining({
          paciente: expect.objectContaining({ camaId: 70 }),
          episodio: expect.objectContaining({ tipoAtencion: 'HOSPITALIZACION' }),
        }),
        archivoReferencia: null,
      }),
    );
  });

  it('permite editar solo los datos personales cuando no hay episodio activo', async () => {
    const sinEpisodio: PacienteDetalle = {
      ...detalle,
      episodioId: null,
      tipoAtencion: null,
      descripcion: null,
      fechaHoraIngreso: null,
      medicoId: null,
      medicoNombre: null,
      camaId: null,
      camaCodigo: null,
      responsable: null,
      referencia: null,
    };
    await crearEnEdicion(sinEpisodio);

    expect(component.pasos.length).toBe(1);
    expect(component.soloDatosPersonales).toBe(true);

    await component.guardarPaciente();

    expect(pacienteService.actualizarPaciente).toHaveBeenCalledWith(
      20,
      expect.objectContaining({
        request: expect.objectContaining({ episodio: null }),
      }),
    );
  });

  it('busca pacientes y oculta el formulario del paso 1', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    component.busquedaPaciente = 'ana';
    component.buscarPaciente();
    fixture.detectChanges();

    expect(pacienteService.buscarPacientes).toHaveBeenCalledWith('ana');
    expect(component.modoBusqueda).toBe(true);
    expect(component.resultadosBusqueda.length).toBe(2);
    expect(fixture.nativeElement.querySelector('.formularioPacientePaso1')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.resultado-paciente').length).toBe(2);
  });

  it('muestra paciente no encontrado cuando la búsqueda está vacía', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    component.busquedaPaciente = '   ';
    component.buscarPaciente();
    fixture.detectChanges();

    expect(component.modoBusqueda).toBe(true);
    expect(component.resultadosBusqueda.length).toBe(0);
    expect(pacienteService.buscarPacientes).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.resultados-paciente')?.textContent).toContain(
      'Paciente no encontrado',
    );
  });

  it('muestra los resultados aunque el paciente tenga un episodio activo', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    component.busquedaPaciente = 'ana';
    component.buscarPaciente();
    fixture.detectChanges();

    const resultados = fixture.nativeElement.querySelectorAll(
      '.resultado-paciente',
    ) as NodeListOf<HTMLButtonElement>;

    expect(resultados[0].disabled).toBe(false);
    expect(resultados[1].disabled).toBe(false);
    expect(resultados[1].textContent).toContain('Episodio activo');
  });

  it('al seleccionar un egresado precarga los pasos 1 y 3 y deja vacíos los pasos 2 y 4', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    component.busquedaPaciente = 'ana';
    component.buscarPaciente();
    component.seleccionarPacienteBusqueda(pacienteEgresado);
    fixture.detectChanges();

    expect(pacienteService.obtenerPaciente).toHaveBeenCalledWith(20);
    expect(component.modoBusqueda).toBe(false);
    expect(component.cargandoPrecarga).toBe(false);

    expect(component.pacienteForm.persona.nombres).toBe('Ana María');
    expect(component.pacienteForm.persona.apellidos).toBe('López Ruiz');
    expect(component.pacienteForm.estadoCivil).toBe('CASADO');
    expect(component.pacienteForm.direccion).toBe('Casa');
    expect(component.responsableForm.persona.nombres).toBe('Rosa');
    expect(component.responsableForm.parentescoId).toBe(7);
    expect(component.responsableForm.direccion).toBe('Casa');

    expect(component.tipoAtencion).toBe('emergencia');
    expect(component.descripcionAtencion).toBe('');
    expect(component.medicoSeleccionado).toBeNull();
    expect(component.camaSeleccionada).toBeNull();
    expect(component.institucionSeleccionada).toBeNull();
    expect(component.motivoReferencia).toBe('');
    expect(component.archivoReferencia).toBeNull();
    expect(
      (component as unknown as { pacienteIdSeleccionado: number | null }).pacienteIdSeleccionado,
    ).toBe(20);
  });

  it('envía el paciente reutilizado al crear el episodio', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    component.busquedaPaciente = 'ana';
    component.buscarPaciente();
    component.seleccionarPacienteBusqueda(pacienteEgresado);

    component.tipoAtencion = 'emergencia';
    component.descripcionAtencion = 'Control';
    component.medicoSeleccionado = {
      id: 5,
      nombreCompleto: 'Dr. Juan Pérez',
      especialidad: 'Medicina general',
    };

    await component.guardarPaciente();

    expect(pacienteService.postPaciente).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          paciente: expect.objectContaining({ pacienteId: 20 }),
        }),
      }),
    );
  });

  it('permite seleccionar un paciente con episodio activo; la regla se valida al guardar', async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    pacienteService.obtenerPaciente.mockReturnValueOnce(of({ ...detalle, pacienteId: 21 }));

    component.seleccionarPacienteBusqueda(pacienteConEpisodioActivo);
    fixture.detectChanges();

    expect(pacienteService.obtenerPaciente).toHaveBeenCalledWith(21);
    expect(component.modoBusqueda).toBe(false);
    expect(component.cargandoPrecarga).toBe(false);
  });
});
