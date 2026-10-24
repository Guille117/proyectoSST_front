import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { ModalAgregarPaciente } from './modal-agregar-paciente/modal-agregar-paciente';
import { Paciente } from './paciente';
import { ConsumoEpisodioService } from './data/consumo-service';
import { ConsumoEpisodio } from './data/consumoInterfaz';
import { DocumentoEpisodioService } from './data/documento-episodio-service';
import { DocumentoTratamientoPdfService } from './data/documento-tratamiento-pdf-service';
import { DocumentoEpisodio } from './data/documentoInterfaz';
import { PacienteDetalle, PacienteResumido } from './data/pacienteInterfaz';
import { PacienteService } from './data/paciente-service';
import { UsuarioService } from '../../Usuarios/usu/data/usuario-service';
import { AuthService } from '../../Auth/data/auth-service';
import { LoginResponse } from '../../Auth/data/authInterfaz';
import { ModalService } from '../../../modal-principal/modal-service';
import { ArchivoService } from '../../../shared/archivos/archivoService';
import { VisorArchivos } from '../../../shared/visor-archivos/visor-archivos';
import { ArchivoSeleccionado, ResultadoArchivo } from '../../../shared/archivos/archivoInterfaz';
import { PopUps } from '../../../shared/popUps/popUpsService';

