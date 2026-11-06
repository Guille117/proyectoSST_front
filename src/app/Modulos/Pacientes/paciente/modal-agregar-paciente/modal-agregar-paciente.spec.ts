import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { MatSelect } from '@angular/material/select';
import { Observable, of, throwError } from 'rxjs';
import { ModalService } from '../../../../modal-principal/modal-service';
import { ArchivoService } from '../../../../shared/archivos/archivoService';
import { ModalPopUps } from '../../../../shared/popUps/modal-popUpsService';
import { OpcionOtroComponent } from '../../../../shared/opcion-otro/opcion-otro';
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
    alergias: [{ id: 2, nombre: 'Penicilina' }],
    enfermedades: [{ id: 1, nombre: 'Diabetes' }],
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
    ultimoEpisodioId: 42,
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
    ultimoEpisodioId: 43,
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
    listar: vi.fn<(recurso: string, activos?: boolean) => Observable<unknown[]>>(() => of([])),
    crear: vi.fn<(recurso: string, datos: { nombre: string }) => Observable<{ id: number; nombre: string }>>(
      () => of({ id: 9, nombre: 'Nuevo' }),
    ),
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
    servicioCatalogo.crear.mockReturnValue(of({ id: 9, nombre: 'Nuevo' }));
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

  it('carga las enfermedades y alergias desde el backend para el paso 2', async () => {
    servicioCatalogo.listar.mockImplementation((recurso: string) => {
      if (recurso === 'enfermedades') return of([{ id: 1, nombre: 'Diabetes' }]);
      if (recurso === 'alergias') return of([{ id: 2, nombre: 'Penicilina' }]);
      return of([]);
    });

    fixture.detectChanges();
    await fixture.whenStable();

    expect(servicioCatalogo.listar).toHaveBeenCalledWith('enfermedades');
    expect(servicioCatalogo.listar).toHaveBeenCalledWith('alergias');
    expect(component.enfermedades).toEqual([{ id: 1, nombre: 'Diabetes' }]);
    expect(component.alergias).toEqual([{ id: 2, nombre: 'Penicilina' }]);

    component.contador = 1;
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('mat-select').length).toBe(2);
  });

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
    expect(component.pasos.length).toBe(5);
  });

  it('solo detecta cambios cuando el formulario se modifica', async () => {
    await crearEnEdicion(detalle);

    expect(component.hayCambios).toBe(false);

    component.pacienteForm.direccion = 'Otra dirección';

    expect(component.hayCambios).toBe(true);
  });

  it('precarga y envía las alergias y enfermedades seleccionadas por ID', async () => {
    await crearEnEdicion(detalle);

    expect(component.alergiasSeleccionadas).toEqual([2]);
    expect(component.enfermedadesSeleccionadas).toEqual([1]);

    await component.guardarPaciente();

    expect(pacienteService.actualizarPaciente).toHaveBeenCalledWith(
      20,
      expect.objectContaining({
        request: expect.objectContaining({
          paciente: expect.objectContaining({
            alergiaIds: [2],
            enfermedadIds: [1],
          }),
        }),
      }),
    );
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

  function completarPacienteValido(): void {
    component.pacienteForm.persona = {
      cui: '1234567890123',
      nombres: 'Ana',
      apellidos: 'Lopez',
      sexo: 'FEMENINO',
      fechaNacimiento: '1990-01-01',
      telefono: '12345678',
      email: 'ana@correo.com',
    };
    component.tipoAtencion = 'emergencia';
    component.descripcionAtencion = 'Control';
    component.medicoSeleccionado = {
      id: 5,
      nombreCompleto: 'Dr. Juan Pérez',
      especialidad: 'Medicina general',
    };
  }

  function abrirOtroMatSelect(name: string, valor: unknown): OpcionOtroComponent {
    const select = fixture.debugElement.query(By.css(`mat-select[name="${name}"]`))
      .componentInstance as MatSelect;
    select._onChange(valor);
    fixture.detectChanges();
    const componentes = fixture.debugElement.queryAll(By.css('app-opcion-otro'));
    return componentes[componentes.length - 1].componentInstance as OpcionOtroComponent;
  }

  function abrirOtroSelectNativo(id: string): OpcionOtroComponent {
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

  it('crea la enfermedad pendiente antes de guardar y usa el nuevo id', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    component.contador = 1;
    component.enfermedades = [{ id: 1, nombre: 'Diabetes' }];
    component.enfermedadesSeleccionadas = [1];
    fixture.detectChanges();

    const otro = abrirOtroMatSelect('enfermedadesPaciente', [1, -1]);
    otro.nombre = 'Asma';
    fixture.detectChanges();

    completarPacienteValido();
    await component.guardarPaciente();

    expect(servicioCatalogo.crear).toHaveBeenCalledWith('enfermedades', { nombre: 'Asma' });
    expect(pacienteService.postPaciente).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          paciente: expect.objectContaining({ enfermedadIds: [1, 9] }),
        }),
      }),
    );
    expect(servicioCatalogo.crear.mock.invocationCallOrder[0])
      .toBeLessThan(pacienteService.postPaciente.mock.invocationCallOrder[0]);
  });

  it('crea la enfermedad y la alergia pendientes en orden antes de guardar', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    servicioCatalogo.crear.mockImplementation((recurso: string) =>
      of({ id: recurso === 'enfermedades' ? 9 : 10, nombre: recurso }),
    );

    component.contador = 1;
    component.enfermedades = [{ id: 1, nombre: 'Diabetes' }];
    component.alergias = [{ id: 2, nombre: 'Penicilina' }];
    component.enfermedadesSeleccionadas = [1];
    component.alergiasSeleccionadas = [2];
    fixture.detectChanges();

    const enfermedad = abrirOtroMatSelect('enfermedadesPaciente', [1, -1]);
    enfermedad.nombre = 'Asma';
    const alergia = abrirOtroMatSelect('alergiasPaciente', [2, -1]);
    alergia.nombre = 'Polen';
    fixture.detectChanges();

    completarPacienteValido();
    await component.guardarPaciente();

    expect(servicioCatalogo.crear.mock.calls).toEqual([
      ['enfermedades', { nombre: 'Asma' }],
      ['alergias', { nombre: 'Polen' }],
    ]);
    expect(pacienteService.postPaciente).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          paciente: expect.objectContaining({
            enfermedadIds: [1, 9],
            alergiaIds: [2, 10],
          }),
        }),
      }),
    );
  });

  it('crea el parentesco pendiente antes de guardar y usa el nuevo id', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    component.contador = 3;
    fixture.detectChanges();

    const otro = abrirOtroSelectNativo('parentescoResponsable');
    otro.nombre = 'Tío';
    fixture.detectChanges();

    component.responsableForm.persona = {
      cui: '9876543210123',
      nombres: 'Rosa',
      apellidos: 'Lopez',
      sexo: 'FEMENINO',
      fechaNacimiento: '1970-01-01',
      telefono: '87654321',
    };
    servicioCatalogo.crear.mockReturnValueOnce(of({ id: 12, nombre: 'Tío' }));
    completarPacienteValido();

    await component.guardarPaciente();

    expect(servicioCatalogo.crear).toHaveBeenCalledWith('parentescos', { nombre: 'Tío' });
    expect(pacienteService.postPaciente).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          episodio: expect.objectContaining({
            responsable: expect.objectContaining({ parentescoId: 12 }),
          }),
        }),
      }),
    );
  });

  it('crea la institución pendiente antes de guardar y usa el nuevo id', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    component.contador = 4;
    fixture.detectChanges();

    const otro = abrirOtroMatSelect('institucionSeleccionada', -1);
    otro.nombre = 'Clínica';
    fixture.detectChanges();

    servicioCatalogo.crear.mockReturnValueOnce(
      of({ id: 12, nombre: 'Clínica', telefono: '', direccion: '' }),
    );
    completarPacienteValido();

    await component.guardarPaciente();

    expect(servicioCatalogo.crear).toHaveBeenCalledWith('instituciones', { nombre: 'Clínica' });
    expect(pacienteService.postPaciente).toHaveBeenCalledWith(
      expect.objectContaining({
        request: expect.objectContaining({
          episodio: expect.objectContaining({
            referencia: expect.objectContaining({ institucionId: 12 }),
          }),
        }),
      }),
    );
  });

  it('no guarda el paciente si falla la creación de una selección pendiente', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    component.contador = 1;
    fixture.detectChanges();
    const otro = abrirOtroMatSelect('enfermedadesPaciente', [-1]);
    otro.nombre = 'Asma';
    fixture.detectChanges();

    servicioCatalogo.crear.mockReturnValueOnce(throwError(() => new Error('fallo')));
    completarPacienteValido();

    await component.guardarPaciente();

    expect(pacienteService.postPaciente).not.toHaveBeenCalled();
    expect(modalPopUps.errorDesdeBackend).toHaveBeenCalled();
  });

  it('no guarda si el parentesco pendiente está vacío y avisa al usuario', async () => {
    fixture.detectChanges();
    await fixture.whenStable();

    component.contador = 3;
    fixture.detectChanges();
    abrirOtroSelectNativo('parentescoResponsable');
    completarPacienteValido();

    await component.guardarPaciente();

    expect(pacienteService.postPaciente).not.toHaveBeenCalled();
    expect(modalPopUps.formIncompleto).toHaveBeenCalledWith(
      'Completa el valor de «Parentesco» o cancélalo antes de guardar.',
    );
  });
});
