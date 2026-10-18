import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of } from 'rxjs';
import { ModalAgregarPaciente } from './modal-agregar-paciente/modal-agregar-paciente';
import { Paciente } from './paciente';
import { DocumentoEpisodioService } from './data/documento-episodio-service';
import { DocumentoEpisodio } from './data/documentoInterfaz';
import { PacienteDetalle, PacienteResumido } from './data/pacienteInterfaz';
import { PacienteService } from './data/paciente-service';
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
    fechaHoraIngreso: '2026-10-10T08:30:00',
    nombreCompleto: 'Ana López',
    cui: '1234567890123',
    sexo: 'FEMENINO',
    telefono: '12345678',
    tipoTratamiento: 'HOSPITALIZACION',
    estado: true,
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
    archivoService.procesar.mockReturnValue({ seleccionado: archivoSeleccionado, mensaje: null });

    await TestBed.configureTestingModule({
      imports: [Paciente],
      providers: [
        { provide: PacienteService, useValue: servicioPaciente },
        { provide: DocumentoEpisodioService, useValue: servicioDocumento },
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
});