describe('Paciente', () => {
  let component: Paciente;
  let fixture: ComponentFixture<Paciente>;

  const paciente: PacienteResumido = {
    pacienteId: 1,
    codigoExpediente: 'EXP-001',
    episodioId: 101,
    ultimoEpisodioId: 101,
    fechaHoraIngreso: '2026-10-10T08:30:00',
    nombreCompleto: 'Ana López',
    cui: '1234567890123',
    sexo: 'FEMENINO',
    telefono: '12345678',
    tipoTratamiento: 'HOSPITALIZACION',
    estado: true,
  };

  const pacienteEgresado: PacienteResumido = {
    ...paciente,
    pacienteId: 2,
    codigoExpediente: 'EXP-002',
    episodioId: null,
    ultimoEpisodioId: 202,
    nombreCompleto: 'Luis Ramírez',
  };

  const detalle: PacienteDetalle = {
    pacienteId: 1,
    codigoExpediente: 'EXP-001',
    nombreCompleto: 'Ana López',
    nombres: 'Ana',
    apellidos: 'López',
    cui: '1234567890123',
    fechaNacimiento: '1990-01-01',
    edad: 36,
    sexo: 'FEMENINO',
    telefono: '12345678',
    email: null,
    estadoCivil: 'SOLTERO',
    direccion: 'Casa',
    ocupacion: 'Docente',
    estado: true,
    episodioId: 101,
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

  const medicamento = {
    clave: 'MEDICAMENTO-0',
    nombre: 'Paracetamol',
    cantidad: '500 mg',
    frecuencia: 'Cada 8 horas',
    duracion: '3 días',
    observaciones: '—',
  };

  const cuidado = {
    clave: 'CUIDADO-0',
    nombre: 'Curaciones',
    cantidad: '—',
    frecuencia: 'Cada 24 horas',
    duracion: '5 días',
    observaciones: '—',
  };

  const archivo = new File(['contenido'], 'documento.pdf', { type: 'application/pdf' });

  const documento: DocumentoEpisodio = {
    id: 10,
    tipo: 'AUTORIZACION_PROCEDIMIENTO',
    nombreOriginal: 'autorizacion.pdf',
    urlArchivo: 'uploads/documentos/autorizacion.pdf',
    fechaSubida: '2026-10-10T09:00:00',
    usuarioId: 5,
    usuarioNombre: 'Ana López',
    estado: true,
  };

  const archivoSeleccionado: ArchivoSeleccionado = {
    archivo,
    nombre: archivo.name,
    peso: '1 KB',
    extension: 'pdf',
    esImagen: false,
    icono: 'bi-file-earmark-pdf',
  };

  const servicioPaciente = {
    listarPacientes: vi.fn(() => of([paciente])),
    obtenerPaciente: vi.fn(() => of(detalle)),
  };

  const servicioDocumento = {
    listarDocumentos: vi.fn(() => of([documento])),
    subirDocumento: vi.fn(() => of([documento])),
  };

  const consumo: ConsumoEpisodio = {
    episodioId: 101,
    items: [
      {
        tipo: 'Medicamento',
        nombre: 'Paracetamol',
        detalle: null,
        cantidad: 8,
        unidad: 'unidad(es)',
        precioUnitario: 1.5,
        subtotal: 12,
      },
      {
        tipo: 'Cama',
        nombre: 'Cama A-106',
        detalle: 'Habitación 101 · Hospitalización',
        cantidad: 2,
        unidad: 'días',
        precioUnitario: 250,
        subtotal: 500,
      },
    ],
    total: 512,
  };

  const servicioConsumo = { obtenerConsumo: vi.fn(() => of(consumo)) };

  const servicioPdf = { generar: vi.fn(() => Promise.resolve()) };

  const usuarioService = {
    getMedicos: vi.fn(() =>
      of([{ id: 5, nombreCompleto: 'Dr. Juan Pérez', especialidad: 'Medicina general' }]),
    ),
  };

  const modalService = { open: vi.fn(), close: vi.fn() };

  const popUps = {
    errorDesdeBackend: vi.fn(),
    error: vi.fn(),
    exito: vi.fn(),
    advertencia: vi.fn(),
  };

  const archivoService = {
    aceptados: '.pdf,.jpg,.jpeg,.png',
    procesar: vi.fn<() => ResultadoArchivo>(() => ({
      seleccionado: archivoSeleccionado,
      mensaje: null,
    })),
  };

  const authService = {
    currentUser: signal<LoginResponse | null>({ token: 'token', id: 5, nombreCompleto: 'Ana López' }),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    servicioPaciente.listarPacientes.mockReturnValue(of([paciente]));
    servicioPaciente.obtenerPaciente.mockReturnValue(of(detalle));
    servicioDocumento.listarDocumentos.mockReturnValue(of([documento]));
    servicioDocumento.subirDocumento.mockReturnValue(of([documento]));
    usuarioService.getMedicos.mockReturnValue(
      of([{ id: 5, nombreCompleto: 'Dr. Juan Pérez', especialidad: 'Medicina general' }]),
    );
    archivoService.procesar.mockReturnValue({ seleccionado: archivoSeleccionado, mensaje: null });

    await TestBed.configureTestingModule({
      imports: [Paciente],
      providers: [
        { provide: PacienteService, useValue: servicioPaciente },
        { provide: DocumentoEpisodioService, useValue: servicioDocumento },
        { provide: ConsumoEpisodioService, useValue: servicioConsumo },
        { provide: DocumentoTratamientoPdfService, useValue: servicioPdf },
        { provide: UsuarioService, useValue: usuarioService },
        { provide: ModalService, useValue: modalService },
        { provide: PopUps, useValue: popUps },
        { provide: ArchivoService, useValue: archivoService },
        { provide: AuthService, useValue: authService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Paciente);
    component = fixture.componentInstance;
  });

  const render = async (): Promise<void> => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  };

  it('selecciona el primer paciente y carga su detalle y documentos', async () => {
    await render();

    expect(component.pacienteSeleccionado?.pacienteId).toBe(1);
    expect(component.detalle).toEqual(detalle);
    expect(component.documentos).toEqual([documento]);
    expect(servicioPaciente.obtenerPaciente).toHaveBeenCalledWith(1);
    expect(servicioDocumento.listarDocumentos).toHaveBeenCalledWith(101);
  });

  it('separa a los pacientes activos de los egresados en las pestañas', async () => {
    servicioPaciente.listarPacientes.mockReturnValue(of([paciente, pacienteEgresado]));

    await render();

    const filasActivas = fixture.nativeElement.querySelectorAll(
      '.tabla-pacientes tbody tr',
    ) as NodeListOf<HTMLElement>;
    expect(filasActivas.length).toBe(1);
    expect(filasActivas[0].textContent).toContain('EXP-001');

    component.cambiarFiltroPacientes(false);
    fixture.detectChanges();

    const filasEgresados = fixture.nativeElement.querySelectorAll(
      '.tabla-pacientes tbody tr',
    ) as NodeListOf<HTMLElement>;
    expect(filasEgresados.length).toBe(1);
    expect(filasEgresados[0].textContent).toContain('EXP-002');
  });

  it('lista las alergias y enfermedades diagnosticadas del paciente', async () => {
    await render();

    const alergias = fixture.nativeElement.querySelector('.bloque-alergias') as HTMLElement;
    const enfermedades = fixture.nativeElement.querySelector(
      '.bloque-enfermedades',
    ) as HTMLElement;

    expect(alergias.textContent).toContain('Penicilina');
    expect(enfermedades.textContent).toContain('Diabetes');
  });

  it('muestra el botón ver solo en el tipo que tiene archivos', async () => {
    await render();

    const botonesVer = fixture.nativeElement.querySelectorAll(
      '.documento-acciones button[title="Ver"]',
    );

    expect(botonesVer.length).toBe(1);
  });

  it('abre el visor reutilizable con los documentos del tipo', async () => {
    await render();

    const botonVer = fixture.nativeElement.querySelector(
      '.documento-acciones button[title="Ver"]',
    ) as HTMLButtonElement;
    botonVer.click();

    expect(modalService.open).toHaveBeenCalledWith(
      VisorArchivos,
      expect.objectContaining({
        modalClass: 'modal-visor-documentos',
        archivos: [{ id: 10, nombreOriginal: 'autorizacion.pdf' }],
        cargarArchivo: expect.any(Function),
        onEliminar: expect.any(Function),
        onCambio: expect.any(Function),
      }),
    );
  });

  it('abre el modal de edición con los datos del detalle', async () => {
    await render();

    const botonEditar = fixture.nativeElement.querySelector('.acciones .btn') as HTMLButtonElement;
    botonEditar.click();

    expect(modalService.open).toHaveBeenCalledWith(
      ModalAgregarPaciente,
      expect.objectContaining({
        isEditing: true,
        pacienteId: 1,
        datosEdicion: detalle,
      }),
    );
  });

  it('sube el documento validado con el usuario de la sesión', async () => {
    await render();

    const input = { value: '', click: vi.fn() } as unknown as HTMLInputElement;
    const evento = { target: { files: [archivo], value: '' } } as unknown as Event;

    component.seleccionarArchivo('REFERENCIA', input);
    component.subirDocumento(evento);

    expect(servicioDocumento.subirDocumento).toHaveBeenCalledWith(
      101,
      'REFERENCIA',
      5,
      archivo,
    );
  });

  it('no sube el documento cuando la validación del archivo falla', async () => {
    archivoService.procesar.mockReturnValueOnce({
      seleccionado: null,
      mensaje: 'Formato no permitido.',
    });
    await render();

    const input = { value: '', click: vi.fn() } as unknown as HTMLInputElement;
    const evento = { target: { files: [archivo], value: '' } } as unknown as Event;

    component.seleccionarArchivo('REFERENCIA', input);
    component.subirDocumento(evento);

    expect(popUps.advertencia).toHaveBeenCalledWith('Formato no permitido.');
    expect(servicioDocumento.subirDocumento).not.toHaveBeenCalled();
  });

  it('muestra los títulos de tratamiento sin la cantidad', async () => {
    await render();
    component.documentacionAbierta = true;
    component.medicamentosAlta = [medicamento];
    component.cuidadosAlta = [cuidado];
    fixture.componentRef.changeDetectorRef.detectChanges();

    const subtitulos = Array.from(
      fixture.nativeElement.querySelectorAll('.doc-subtitulo') as NodeListOf<HTMLElement>,
    ).map((elemento) => elemento.textContent?.trim());

    expect(subtitulos).toEqual(['Medicamentos', 'Cuidados']);
  });

  it('deshabilita la generación cuando no hay tratamientos', async () => {
    await render();
    component.documentacionAbierta = true;
    fixture.componentRef.changeDetectorRef.detectChanges();

    const boton = fixture.nativeElement.querySelector(
      '.doc-acciones-documento button',
    ) as HTMLButtonElement;

    expect(boton.disabled).toBe(true);
  });

  it('carga y muestra el detalle de consumo con su total', async () => {
    await render();
    component.documentacionAbierta = true;
    fixture.componentRef.changeDetectorRef.detectChanges();

    component.seleccionarSeccionDocumentacion('consumo');
    await fixture.whenStable();
    fixture.componentRef.changeDetectorRef.detectChanges();

    expect(servicioConsumo.obtenerConsumo).toHaveBeenCalledWith(101);

    const filas = fixture.nativeElement.querySelectorAll('.doc-tabla tbody tr');
    expect(filas.length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('Q 512.00');
  });

  it('genera el documento con los datos del paciente, los tratamientos y el médico', async () => {
    await render();
    component.documentacionAbierta = true;
    component.medicamentosAlta = [medicamento];
    component.cuidadosAlta = [cuidado];
    fixture.componentRef.changeDetectorRef.detectChanges();

    const boton = fixture.nativeElement.querySelector(
      '.doc-acciones-documento button',
    ) as HTMLButtonElement;
    boton.click();
    await fixture.whenStable();

    expect(usuarioService.getMedicos).toHaveBeenCalled();
    expect(servicioPdf.generar).toHaveBeenCalledWith({
      paciente: {
        nombre: 'Ana López',
        cui: '1234567890123',
        sexo: 'Femenino',
        edad: '36 años',
        direccion: 'Casa',
      },
      medicamentos: [medicamento],
      cuidados: [cuidado],
      medico: {
        nombre: 'Dr. Juan Pérez',
        especialidad: 'Medicina general',
      },
    });
  });
});
